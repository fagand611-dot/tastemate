import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoTag, guessKind, readSignals } from '../server/taxonomy.js';
import { cityFrom, csv, parseImport } from '../server/importers.js';
import { cosine, findPatterns, inWindow, interpret, rankSpots, tasteProfile, toPercent } from '../server/taste-graph.js';

test('autoTag: keywords and music genres become shared tags', () => {
  assert.deepEqual(new Set(autoTag('Candlelit wine bar')), new Set(['moody', 'intimate', 'romantic', 'wine bar']));
  assert.ok(autoTag('Croissants', null).includes('pastry'));
  assert.ok(autoTag('late night jazz').includes('chill'));
  assert.ok(!autoTag('Passenger').includes('pastry'));
  assert.equal(guessKind(['pastry', 'food']), 'food');
  assert.equal(guessKind([], 'song'), 'song');
});

test('importers: Spotify library export, plain lines and the Web API shape', () => {
  const lib = parseImport('spotify', JSON.stringify({ tracks: [{ artist: 'Miles Davis', album: 'Kind of Blue', track: 'So What', uri: 'spotify:track:abc' }] }));
  assert.equal(lib[0].title, 'So What');
  assert.equal(lib[0].creator, 'Miles Davis');
  assert.equal(lib[0].url, 'https://open.spotify.com/track/abc');
  const lines = parseImport('spotify', 'Nick Drake - Pink Moon\n\nBill Evans – Blue in Green');
  assert.deepEqual(lines.map((r) => [r.creator, r.title]), [['Nick Drake', 'Pink Moon'], ['Bill Evans', 'Blue in Green']]);
  const web = parseImport('spotify', JSON.stringify({ items: [{ added_at: '2024-01-01', track: { name: 'Teardrop', artists: [{ name: 'Massive Attack' }], uri: 'spotify:track:x' } }] }));
  assert.equal(web[0].creator, 'Massive Attack');
});

test('importers: Instagram collections carry their names onto posts', () => {
  const json = {
    saved_saved_collections: [
      { title: 'Collection', string_map_data: { Name: { value: 'Pastry' } } },
      { title: 'laminationlab', string_map_data: { 'Added Time': { href: 'https://www.instagram.com/p/1', timestamp: 1700000000 } } },
      { title: 'Collection', string_map_data: { Name: { value: 'Coats' } } },
      { title: 'thecoat', string_map_data: { 'Added Time': { href: 'https://www.instagram.com/p/2', timestamp: 1700000000 } } },
    ],
  };
  const rows = parseImport('instagram', JSON.stringify(json));
  assert.deepEqual(rows.map((r) => [r.title, r.collection]), [['@laminationlab', 'Pastry'], ['@thecoat', 'Coats']]);
  assert.equal(rows[0].saved_at.slice(0, 4), '2023');
});

test('importers: Google Maps GeoJSON (old and new shapes) and CSV lists', () => {
  const geo = {
    type: 'FeatureCollection',
    features: [
      { properties: { location: { name: 'Jazz café', address: '12 Soi Ari, Bangkok 10400' }, google_maps_url: 'https://maps.google.com/?cid=1' } },
      { properties: { Title: 'Old pub', Location: { Address: 'Dublin 8, Ireland' } } },
    ],
  };
  const rows = parseImport('google_maps', JSON.stringify(geo), { cities: ['Bangkok', 'Dublin'] });
  assert.deepEqual(rows.map((r) => [r.title, r.city]), [['Jazz café', 'Bangkok'], ['Old pub', 'Dublin']]);
  const list = parseImport('google_maps', 'Title,Note,URL,Comment\n"Bakery, the good one",croissants,https://maps.google.com/?cid=2,\n');
  assert.equal(list[0].title, 'Bakery, the good one');
  assert.equal(list[0].note, 'croissants');
  assert.equal(cityFrom('Londonderry', ['London']), null);
  assert.deepEqual(csv('a,b\n"x ""y""",z'), [{ a: 'x "y"', b: 'z' }]);
});

test('importers: empty, unknown and malformed input are 400s', () => {
  assert.throws(() => parseImport('spotify', '  '), (e) => e.status === 400);
  assert.throws(() => parseImport('myspace', 'x'), (e) => e.status === 400);
  assert.throws(() => parseImport('spotify', '{broken'), (e) => e.status === 400);
  assert.throws(() => parseImport('instagram', '{"nothing": []}'), (e) => e.status === 400);
});

const save = (id, kind, source, tags, extra = {}) => ({ id, kind, source, title: `s${id}`, tags, ...extra });

test('readSignals: obvious, translated, handles and known artists', () => {
  const tier = (x, tag) => readSignals(x).find((s) => s.tag === tag)?.tier;
  assert.equal(tier({ title: 'late night jazz' }, 'jazz'), 'obvious');
  assert.equal(tier({ title: 'Vinyl listening bar' }, 'jazz'), 'translated');
  assert.equal(tier({ title: 'So What', creator: 'Miles Davis' }, 'jazz'), 'translated');
  assert.equal(tier({ title: 'In a Sentimental Mood', creator: 'Duke Ellington & John Coltrane' }, 'jazz'), 'translated');
  assert.equal(tier({ title: '@croissantdiaries' }, 'pastry'), 'translated');
  assert.equal(tier({ title: '@bluenote.records' }, 'jazz'), 'translated');
  assert.equal(tier({ title: 'Natural wine pop-up' }, 'pop'), undefined, 'pop-up is not pop music');
  assert.equal(tier({ title: 'Pink Moon', collection: 'Pink Moon · folk' }, 'folk'), 'obvious');
});

