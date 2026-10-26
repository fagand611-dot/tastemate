import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';
import { seedSpots } from '../server/seed/seed.js';
import { createSpotify } from '../server/providers/spotify.js';
import { createInstagram } from '../server/providers/instagram.js';
import { createSealer } from '../server/secrets.js';

// Stand-ins for Spotify's and Instagram's servers.
const calls = [];
const fake = { revoked: false };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
async function fakeFetch(url, opts = {}) {
  const u = new URL(url);
  const auth = opts.headers?.authorization || '';
  const form = opts.body ? Object.fromEntries(new URLSearchParams(opts.body)) : {};
  calls.push({ host: u.host, path: u.pathname, auth, form, query: Object.fromEntries(u.searchParams) });
  // Spotify
  if (u.host === 'accounts.spotify.com' && u.pathname === '/api/token') {
    assert.equal(auth, `Basic ${Buffer.from('cid:secret').toString('base64')}`);
    if (form.grant_type === 'authorization_code') return form.code === 'good' ? json({ access_token: 'AT1', refresh_token: 'RT1', expires_in: 3600, scope: 'user-library-read' }) : json({ error: 'invalid_grant' }, 400);
    if (form.grant_type === 'refresh_token') return json({ access_token: 'AT2', expires_in: 3600 });
  }
  if (u.host === 'api.spotify.com') {
    if (fake.revoked) return json({ error: { status: 401 } }, 401);
    if (u.pathname === '/v1/me') return json({ id: 'dee', display_name: 'Dee' });
    if (u.pathname === '/v1/me/tracks') {
      return json({
        items: [
          { added_at: '2025-01-01T00:00:00Z', track: { name: 'So What', uri: 'spotify:track:1', artists: [{ id: 'a1', name: 'Miles Davis' }], album: { name: 'Kind of Blue' }, external_urls: { spotify: 'https://open.spotify.com/track/1' } } },
          { added_at: '2025-01-02T00:00:00Z', track: { name: 'Lagos Night', uri: 'spotify:track:2', artists: [{ id: 'a2', name: 'Unknown Band' }], album: { name: 'Night' } } },
        ],
        next: null,
      });
    }
    if (u.pathname === '/v1/me/albums') return json({ items: [{ album: { name: 'Pink Moon', uri: 'spotify:album:3', artists: [{ id: 'a3', name: 'Nick Drake' }] } }], next: null });
    if (u.pathname === '/v1/artists') return json({ artists: [{ id: 'a2', genres: ['afrobeat', 'jazz'] }] });
  }
  // Instagram
  if (u.host === 'api.instagram.com' && u.pathname === '/oauth/access_token') return json({ access_token: 'short', user_id: 17 });
  if (u.host === 'graph.instagram.com') {
    if (u.pathname === '/access_token') return json({ access_token: 'LONG', token_type: 'bearer', expires_in: 5184000 });
    if (u.pathname === '/me') return json({ user_id: '17', username: 'dee' });
    if (u.pathname === '/me/media' && !u.searchParams.get('after')) {
      return json({
        data: [
          { id: 'p1', caption: 'Natural wine night in Dublin #wine', permalink: 'https://instagram.com/p/1', timestamp: '2025-02-01T20:00:00+0000' },
          { id: 'p2', caption: 'Croissants at dawn\n#pastry #coffee', permalink: 'https://instagram.com/p/2' },
        ],
        paging: { next: `https://graph.instagram.com/me/media?after=X&access_token=LONG` },
      });
    }
    if (u.pathname === '/me/media') return json({ data: [{ id: 'p3', caption: '' }] });
  }
  throw new Error(`Unexpected request ${url}`);
}

let server;
let base;
let db;
const key = crypto.randomBytes(32);

