import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';
import { seedSpots } from '../server/seed/seed.js';
import { createTicketmaster } from '../server/providers/ticketmaster.js';
import { createGooglePlaces } from '../server/providers/google-places.js';
import { createEbay } from '../server/providers/ebay.js';

// Stand-ins for Ticketmaster and Google Places.
const calls = [];
const broken = new Set();
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

async function fakeFetch(url, opts = {}) {
  const u = new URL(url);
  calls.push(u.host + u.pathname);
  if (u.host === 'app.ticketmaster.com') {
    const city = u.searchParams.get('city');
    if (broken.has(city)) return json({ fault: 'rate limited' }, 429);
    if (city !== 'Amsterdam' && city !== 'Dublin') return json({ page: { totalPages: 0 } });
    const venue = { name: city === 'Dublin' ? 'Vicar Street' : 'Bimhuis', city: { name: city }, location: { latitude: '52.378', longitude: '4.913' } };
    return json({
      _embedded: {
        events: [
          { id: 'tm1', name: 'Late Night Jazz Trio', url: 'https://ticketmaster.example/tm1', dates: { start: { localDate: day(2), localTime: '21:30:00' } }, classifications: [{ segment: { name: 'Music' }, genre: { name: 'Jazz' } }], priceRanges: [{ currency: 'EUR', min: 18, max: 25 }], images: [{ ratio: '16_9', width: 1024, url: 'https://img.example/big.jpg' }, { ratio: '16_9', width: 640, url: 'https://img.example/640.jpg' }], _embedded: { venues: [venue] } },
          { id: 'tm2', name: 'Late Night Jazz Trio', dates: { start: { localDate: day(3) } }, classifications: [{ segment: { name: 'Music' } }], _embedded: { venues: [venue] } },
          { id: 'tm3', name: 'Stand-up showcase', dates: { start: { localDate: day(4) } }, classifications: [{ segment: { name: 'Arts & Theatre' }, genre: { name: 'Comedy' } }], _embedded: { venues: [venue] } },
        ],
      },
      page: { totalPages: 1 },
    });
  }
  if (u.host === 'places.googleapis.com' && u.pathname === '/v1/places:searchText') {
    assert.equal(opts.headers['X-Goog-Api-Key'], 'gkey');
    assert.match(opts.headers['X-Goog-FieldMask'], /places\.photos/);
    const { textQuery } = JSON.parse(opts.body);
    if (!textQuery.endsWith('in Amsterdam')) return json({});
    if (textQuery.startsWith('natural wine bar')) {
      return json({
        places: [
          { id: 'g1', displayName: { text: 'Glou Glou' }, shortFormattedAddress: 'De Pijp', location: { latitude: 52.3765, longitude: 4.9105 }, rating: 4.7, userRatingCount: 820, priceLevel: 'PRICE_LEVEL_MODERATE', businessStatus: 'OPERATIONAL', googleMapsUri: 'https://maps.google.com/?cid=1', editorialSummary: { text: 'Cosy natural wine bar with small plates.' }, photos: [{ name: 'places/g1/photos/p1', authorAttributions: [{ displayName: 'Anna K' }] }] },
          { id: 'g2', displayName: { text: 'Meh Wine' }, rating: 3.6, userRatingCount: 400, businessStatus: 'OPERATIONAL' },
          { id: 'g3', displayName: { text: 'Shut Bar' }, rating: 4.9, userRatingCount: 400, businessStatus: 'CLOSED_PERMANENTLY' },
        ],
      });
    }
    if (textQuery.startsWith('specialty coffee')) {
      return json({ places: [{ id: 'g4', displayName: { text: 'Lot Sixty One' }, location: { latitude: 52.366, longitude: 4.876 }, rating: 4.6, userRatingCount: 1500, priceLevel: 'PRICE_LEVEL_INEXPENSIVE', businessStatus: 'OPERATIONAL' }] });
    }
    if (textQuery.startsWith('brunch')) {
      return json({ places: [{ id: 'g4', displayName: { text: 'Lot Sixty One' }, rating: 4.6, userRatingCount: 1500, businessStatus: 'OPERATIONAL' }] });
    }
    return json({ places: [] });
  }
  if (u.host === 'places.googleapis.com' && u.pathname.endsWith('/media')) {
    assert.equal(u.searchParams.get('skipHttpRedirect'), 'true');
    return json({ photoUri: 'https://lh3.googleusercontent.example/photo.jpg' });
  }
  throw new Error(`Unexpected request ${url}`);
}

