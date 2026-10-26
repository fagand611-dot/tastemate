import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoTag, guessKind, readSignals } from '../server/taxonomy.js';
import { cityFrom, csv, parseImport } from '../server/importers.js';
import { connectSaves, cosine, tasteWeb, distanceM, findPatterns, inWindow, interpret, pairSpots, perfectDay, rankSpots, tasteBoard, tasteCharacter, tasteProfile, toPercent } from '../server/taste-graph.js';

test('autoTag: keywords and music genres become shared tags', () => {
  assert.deepEqual(new Set(autoTag('Candlelit wine bar')), new Set(['moody', 'intimate', 'romantic', 'wine bar', 'night out']));
  assert.deepEqual(new Set(autoTag('Noodle street shop', null, 'Bangkok trip')), new Set(['food', 'noodles', 'street food', 'casual', 'budget', 'bangkok']));
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

test('importers: Spotify CSVs (liked songs, playlist tracks, Exportify), columns found by name', () => {
  const liked = parseImport('spotify', 'category,title,subtitle_artist_or_description,spotify_uri,spotify_url,is_explicit,traits,duration_ms\nliked_song,"Flightless Bird, American Mouth",Iron & Wine,spotify:track:1f,https://open.spotify.com/track/1f?si=abc,False,PLAYABLE;SAVED,241917\npodcast,Some Show,Host,spotify:show:9,,False,,1');
  assert.deepEqual(liked.map((r) => [r.title, r.creator, r.url, r.external_key]), [['Flightless Bird, American Mouth', 'Iron & Wine', 'https://open.spotify.com/track/1f', 'spotify:track:1f']], 'podcasts skipped, tracking stripped from links');
  const lists = parseImport('spotify', [
    'playlist_name,playlist_url,playlist_uri,position,track_title,artist_or_subtitle,track_uri,track_url,is_explicit,duration_ms,traits',
    'rainy day jazz,u,p1,1,So What,Miles Davis,spotify:track:1,,False,1,PLAYABLE',
    'late nights,u,p2,4,So What,Miles Davis,spotify:track:1,,False,1,PLAYABLE',
    'late nights,u,p2,5,Teardrop,Massive Attack,spotify:track:2,,False,1,PLAYABLE',
  ].join('\n'));
  assert.equal(lists.length, 2, 'a song in two playlists is one save');
  assert.equal(lists[0].collection, 'rainy day jazz · late nights');
  assert.equal(lists[0].url, 'https://open.spotify.com/track/1');
  const exportify = parseImport('spotify', '"Track URI","Track Name","Artist Name(s)","Album Name","Added At"\n"spotify:track:7","Dive","Olivia Dean","Messy","2024-02-01T00:00:00Z"');
  assert.deepEqual([exportify[0].title, exportify[0].creator, exportify[0].collection, exportify[0].saved_at], ['Dive', 'Olivia Dean', 'Messy', '2024-02-01T00:00:00Z']);
  assert.equal(parseImport('spotify', 'Nick Drake - Pink Moon')[0].creator, 'Nick Drake', 'plain lines still work');
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

test('tasteCharacter: a name from your strongest taste, your sides, apps and stretch', () => {
  const saves = interpret([
    save(1, 'song', 'spotify', ['jazz', 'chill'], { title: 'So What', creator: 'Miles Davis' }),
    save(2, 'song', 'spotify', ['jazz', 'chill'], { title: 'late night jazz' }),
    save(3, 'place', 'google_maps', ['jazz', 'intimate', 'vinyl'], { title: 'Vinyl listening bar' }),
    save(4, 'place', 'google_maps', ['speakeasy', 'cocktails'], { title: 'Speakeasy' }),
    save(5, 'food', 'instagram', ['pastry'], { title: '@croissants' }),
  ]);
  const clusters = findPatterns(saves);
  const c = tasteCharacter(saves, clusters, tasteProfile(saves));
  assert.equal(c.name, 'The Late-Night Listener');
  assert.ok(c.tagline.startsWith('with '));
  assert.equal(c.sides[0].tags[0], 'jazz');
  assert.deepEqual(c.apps.map((a) => a.source), ['spotify', 'google_maps', 'instagram']);
  assert.ok(c.stretch.includes('coffee'), 'pastry hints at coffee, which you have not saved');
  assert.ok(!c.stretch.some((t) => ['chill', 'intimate', 'moody'].includes(t)), 'moods are not something to try');
  assert.equal(tasteCharacter([], [], new Map()), null);
});

test('connectSaves: saves tie together through shared attributes, weighted by kind', () => {
  const saves = [
    save(1, 'song', 'spotify', ['jazz', 'chill'], { creator: 'Miles Davis' }),
    save(2, 'song', 'spotify', ['jazz', 'moody'], { creator: 'Miles Davis' }),
    save(3, 'place', 'google_maps', ['jazz', 'wine bar', 'moody']),
    save(4, 'food', 'instagram', ['food']),
    save(5, 'food', 'instagram', ['food']),
  ];
  const links = connectSaves(saves);
  const pair = (a, b) => links.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  assert.ok(pair(1, 2), 'same artist and sound');
  assert.ok(pair(1, 2).because.includes('Miles Davis'));
  assert.ok(pair(1, 2).strength > (pair(2, 3)?.strength ?? 0), 'a shared artist outweighs a shared mood');
  assert.ok(pair(2, 3)?.because.includes('jazz'));
  assert.equal(pair(4, 5), undefined, 'just "food" is too broad to tie two saves');
});

test('tasteBoard: a mix of tastes, weighted, with threads between the ones that go together', () => {
  const saves = [1, 2, 3, 4].map((i) => save(i, 'place', 'google_maps', ['jazz', 'moody', 'wine bar', 'dublin']));
  saves.push(save(5, 'food', 'instagram', ['pastry', 'coffee']));
  const profile = tasteProfile(saves);
  const board = tasteBoard(saves, findPatterns(saves), profile);
  const jazz = board.tastes.find((t) => t.tag === 'jazz');
  assert.equal(jazz.saves, 4);
  assert.ok(jazz.weight > board.tastes.find((t) => t.tag === 'pastry').weight);
  assert.ok(board.tastes.every((t) => t.weight > 0 && t.weight <= 1 && t.facet));
  assert.ok(board.threads.some((t) => [t.a, t.b].sort().join() === 'jazz,moody' && t.n === 4));
  assert.ok(!board.threads.some((t) => [t.a, t.b].includes('pastry')), 'one save together is not a thread');
});

test('pairSpots: each event gets the best place within walking distance, in the same city', () => {
  const spot = (id, kind, lat, lng, tags, city = 'Dublin') => ({ spot: { id, kind, lat, lng, tags, city }, score: 0.5 });
  assert.ok(Math.abs(distanceM({ lat: 53.3449, lng: -6.2675 }, { lat: 53.3438, lng: -6.2546 }) - 860) < 30);
  const profile = new Map([['coffee', 1], ['vinyl', 0.6]]);
  const events = [spot(1, 'event', 53.3449, -6.2675, ['jazz']), spot(2, 'event', 13.75, 100.5, ['film'], 'Bangkok')];
  const near = spot(10, 'place', 53.3452, -6.2660, ['coffee', 'vinyl']);
  const far = { ...spot(11, 'place', 53.36, -6.20, ['coffee']), score: 0.9 };
  const pairs = pairSpots({ events, places: [far, near], profile });
  assert.equal(pairs.length, 1, 'no place near the Bangkok screening');
  assert.equal(pairs[0].place.spot.id, 10);
  assert.ok(pairs[0].walk >= 1 && pairs[0].walk <= 3);
  assert.deepEqual(pairs[0].because, ['coffee', 'vinyl']);
});

test('tasteWeb: six sides of a life, scaled to your biggest, with what leads each', () => {
  const saves = interpret([
    save(1, 'song', 'spotify', ['jazz', 'vinyl']),
    save(2, 'song', 'spotify', ['jazz', 'soul']),
    save(3, 'place', 'google_maps', ['pastry', 'coffee']),
    save(4, 'look', 'instagram', ['tailoring']),
  ]);
  const web = tasteWeb(tasteProfile(saves));
  assert.deepEqual(web.map((a) => a.key), ['music', 'food', 'nights', 'culture', 'style', 'travel']);
  const music = web.find((a) => a.key === 'music');
  assert.equal(music.value, 1);
  assert.equal(music.top[0], 'jazz');
  assert.ok(web.every((a) => a.value >= 0 && a.value <= 1));
  assert.ok(web.find((a) => a.key === 'style').value < 1);
  assert.equal(tasteWeb(new Map()), null);
});