before(async () => {
  db = openDb(':memory:');
  seedSpots(db);
  const app = createApp({
    db,
    venueFeed: null,
    artistLookup: async () => null,
    feedProviders: [],
    connectors: {
      spotify: createSpotify({ clientId: 'cid', clientSecret: 'secret', fetchImpl: fakeFetch, wait: async () => {} }),
      instagram: createInstagram({ appId: 'igid', appSecret: 'igsecret', fetchImpl: fakeFetch }),
    },
    tokenKey: key,
    publicUrl: 'https://tastemate.test',
  });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

/** A client with its own session cookie that doesn't follow redirects. */
async function signup(username) {
  let cookie = '';
  const call = async (method, path, body) => {
    const res = await fetch(base + path, { method, redirect: 'manual', headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const type = res.headers.get('content-type') || '';
    return { status: res.status, location: res.headers.get('location'), body: type.includes('json') ? await res.json() : null };
  };
  const c = { get: (p) => call('GET', p), post: (p, b = {}) => call('POST', p, b), del: (p) => call('DELETE', p) };
  assert.equal((await c.post('/api/auth/register', { username, password: 'password123' })).status, 201);
  return c;
}

const app = async (c, provider) => (await c.get('/api/connect')).body.apps.find((a) => a.provider === provider);
async function settled(c, provider) {
  for (let i = 0; i < 50; i++) {
    const a = await app(c, provider);
    if (!a.syncing) return a;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('sync never finished');
}
const stateOf = (location) => new URL(location).searchParams.get('state');

test('Spotify: connect, bring the library in with genres, keep tokens sealed', async () => {
  const me = await signup('spotty');
  assert.deepEqual((await app(me, 'spotify')), { provider: 'spotify', label: 'Spotify', available: true, connected: false, account: null, last_synced_at: null, last_added: null, saves: 0, needs_reconnect: false, error: null, syncing: false });

  const start = await me.get('/api/connect/spotify/start');
  assert.equal(start.status, 302);
  const to = new URL(start.location);
  assert.equal(to.origin + to.pathname, 'https://accounts.spotify.com/authorize');
  assert.equal(to.searchParams.get('client_id'), 'cid');
  assert.equal(to.searchParams.get('redirect_uri'), 'https://tastemate.test/api/connect/spotify/callback');
  assert.match(to.searchParams.get('scope'), /user-library-read/);

  const state = stateOf(start.location);
  const back = await me.get(`/api/connect/spotify/callback?code=good&state=${state}`);
  assert.equal(back.status, 302);
  assert.equal(back.location, `${base}/you/add?connected=spotify`, 'back to where they started');

  const a = await settled(me, 'spotify');
  assert.equal(a.connected, true);
  assert.equal(a.account, 'Dee');
  assert.equal(a.saves, 3);
  const saves = (await me.get('/api/saves')).body.saves;
  const lagos = saves.find((s) => s.title === 'Lagos Night');
  assert.match(lagos.collection, /afrobeat/, 'artist genres ride along');
  assert.ok(lagos.tags.includes('jazz'));
  assert.ok(saves.some((s) => s.title === 'Pink Moon' && s.source === 'spotify'));

  const row = db.prepare("SELECT * FROM connections WHERE provider = 'spotify'").get();
  assert.ok(row.access_token.startsWith('v1.') && !row.access_token.includes('AT1'), 'tokens are sealed at rest');
  assert.equal(createSealer(key).open(row.refresh_token), 'RT1');
  assert.ok(!JSON.stringify((await me.get('/api/connect')).body).includes('AT1'), 'tokens never reach the browser');

  // A state works once, and only for a while.
  assert.match((await me.get(`/api/connect/spotify/callback?code=good&state=${state}`)).location, /connect_error=spotify&reason=expired/);
  assert.match((await me.get('/api/connect/spotify/callback?code=good&state=made-up')).location, /reason=expired/);
  const declined = stateOf((await me.get('/api/connect/spotify/start')).location);
  assert.match((await me.get(`/api/connect/spotify/callback?error=access_denied&state=${declined}`)).location, /reason=declined/);
});

test('Spotify: refreshes an expired token, never doubles up, asks to reconnect when access is withdrawn', async () => {
  const me = await signup('refresher');
  await me.get(`/api/connect/spotify/callback?code=good&state=${stateOf((await me.get('/api/connect/spotify/start')).location)}`);
  await settled(me, 'spotify');
  const uid = db.prepare("SELECT id FROM users WHERE username = 'refresher'").get().id;
  db.prepare('UPDATE connections SET expires_at = ? WHERE user_id = ?').run(Date.now() - 1000, uid);
  calls.length = 0;
  const r = (await me.post('/api/connect/spotify/sync')).body;
  assert.equal(r.added, 0, 'a second sync adds nothing new');
  assert.ok(calls.some((c) => c.form.grant_type === 'refresh_token' && c.form.refresh_token === 'RT1'));
  assert.ok(calls.filter((c) => c.host === 'api.spotify.com').every((c) => c.auth === 'Bearer AT2'), 'the fresh token is used');
  assert.equal(createSealer(key).open(db.prepare('SELECT refresh_token FROM connections WHERE user_id = ?').get(uid).refresh_token), 'RT1', 'the refresh token is kept');

  fake.revoked = true;
  assert.equal((await me.post('/api/connect/spotify/sync')).body.reconnect, true);
  fake.revoked = false;
  const a = await app(me, 'spotify');
  assert.equal(a.needs_reconnect, true);

  assert.equal((await me.del('/api/connect/spotify')).status, 200);
  const gone = await app(me, 'spotify');
  assert.equal(gone.connected, false);
  assert.equal(gone.saves, 3, 'saves stay after disconnecting');
  assert.equal((await me.post('/api/connect/spotify/sync')).status, 404);
});

test('Instagram: connect with a long-lived token, bring your own posts in, cities included', async () => {
  const me = await signup('grammer');
  const start = await me.get('/api/connect/instagram/start');
  const to = new URL(start.location);
  assert.equal(to.origin + to.pathname, 'https://www.instagram.com/oauth/authorize');
  assert.equal(to.searchParams.get('scope'), 'instagram_business_basic');
  calls.length = 0;
  await me.get(`/api/connect/instagram/callback?code=ig&state=${stateOf(start.location)}`);
  const a = await settled(me, 'instagram');
  assert.equal(a.account, '@dee');
  assert.equal(a.saves, 3, 'every page of posts');
  assert.ok(calls.some((c) => c.path === '/access_token' && c.query.grant_type === 'ig_exchange_token' && c.query.access_token === 'short'));
  const saves = (await me.get('/api/saves')).body.saves.filter((s) => s.source === 'instagram');
  const wine = saves.find((s) => s.title.startsWith('Natural wine night'));
  assert.equal(wine.city, 'Dublin');
  assert.ok(!saves.find((s) => s.title.startsWith('Croissants')).title.includes('#'), 'hashtags stay out of titles');
  assert.ok(saves.some((s) => s.title === 'Instagram post'));
});

test('connect: apps this server has no keys for, and ones it has never heard of', async () => {
  const off = createApp({ db, venueFeed: null, artistLookup: async () => null, connectors: { spotify: null }, tokenKey: key, feedProviders: [] });
  const s = off.listen(0);
  await new Promise((r) => s.once('listening', r));
  const url = `http://localhost:${s.address().port}`;
  const reg = await fetch(`${url}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'nokeys', password: 'password123' }) });
  const cookie = reg.headers.get('set-cookie').split(';')[0];
  const apps = await (await fetch(`${url}/api/connect`, { headers: { cookie } })).json();
  assert.equal(apps.apps[0].available, false);
  assert.equal((await fetch(`${url}/api/connect/spotify/start`, { headers: { cookie }, redirect: 'manual' })).status, 400);
  assert.equal((await fetch(`${url}/api/connect/myspace/start`, { headers: { cookie }, redirect: 'manual' })).status, 404);
  assert.equal((await fetch(`${url}/api/connect/spotify/start`, { redirect: 'manual' })).headers.get('location'), '/', 'signed out goes home');
  s.close();
});

test('sealer: round trip, and tampering is caught', () => {
  const s = createSealer(key);
  const sealed = s.seal('secret-token');
  assert.notEqual(sealed, s.seal('secret-token'), 'a fresh IV each time');
  assert.equal(s.open(sealed), 'secret-token');
  const [v, iv, tag, body] = sealed.split('.');
  const flipped = Buffer.from(body, 'base64');
  flipped[0] ^= 1;
  assert.throws(() => s.open([v, iv, tag, flipped.toString('base64')].join('.')));
  assert.throws(() => createSealer(crypto.randomBytes(32)).open(sealed), 'another key cannot open it');
  assert.equal(s.seal(null), null);
});
