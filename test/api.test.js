import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';
import { seedSpots } from '../server/seed/seed.js';

// Stands in for MusicBrainz: knows one artist the built-in list doesn't.
const lookups = [];
const fakeLookup = async (name) => {
  lookups.push(name);
  if (name === 'Nonexistent Band') return null;
  if (name === 'Lagos Sound') return { role: 'band', sounds: ['afrobeat'], moods: [], from: 'Lagos', era: '2010s' };
  throw new Error('offline');
};

let server;
let app;
let base;

before(async () => {
  const db = openDb(':memory:');
  seedSpots(db);
  app = createApp({ db, venueFeed: null, artistLookup: fakeLookup });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

/** A tiny client that keeps its own session cookie. */
function client() {
  let cookie = '';
  const call = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, body: await res.json() };
  };
  return {
    get: (p) => call('GET', p),
    post: (p, b = {}) => call('POST', p, b),
    put: (p, b = {}) => call('PUT', p, b),
    patch: (p, b = {}) => call('PATCH', p, b),
    del: (p) => call('DELETE', p),
  };
}

async function signup(username) {
  const c = client();
  const r = await c.post('/auth/register', { username, password: 'password123' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  c.id = r.body.user.id;
  return c;
}

async function befriend(a, b, bName) {
  await a.post('/friends/request', { username: bName });
  const r = await b.post(`/friends/${a.id}/accept`);
  assert.equal(r.status, 200);
}

test('auth: register, me, logout, login, bad password', async () => {
  const c = await signup('alice');
  assert.equal((await c.get('/me')).body.user.username, 'alice');
  await c.post('/auth/logout');
  assert.equal((await c.get('/me')).body.user, null);
  assert.equal((await c.get('/saves')).status, 401);
  assert.equal((await c.post('/auth/login', { username: 'alice', password: 'nope-nope' })).status, 401);
  assert.equal((await c.post('/auth/login', { username: 'ALICE', password: 'password123' })).status, 200);
  assert.equal((await client().post('/auth/register', { username: 'alice', password: 'password123' })).status, 409);
  assert.equal((await client().post('/auth/register', { username: 'x', password: 'password123' })).status, 400);
});

test('friends: request, accept, taste match, remove', async () => {
  const a = await signup('fr_a');
  const b = await signup('fr_b');
  assert.equal((await a.post('/friends/request', { username: 'fr_a' })).status, 400);
  assert.equal((await a.post('/friends/request', { username: 'nobody_here' })).status, 404);
  assert.equal((await a.post('/friends/request', { username: 'fr_b' })).status, 201);
  assert.deepEqual((await b.get('/friends')).body.incoming.map((u) => u.username), ['fr_a']);
  await b.post(`/friends/${a.id}/accept`);
  await a.post('/saves', { title: 'Late night jazz bar' });
  await b.post('/saves', { title: 'Jazz café' });
  const f = (await a.get('/friends')).body.friends;
  assert.equal(f[0].username, 'fr_b');
  assert.ok(f[0].match > 50);
  await a.del(`/friends/${b.id}`);
  assert.equal((await a.get('/friends')).body.friends.length, 0);
});

test('saves: import, add, retag, graph with tiered clusters', async () => {
  const me = await signup('grapher');
  const other = await signup('grapher_other');

  // Import is idempotent: the same file twice adds nothing the second time.
  const lib = JSON.stringify({ tracks: [{ artist: 'Miles Davis', track: 'So What', uri: 'spotify:track:1' }, { artist: 'Bill Evans', track: 'Peace Piece', uri: 'spotify:track:2' }] });
  let r = await me.post('/saves/import', { source: 'spotify', text: lib });
  assert.equal(r.body.added, 2);
  r = await me.post('/saves/import', { source: 'spotify', text: lib });
  assert.deepEqual([r.body.added, r.body.skipped], [0, 2]);
  assert.equal((await me.post('/saves/import', { source: 'nope', text: lib })).status, 400);

  r = await me.post('/saves/import', { source: 'google_maps', text: 'Title,Note,URL\nListening bar,records all night,https://maps.google.com/?cid=9\n' });
  assert.equal(r.body.added, 1);
  const { save } = (await me.post('/saves', { title: 'Candlelit wine bar', city: 'Dublin', url: 'javascript:x' })).body;
  assert.equal(save.kind, 'place');
  assert.equal(save.url, null);
  assert.ok(save.tags.includes('intimate'));

  const saves = (await me.get('/saves')).body.saves;
  const song = saves.find((s) => s.title === 'So What');
  assert.ok(song.tags.includes('jazz'), 'Miles Davis reads as jazz');
  assert.equal((await me.patch(`/saves/${song.id}`, { tags: ['Jazz', 'chill', 'jazz'] })).body.save.tags.join(), 'jazz,chill');
  assert.equal((await other.patch(`/saves/${song.id}`, { tags: [] })).status, 404, 'saves are private');
  assert.equal((await other.del(`/saves/${song.id}`)).status, 404);

  const you = (await me.get('/you')).body;
  assert.equal(you.total, 4);
  assert.equal(you.character.name, 'The Late-Night Listener');
  assert.ok(you.character.description.startsWith('You’re drawn to'));
  assert.ok(you.character.dials.length >= 2);
  assert.ok(you.character.sides.length >= 1);
  assert.ok(you.character.sides[0].proof.every((p) => p.chips.length > 0), 'each proof save is broken down');
});

test('saves break down into facets, and unknown artists are looked up in the background', async () => {
  const me = await signup('breaker');
  await me.post('/saves/import', { source: 'spotify', text: 'Olivia Dean - Dive' });
  let dive = (await me.get('/saves')).body.saves.find((s) => s.title === 'Dive');
  assert.deepEqual(dive.facets.place.map((x) => x.tag), ['london']);
  assert.deepEqual(dive.facets.era.map((x) => x.tag), ['2020s']);
  assert.ok(dive.facets.sound.some((x) => x.tag === 'neo-soul'));
  assert.ok(dive.facets.vibe.some((x) => x.tag === 'warm'));
  assert.match(dive.facets.place[0].via, /Olivia Dean is from London/);

  const r = await me.post('/saves/import', { source: 'spotify', text: 'Lagos Sound - Night Drive\nNonexistent Band - Song\nOffline Artist - Track' });
  assert.equal(r.body.lookingUp >= 1, true);
  await app.locals.enricher.whenIdle();
  const saves = (await me.get('/saves')).body.saves;
  const drive = saves.find((s) => s.title === 'Night Drive');
  assert.deepEqual(drive.facets.place.map((x) => x.tag), ['lagos']);
  assert.ok(drive.tags.includes('afrobeat') && drive.tags.includes('jazz'), 'new facets are added to the save');
  assert.equal(saves.find((s) => s.title === 'Song').facets.place, undefined, 'no match, nothing invented');

  // Known answers are cached; a failed lookup is tried again next time.
  lookups.length = 0;
  await me.post('/saves/import', { source: 'spotify', text: 'Lagos Sound - Another\nNonexistent Band - B\nOffline Artist - C' });
  await app.locals.enricher.whenIdle();
  assert.deepEqual(lookups, ['Offline Artist']);
});

test('next: city, friends, save and dismiss, home city, your own saves there', async () => {
  const me = await signup('nexter');
  const pal = await signup('nexter_pal');
  await me.post('/saves/import', { source: 'spotify', text: 'Miles Davis - So What\nJohn Coltrane - Naima' });
  await me.post('/saves', { title: 'Vinyl listening bar', city: 'Bangkok' });
  await befriend(me, pal, 'nexter_pal');

  let next = (await me.get('/next?city=bangkok')).body;
  assert.equal(next.city, 'Bangkok');
  assert.deepEqual(next.yourSaves.map((s) => s.title), ['Vinyl listening bar']);
  const jazz = next.events.find((e) => e.spot.tags.includes('jazz'));
  assert.ok(jazz, 'a jazz event is suggested');
  assert.ok(jazz.reasons.some((x) => x.type === 'saves'));
  assert.ok(next.events.every((e) => e.spot.city === 'Bangkok'));
  assert.ok(next.products.every((e) => !e.spot.city || e.spot.city === 'Bangkok'));

  const place = next.places[0].spot;
  await pal.post(`/spots/${place.id}/save`);
  next = (await me.get('/next?city=Bangkok')).body;
  assert.deepEqual(next.places.find((p) => p.spot.id === place.id).reasons.find((x) => x.type === 'friends').names, ['nexter_pal']);

  await me.post(`/spots/${jazz.spot.id}/save`);
  await me.post(`/spots/${place.id}/dismiss`);
  next = (await me.get('/next?city=Bangkok')).body;
  assert.ok(!next.events.some((e) => e.spot.id === jazz.spot.id));
  assert.ok(!next.places.some((p) => p.spot.id === place.id));
  assert.deepEqual(next.saved.map((s) => s.spot.id), [jazz.spot.id]);

  assert.ok(Array.isArray(next.stretch));
  assert.ok(next.stretch.every((x) => x.reasons[0].type === 'stretch'));

  await me.put('/settings', { home_city: 'London' });
  assert.equal((await me.get('/me')).body.user.home_city, 'London');
  const day = (await me.get('/you')).body.day;
  assert.ok(day.length >= 1, 'a perfect day in your home city');
  assert.ok(day.every((d) => d.spot.city === 'London'));
  assert.equal(new Set(day.map((d) => d.spot.id)).size, day.length, 'three different places');
  assert.equal((await me.get('/next')).body.city, 'London');
  assert.equal((await me.get('/next?from=2026-02-01&to=2026-01-01')).status, 400);
  assert.equal((await me.post('/spots/99999/save')).status, 404);
});

test('events from posts: read a draft, save it, friends see it, strangers do not', async () => {
  const me = await signup('poster');
  const pal = await signup('poster_pal');
  const stranger = await signup('poster_stranger');
  await befriend(me, pal, 'poster_pal');

  const { draft } = (await me.post('/spots/from-post', { text: 'JAZZ & COMEDY\nSat 14 Nov 2099, 8pm at The Stag, Dublin. €10', url: 'https://instagram.com/p/abc' })).body;
  assert.equal(draft.starts_at, '2099-11-14T20:00');
  assert.equal(draft.city, 'Dublin');
  assert.equal((await me.post('/spots/from-post', { text: ' ' })).status, 400);

  assert.equal((await me.post('/spots', { ...draft, starts_at: 'soon' })).status, 400);
  assert.equal((await me.post('/spots', { ...draft, city: '' })).status, 400);
  const { spot } = (await me.post('/spots', draft)).body;
  assert.equal(spot.added_by, me.id);
  assert.ok((await me.get('/saves')).body.saves.some((s) => s.spot_id === spot.id), 'it goes into your plan');

  // A friend who likes jazz sees it, with your name on it.
  await pal.post('/saves', { title: 'Jazz and comedy clips' });
  const palNext = (await pal.get('/next?city=Dublin&from=2099-11-01&to=2099-11-30')).body;
  const seen = palNext.events.find((e) => e.spot.id === spot.id);
  assert.ok(seen);
  assert.deepEqual(seen.reasons.find((x) => x.type === 'friends').names, ['poster']);

  await stranger.post('/saves', { title: 'Jazz and comedy clips' });
  const strangerNext = (await stranger.get('/next?city=Dublin&from=2099-11-01&to=2099-11-30')).body;
  assert.ok(!strangerNext.events.some((e) => e.spot.id === spot.id));
  assert.equal((await stranger.post(`/spots/${spot.id}/save`)).status, 404);

  assert.equal((await me.post('/spots/refresh-posts')).status, 400, 'no venue feed configured');
});

test('occasion: a plan from your clusters, with a theme you can switch', async () => {
  const me = await signup('host');
  await me.post('/saves/import', { source: 'spotify', text: 'Miles Davis - So What\nBill Evans - Peace Piece\nJohn Coltrane - Naima' });
  await me.post('/saves', { title: 'Vinyl listening bar', city: 'Dublin' });
  await me.post('/saves', { title: 'Candlelit wine bar', city: 'Dublin' });
  await me.put('/settings', { home_city: 'Dublin' });

  const plan = (await me.get('/occasion?type=dinner')).body;
  assert.equal(plan.occasion.type, 'dinner');
  assert.ok(plan.theme.name.endsWith('supper'));
  assert.equal(plan.drinks.wine.length, 3);
  assert.ok(plan.playlist.fromSaves.length >= 2);
  assert.ok(plan.invite.colors.bg && plan.invite.headline);
  assert.ok(plan.shop.every((s) => !s.city || s.city === 'Dublin'));
  if (plan.themes.length > 1) {
    const other = plan.themes.find((t) => t.index !== plan.theme.index);
    assert.equal((await me.get(`/occasion?type=dinner&theme=${other.index}`)).body.theme.index, other.index);
  }
  assert.equal((await me.get('/occasion?type=nonsense')).body.occasion.type, 'dinner');
});

test('connections: saves link to each other, You has a taste board, Next pairs a show with a place nearby', async () => {
  const me = await signup('connector');
  await me.post('/saves/import', { source: 'spotify', text: 'Miles Davis - So What\nMiles Davis - Blue in Green\nBill Evans - Peace Piece' });
  await me.post('/saves', { title: 'Specialty coffee and vinyl', city: 'Dublin' });
  await me.post('/saves', { title: 'Late night jazz bar', city: 'Dublin' });
  await me.put('/settings', { home_city: 'Dublin' });

  const { saves } = (await me.get('/saves')).body;
  const sowhat = saves.find((s) => s.title === 'So What');
  assert.ok(sowhat.links.some((l) => l.title === 'Blue in Green' && l.because.includes('Miles Davis')));

  const you = (await me.get('/you')).body;
  assert.ok(you.board.tastes.some((t) => t.tag === 'jazz'));
  assert.ok(Array.isArray(you.board.threads));

  const next = (await me.get('/next?city=Dublin&window=2weeks')).body;
  assert.ok(Array.isArray(next.pairs));
  for (const p of next.pairs) {
    assert.equal(p.event.spot.kind, 'event');
    assert.equal(p.place.spot.city, p.event.spot.city);
    assert.ok(p.distance <= 1500);
  }

  const plan = (await me.get('/occasion?type=dinner&city=Dublin')).body;
  assert.ok(plan.cities.includes('Dublin'));
  assert.equal(plan.city, 'Dublin');
  if (plan.venue) assert.equal(plan.venue.spot.city, 'Dublin');
});

test('profile photo: upload, serve, replace and remove; only small images', async () => {
  const me = await signup('selfie');
  const png = 'data:image/png;base64,' + Buffer.from('\x89PNG fake image bytes').toString('base64');
  assert.equal((await me.put('/me/avatar', { image: 'data:text/html;base64,PGgxPg==' })).status, 400);
  assert.equal((await me.put('/me/avatar', { image: 'data:image/png;base64,' + Buffer.alloc(310 * 1024).toString('base64') })).status, 413);
  const up = await me.put('/me/avatar', { image: png });
  assert.equal(up.status, 200);
  assert.match(up.body.avatar_url, new RegExp(`^/api/users/${me.id}/avatar\\?v=`));
  assert.equal((await me.get('/me')).body.user.avatar_url, up.body.avatar_url);
  const img = await fetch(base.replace(/\/api$/, '') + up.body.avatar_url);
  assert.equal(img.headers.get('content-type'), 'image/png');
  assert.equal(Buffer.from(await img.arrayBuffer()).toString(), '\x89PNG fake image bytes');
  assert.equal((await me.del('/me/avatar')).body.avatar_url, null);
  assert.equal((await fetch(`${base}/users/${me.id}/avatar`)).status, 404);
});

test('friends show their Tastemate title; Host invites them; places carry photos', async () => {
  const me = await signup('titled');
  const pal = await signup('titled_pal');
  await befriend(me, pal, 'titled_pal');
  await pal.post('/saves/import', { source: 'spotify', text: 'Miles Davis - So What\nBill Evans - Peace Piece\nJohn Coltrane - Naima' });
  await pal.post('/saves', { title: 'Vinyl listening bar', city: 'Dublin' });
  await pal.post('/saves', { title: 'Late night jazz bar', city: 'Dublin' });
  await me.post('/saves', { title: 'Candlelit wine bar', city: 'Dublin' });
  await me.post('/saves', { title: 'Late night jazz bar', city: 'Dublin' });
  await me.post('/saves/import', { source: 'spotify', text: 'Miles Davis - Blue in Green\nChet Baker - Alone Together' });

  const friend = (await me.get('/friends')).body.friends[0];
  assert.equal(friend.username, 'titled_pal');
  assert.match(friend.title, /^The /);
  assert.equal((await me.get('/you')).body.twin.title, friend.title);

  const plan = (await me.get('/occasion?type=dinner&city=Dublin')).body;
  const guest = plan.guests.find((g) => g.name === 'titled_pal');
  assert.equal(guest.title, friend.title);
  assert.equal(guest.sample, false);

  const next = (await me.get('/next?city=Dublin&window=2weeks')).body;
  const all = Object.values(next.sections || {}).flat().concat(next.stretch || [], next.pairs?.map((p) => p.place) || []);
  assert.ok(all.some((x) => x.spot.kind === 'place' && /^https:\/\//.test(x.spot.image)), 'sample places have photos');
  assert.ok((await me.get('/you')).body.collage.bag.length > 0);
});

test('instagram: importing posts then collections fills in the collection, without doubling anything', async () => {
  const me = await signup('igmerge');
  const posts = JSON.stringify([{ timestamp: 1, label_values: [
    { label: 'URL', href: 'https://www.instagram.com/p/ZZZ/' }, { label: 'Caption', value: 'Almond croissant meets muffin' },
    { dict: [{ dict: [{ label: 'Username', value: 'bakerydiaries' }], title: '' }], title: 'Owner' },
  ] }]);
  const cols = JSON.stringify([{ timestamp: 1, label_values: [{ label: 'Name', value: 'Feed this fatty' }, { dict: [{ dict: [{ label: 'URL', href: 'https://www.instagram.com/p/ZZZ/' }], title: '' }], title: 'Media' }] }]);
  assert.equal((await me.post('/saves/import', { source: 'instagram', text: posts })).body.added, 1);
  const second = (await me.post('/saves/import', { source: 'instagram', text: cols })).body;
  assert.deepEqual([second.added, second.updated], [0, 1]);
  const [s] = (await me.get('/saves')).body.saves;
  assert.equal(s.collection, 'Feed this fatty');
  assert.equal(s.creator, '@bakerydiaries', 'what the first file knew stays');
  assert.ok(s.tags.includes('pastry'));
  assert.equal((await me.post('/saves/import', { source: 'instagram', text: cols })).body.skipped, 1, 'a third time changes nothing');
});

test('invites: a link guests open without an account, answer, and change their answer; the host sees who', async () => {
  const host = await signup('hostess');
  const payload = { occasion: 'Dinner party', headline: 'Candlelit jazz supper', line: 'Come for dinner', when: 'Saturday, 8pm', where: 'at mine', dress: 'Tweed and knits', type: 'serif-italic', motif: 'record', colors: { bg: '#2a1f1d', ink: '#f6f1e7', accent: '#d9a441' }, palette: ['#2a1f1d', 'not-a-colour'], records: ['So What · Miles Davis'], menu: ['Anchovy toast'], extra: '<script>' };
  const made = await host.post('/invites', payload);
  assert.equal(made.status, 201);
  const { token } = made.body;
  assert.match(token, /^[\w-]{12}$/);
  assert.equal((await host.post('/invites', { headline: '' })).status, 400);

  // A guest: no account, no cookie.
  const open = async () => (await fetch(`${base}/invites/${token}`)).json();
  const seen = await open();
  assert.equal(seen.invite.headline, 'Candlelit jazz supper');
  assert.deepEqual(seen.invite.palette, ['#2a1f1d'], 'only real colours get through');
  assert.equal(seen.invite.extra, undefined, 'nothing but the invite’s own fields');
  assert.equal(seen.host.name, 'hostess');
  assert.equal(seen.isHost, false);
  const rsvp = (body) => fetch(`${base}/invites/${token}/rsvp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await rsvp({ name: 'Maya Lee', answer: 'yes', note: 'Bringing wine' })).status, 200);
  assert.equal((await rsvp({ name: 'Sam', answer: 'maybe' })).status, 200);
  assert.equal((await rsvp({ name: 'sam', answer: 'no' })).status, 200, 'the same name changes its answer');
  assert.equal((await rsvp({ name: '', answer: 'yes' })).status, 400);
  assert.equal((await rsvp({ name: 'X', answer: 'definitely' })).status, 400);
  const after = await open();
  assert.deepEqual(after.counts, { yes: 1, maybe: 0, no: 1 });
  assert.deepEqual(after.going, ['Maya'], 'guests see first names only');
  assert.equal(after.rsvps, undefined, 'notes are for the host');

  // The host sees the answers, can change the details on the same link, and delete it.
  const mine = (await host.get(`/invites/${token}`)).body;
  assert.equal(mine.isHost, true);
  assert.deepEqual(mine.rsvps.map((r) => [r.name, r.answer, r.note]), [['Maya Lee', 'yes', 'Bringing wine'], ['Sam', 'no', null]]);
  await host.put(`/invites/${token}`, { ...payload, when: 'Sunday, 7pm' });
  assert.equal((await open()).invite.when, 'Sunday, 7pm');
  const other = await signup('notthehost');
  assert.equal((await other.put(`/invites/${token}`, payload)).status, 404, 'only the host can change it');
  assert.equal((await host.get('/invites')).body.invites[0].rsvps.length, 2);
  await host.del(`/invites/${token}`);
  assert.equal((await fetch(`${base}/invites/${token}`)).status, 404);
});