test('interpret: could-be signals from associations and your own habits', () => {
  const saves = [
    save(1, 'place', 'google_maps', ['speakeasy', 'cocktails']),
    save(2, 'song', 'spotify', ['jazz', 'chill']),
    save(3, 'song', 'spotify', ['jazz', 'chill']),
    save(4, 'song', 'spotify', ['jazz', 'chill']),
    save(5, 'song', 'spotify', ['chill']),
  ];
  const out = interpret(saves);
  const speakeasy = out[0].signals.find((x) => x.tag === 'jazz');
  assert.equal(speakeasy.tier, 'possible');
  assert.match(speakeasy.via, /speakeasy often goes with jazz/);
  // 3 of 4 chill saves are jazz, so the fourth could be.
  const learned = out[4].signals.find((x) => x.tag === 'jazz');
  assert.equal(learned.tier, 'possible');
  assert.match(learned.via, /most of your chill saves are also jazz/);
  assert.ok(learned.conf < 0.35);
  assert.ok(!out[1].signals.some((x) => x.tag === 'jazz' && x.tier === 'possible'), 'no could-be for what a save already says');
});

test('findPatterns: clusters cross kinds or apps and show evidence in tiers', () => {
  const saves = [
    save(1, 'song', 'spotify', ['jazz', 'chill'], { title: 'So What', creator: 'Miles Davis' }),
    save(2, 'song', 'spotify', ['jazz', 'chill'], { title: 'late night jazz' }),
    save(3, 'place', 'google_maps', ['jazz', 'intimate', 'vinyl'], { title: 'Vinyl listening bar' }),
    save(4, 'place', 'google_maps', ['speakeasy', 'cocktails'], { title: 'Speakeasy' }),
    save(5, 'food', 'instagram', ['pastry']),
    save(6, 'food', 'instagram', ['pastry']),
    save(7, 'food', 'instagram', ['pastry']),
  ];
  const p = findPatterns(saves);
  const jazz = p.find((x) => x.tags[0] === 'jazz');
  assert.ok(jazz);
  assert.deepEqual(jazz.tiers.obvious.map((x) => x.id), [2]);
  assert.deepEqual(jazz.tiers.translated.map((x) => x.id).sort(), [1, 3]);
  assert.deepEqual(jazz.tiers.possible.map((x) => x.id), [4]);
  assert.equal(jazz.count, 3);
  assert.ok(!p.some((x) => x.tags[0] === 'pastry'), 'one kind from one app is not a cluster');
});

test('tasteProfile: firm signals count fully, could-be signals a little', () => {
  const p = tasteProfile([save(1, 'place', 'manual', ['vinyl'])]);
  assert.equal(p.get('vinyl'), 1);
  assert.ok(p.get('jazz') > 0 && p.get('jazz') < 0.3);
  assert.equal(toPercent(cosine(p, p)), 100);
});

test('rankSpots: city, dates, taste, friends and explanations', () => {
  const saves = [save(1, 'song', 'spotify', ['jazz', 'chill']), save(2, 'place', 'google_maps', ['jazz', 'intimate'])];
  const profile = tasteProfile(saves);
  const spots = [
    { id: 1, kind: 'event', title: 'Jazz night', city: 'Dublin', tags: ['jazz', 'intimate'], starts_at: '2026-11-14', popularity: 0.2 },
    { id: 2, kind: 'event', title: 'Jazz next year', city: 'Dublin', tags: ['jazz'], starts_at: '2027-05-01' },
    { id: 3, kind: 'event', title: 'Techno', city: 'Dublin', tags: ['techno'], starts_at: '2026-11-14' },
    { id: 4, kind: 'place', title: 'London jazz bar', city: 'London', tags: ['jazz'] },
    { id: 5, kind: 'product', title: 'Online vinyl', city: null, tags: ['jazz', 'vinyl'] },
    { id: 6, kind: 'place', title: 'Pub', city: 'Dublin', tags: ['pub'] },
    { id: 7, kind: 'place', title: 'New café', city: 'Dublin', tags: ['chill'], opened_at: '2026-11-01' },
  ];
  const r = rankSpots({ profile, saves, spots, city: 'dublin', from: '2026-11-10', to: '2026-11-20', friendSaves: new Map([[6, ['Maya']]]), today: '2026-11-10' });
  const ids = r.map((x) => x.spot.id);
  assert.deepEqual(ids.sort(), [1, 5, 6, 7]);
  const jazz = r.find((x) => x.spot.id === 1);
  const ev = jazz.reasons.find((x) => x.type === 'saves').evidence.find((e) => e.tag === 'jazz');
  assert.deepEqual(ev.sources.map((s) => [s.source, s.n]), [['spotify', 1], ['google_maps', 1]]);
  assert.ok(jazz.reasons.some((x) => x.type === 'gem'));
  assert.ok(r.find((x) => x.spot.id === 6).reasons.some((x) => x.type === 'friends'));
  assert.ok(r.find((x) => x.spot.id === 7).reasons.some((x) => x.type === 'new'));
  assert.equal(rankSpots({ profile, spots, exclude: new Set([1, 2, 4, 5, 7]) }).length, 0);
  assert.ok(r.find((x) => x.spot.id === 5).reasons.find((x) => x.type === 'saves').evidence.some((e) => e.tag === 'vinyl' || e.tag === 'jazz'));
});

test('inWindow: multi-day events overlap the range', () => {
  const ev = { kind: 'event', starts_at: '2026-11-01', ends_at: '2026-11-30' };
  assert.ok(inWindow(ev, '2026-11-10', '2026-11-12'));
  assert.ok(!inWindow(ev, '2026-12-01', '2026-12-02'));
  assert.ok(inWindow({ kind: 'place' }, '2030-01-01', '2030-01-02'));
});