let server;
let base;
let db;
before(async () => {
  db = openDb(':memory:');
  seedSpots(db);
  const app = createApp({
    db,
    venueFeed: null,
    artistLookup: null,
    feedProviders: [createTicketmaster({ apiKey: 'tmkey', fetchImpl: fakeFetch }), createGooglePlaces({ apiKey: 'gkey', fetchImpl: fakeFetch })],
  });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

async function signup(username) {
  let cookie = '';
  const call = async (method, path, body) => {
    const res = await fetch(base + path, { method, redirect: 'manual', headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, location: res.headers.get('location'), body: (res.headers.get('content-type') || '').includes('json') ? await res.json() : null };
  };
  const c = { get: (p) => call('GET', p), post: (p, b = {}) => call('POST', p, b), put: (p, b = {}) => call('PUT', p, b) };
  await c.post('/auth/register', { username, password: 'password123' });
  await c.post('/saves', { title: 'Late night jazz bar' });
  await c.post('/saves', { title: 'Natural wine bar' });
  return c;
}

test('live feeds: a city with no samples fills in with real events and places', async () => {
  const me = await signup('amsterdammer');
  await me.put('/settings', { home_city: 'Amsterdam' });
  const d = (await me.get(`/next?from=${day(0)}&to=${day(14)}`)).body;
  assert.equal(d.city, 'Amsterdam', 'your home city works even without sample spots');
  assert.ok(d.cities.includes('Amsterdam'));

  const jazz = d.events.find((x) => x.spot.title === 'Late Night Jazz Trio');
  assert.ok(jazz, 'Ticketmaster events show up');
  assert.equal(d.events.filter((x) => x.spot.title === 'Late Night Jazz Trio').length, 1, 'a run of shows is one pick');
  assert.equal(jazz.spot.venue, 'Bimhuis');
  assert.equal(jazz.spot.starts_at, `${day(2)}T21:30`);
  assert.equal(jazz.spot.price, '€18–25');
  assert.equal(jazz.spot.image, 'https://img.example/640.jpg', 'the smallest wide photo that still looks good');
  assert.ok(jazz.spot.tags.includes('jazz') && jazz.spot.tags.includes('live music'));
  assert.equal(jazz.spot.credit, 'Tickets via Ticketmaster');
  assert.equal(jazz.spot.is_demo, false);
  assert.ok(JSON.parse(db.prepare("SELECT tags FROM spots WHERE external_id = 'tm3'").get().tags).includes('comedy'), 'Ticketmaster genres become tastes');

  const wine = d.places.find((x) => x.spot.title === 'Glou Glou');
  assert.ok(wine, 'Google places show up');
  assert.ok(wine.spot.tags.includes('wine bar'));
  assert.equal(wine.spot.venue, 'De Pijp');
  assert.equal(wine.spot.price, 'Mid-range');
  assert.match(wine.spot.credit, /4\.7★ on Google Maps · Photo: Anna K/);
  assert.equal(wine.spot.image, '/api/photos/google?ref=places%2Fg1%2Fphotos%2Fp1', 'photos go through Tastemate, never with the key');
  assert.ok(!d.places.some((x) => ['Meh Wine', 'Shut Bar'].includes(x.spot.title)), 'low ratings and closed places are left out');
  const coffee = JSON.parse(db.prepare("SELECT tags FROM spots WHERE external_id = 'g4'").get().tags);
  assert.ok(coffee.includes('brunch') && coffee.includes('coffee') && coffee.includes('budget'), 'found by two searches, it keeps both sets of tags');

  assert.deepEqual(d.live.map((f) => [f.provider, f.ok, f.count]), [['ticketmaster', true, 2], ['google_places', true, 2]]);
  assert.ok(d.pairs.some((p) => p.event.spot.title === 'Late Night Jazz Trio'), 'real coordinates mean real "make a night of it" pairs');

  // Fresh feeds aren't fetched again.
  calls.length = 0;
  await me.get(`/next?from=${day(0)}&to=${day(14)}`);
  assert.equal(calls.length, 0);

  const photo = await me.get('/photos/google?ref=places%2Fg1%2Fphotos%2Fp1');
  assert.equal(photo.status, 302);
  assert.equal(photo.location, 'https://lh3.googleusercontent.example/photo.jpg');
  assert.equal((await me.get('/photos/google?ref=..%2Fsecret')).status, 404);
});

test('live feeds: samples step aside only for the kinds a city has live; a failing feed leaves the samples', async () => {
  const me = await signup('dubliner');
  await me.put('/settings', { home_city: 'Dublin' });
  const d = (await me.get(`/next?city=Dublin&from=${day(0)}&to=${day(14)}`)).body;
  assert.ok(d.events.length && d.events.every((x) => !x.spot.is_demo), 'live events replace the sample events');
  assert.ok(d.places.some((x) => x.spot.is_demo), 'no live places for Dublin, so the sample places stay');

  broken.add('London');
  const l = await me.get(`/next?city=London&from=${day(0)}&to=${day(14)}`);
  assert.equal(l.status, 200, 'a feed failing never breaks the page');
  assert.ok(l.body.events.some((x) => x.spot.is_demo));
  assert.equal(l.body.live.find((f) => f.provider === 'ticketmaster').ok, false);
  assert.equal(db.prepare("SELECT ok FROM feed_runs WHERE city_key = 'london' AND provider = 'ticketmaster'").get().ok, 0);
});

test('live feeds: switched off without keys', () => {
  assert.equal(createTicketmaster({ apiKey: '' }), null);
  assert.equal(createGooglePlaces({ apiKey: undefined }), null);
});

test('live feeds: things to buy from eBay, for every city, with the sample products stepping aside', async () => {
  const seen = [];
  const ebayFetch = async (url, opts = {}) => {
    const u = new URL(url);
    seen.push(u.pathname);
    if (u.pathname === '/identity/v1/oauth2/token') {
      assert.match(opts.body, /grant_type=client_credentials/);
      return json({ access_token: 'APP', expires_in: 7200 });
    }
    assert.equal(opts.headers.authorization, 'Bearer APP');
    assert.equal(opts.headers['X-EBAY-C-MARKETPLACE-ID'], 'EBAY_IE');
    const q = u.searchParams.get('q');
    if (q !== 'jazz vinyl record') return json({ itemSummaries: [] });
    return json({ itemSummaries: [
      { itemId: 'v1', title: 'Miles Davis Kind of Blue LP 180g', price: { value: '24.99', currency: 'EUR' }, image: { imageUrl: 'https://i.ebayimg.example/1.jpg' }, itemWebUrl: 'https://ebay.example/itm/1', condition: 'New' },
      { itemId: 'v2', title: 'Blue Note jazz record, original pressing', price: { value: '60', currency: 'EUR' }, image: { imageUrl: 'https://i.ebayimg.example/2.jpg' }, itemWebUrl: 'https://ebay.example/itm/2', condition: 'Pre-owned' },
      { itemId: 'v3', title: 'No photo', price: { value: '5', currency: 'EUR' } },
    ] });
  };
  const db2 = openDb(':memory:');
  seedSpots(db2);
  const app = createApp({ db: db2, venueFeed: null, artistLookup: null, feedProviders: [createEbay({ clientId: 'id', clientSecret: 'secret', marketplace: 'EBAY_IE', fetchImpl: ebayFetch, searches: [['jazz vinyl record', ['jazz', 'vinyl']], ['linen shirt', ['linen']]] })] });
  const s = app.listen(0);
  await new Promise((r) => s.once('listening', r));
  const url = `http://localhost:${s.address().port}/api`;
  const reg = await fetch(`${url}/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'shopper', password: 'password123' }) });
  const cookie = reg.headers.get('set-cookie').split(';')[0];
  await fetch(`${url}/saves`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ title: 'Late night jazz bar' }) });
  const d = await (await fetch(`${url}/next?city=Dublin`, { headers: { cookie } })).json();
  assert.ok(d.products.length > 0 && d.products.every((x) => !x.spot.is_demo), 'live products replace the samples');
  const lp = d.products.find((x) => x.spot.title.startsWith('Miles Davis'));
  assert.deepEqual([lp.spot.price, lp.spot.venue, lp.spot.city, lp.spot.credit], ['€25', 'On eBay', null, 'Listed on eBay']);
  assert.ok(d.products.find((x) => x.spot.external_id === 'v2').spot.tags.includes('vintage'), 'secondhand reads as vintage');
  assert.ok(!d.products.some((x) => x.spot.external_id === 'v3'), 'no photo, no card');
  assert.equal(d.live.find((f) => f.provider === 'ebay').count, 2);
  // Another city uses the same fetch: things ship.
  seen.length = 0;
  const l = await (await fetch(`${url}/next?city=London`, { headers: { cookie } })).json();
  assert.equal(seen.length, 0);
  assert.ok(l.products.some((x) => x.spot.source === 'ebay'));
  s.close();
});

test('live feeds: OpenStreetMap places with no key, any city, linked to their own websites', async () => {
  const { createOsm } = await import('../server/providers/osm.js');
  const asked = [];
  const osmFetch = async (url, opts = {}) => {
    const u = new URL(url);
    asked.push(u.host);
    assert.match(opts.headers['User-Agent'], /^Tastemate\//, 'OpenStreetMap asks apps to say who they are');
    if (u.host === 'nominatim.openstreetmap.org') return json([{ lat: '41.3874', lon: '2.1686' }]);
    const query = new URLSearchParams(opts.body).get('data');
    assert.match(query, /around:4000,41\.3874,2\.1686/);
    return json({ elements: [
      { type: 'node', id: 1, lat: 41.38, lon: 2.17, tags: { amenity: 'cafe', name: 'Satan’s Coffee Corner', website: 'https://satanscoffee.example', opening_hours: 'Mo-Su 08:00-18:00' } },
      { type: 'node', id: 2, lat: 41.39, lon: 2.16, tags: { amenity: 'restaurant', cuisine: 'japanese;ramen', name: 'Ramen-ya Hiro' } },
      { type: 'way', id: 3, center: { lat: 41.385, lon: 2.18 }, tags: { tourism: 'museum', name: 'Museu Picasso', wikidata: 'Q1', website: 'https://museupicasso.example' } },
      { type: 'node', id: 4, lat: 41.38, lon: 2.17, tags: { shop: 'music', name: 'Discos Revolver', 'addr:street': 'Carrer dels Tallers' } },
      { type: 'node', id: 5, lat: 41.38, lon: 2.17, tags: { amenity: 'restaurant', name: 'No cuisine listed' } },
      { type: 'node', id: 6, lat: 41.38, lon: 2.17, tags: { amenity: 'cafe' } },
    ] });
  };
  const rows = await createOsm({ fetchImpl: osmFetch }).fetchCity('Barcelona');
  assert.deepEqual(asked, ['nominatim.openstreetmap.org', 'overpass-api.de']);
  const by = Object.fromEntries(rows.map((r) => [r.title, r]));
  assert.deepEqual(Object.keys(by).sort(), ['Discos Revolver', 'Museu Picasso', 'Ramen-ya Hiro', 'Satan’s Coffee Corner'], 'named places only; restaurants need a cuisine');
  assert.ok(by['Satan’s Coffee Corner'].tags.includes('coffee'));
  assert.equal(by['Satan’s Coffee Corner'].url, 'https://satanscoffee.example');
  assert.ok(by['Ramen-ya Hiro'].tags.includes('noodles') && by['Ramen-ya Hiro'].tags.includes('japanese'));
  assert.equal(by['Ramen-ya Hiro'].url, 'https://www.openstreetmap.org/node/2', 'no website: the map page');
  assert.equal(by['Museu Picasso'].lat, 41.385, 'ways use their centre');
  assert.equal(by['Museu Picasso'].popularity, 0.8, 'a landmark, not a find');
  assert.ok(by['Discos Revolver'].tags.includes('vinyl'));
  assert.equal(by['Discos Revolver'].venue, 'Carrer dels Tallers');
  assert.equal(by['Discos Revolver'].credit, 'Map data © OpenStreetMap contributors');
  assert.equal(createOsm({ enabled: false }), null);
});
