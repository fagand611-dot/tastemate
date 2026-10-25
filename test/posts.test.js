import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDates, findTime, parsePost } from '../server/posts.js';
import { createVenuePosts, parseVenueAccounts } from '../server/providers/venue-posts.js';

const now = new Date('2026-10-25T10:00:00Z'); // a Sunday
const cities = ['Dublin', 'Bangkok', 'London'];

test('parsePost: a typical venue post', () => {
  const d = parsePost("JAZZ & COMEDY NIGHT 🎷😂\nFri 14 Nov, doors 8pm at The Workman's Club, Dublin. Tickets €12 #jazz", { cities, now, url: 'https://instagram.com/p/x' });
  assert.equal(d.title, 'JAZZ & COMEDY NIGHT');
  assert.equal(d.starts_at, '2026-11-14T20:00');
  assert.equal(d.venue, "The Workman's Club");
  assert.equal(d.city, 'Dublin');
  assert.equal(d.price, '€12');
  assert.ok(d.tags.includes('jazz') && d.tags.includes('comedy'));
  assert.deepEqual(d.missing, []);
});

test('parsePost: pin emoji venue, tonight, free entry', () => {
  const d = parsePost('Vinyl-only listening session tonight\n📍 Studio Lam, Bangkok\n9.30pm, free entry', { cities, now });
  assert.equal(d.starts_at, '2026-10-25T21:30');
  assert.equal(d.venue, 'Studio Lam');
  assert.equal(d.price, 'Free');
});

test('parsePost: says what it could not find', () => {
  const d = parsePost('Something happening soon!', { cities, now });
  assert.deepEqual(d.missing.sort(), ['city', 'starts_at', 'tags', 'venue']);
});

test('findDates: formats, ranges, relative days and year rollover', () => {
  assert.deepEqual(findDates('14–16 November', now), { start: '2026-11-14', end: '2026-11-16' });
  assert.deepEqual(findDates('November 3rd, 2027', now), { start: '2027-11-03' });
  assert.deepEqual(findDates('Jan 9', now), { start: '2027-01-09' }, 'a date already past means next year');
  assert.deepEqual(findDates('2/3', now), { start: '2027-03-02' }, 'day first');
  assert.deepEqual(findDates('2026-12-01', now), { start: '2026-12-01' });
  assert.deepEqual(findDates('tomorrow', now), { start: '2026-10-26' });
  assert.deepEqual(findDates('this Saturday', now), { start: '2026-10-31' });
  assert.deepEqual(findDates('no date here', now), {});
  assert.equal(findTime('doors 7pm'), '19:00');
  assert.equal(findTime('12am'), '00:00');
  assert.equal(findTime('20:15 start'), '20:15');
});

test('venue feed: off without config, reads Business Discovery captions', async () => {
  assert.equal(createVenuePosts({ igUserId: '', accessToken: '', venues: [] }), null);
  assert.deepEqual(parseVenueAccounts('Dublin:workmansclub, @studiolam ,bad name!'), [
    { city: 'Dublin', username: 'workmansclub' },
    { city: null, username: 'studiolam' },
  ]);
  const calls = [];
  const feed = createVenuePosts({
    igUserId: '123',
    accessToken: 'tok',
    venues: parseVenueAccounts('Dublin:workmansclub,Dublin:broken'),
    fetchImpl: async (url) => {
      calls.push(String(url));
      if (String(url).includes('broken')) return { ok: false, status: 400, json: async () => ({}) };
      return {
        ok: true,
        status: 200,
        json: async () => ({ business_discovery: { name: "The Workman's Club", media: { data: [{ caption: 'Jazz night Fri 14 Nov 8pm', permalink: 'https://instagram.com/p/1', timestamp: '2026-10-20T10:00:00+0000' }, { permalink: 'https://instagram.com/p/2' }] } } }),
      };
    },
  });
  const { posts, errors } = await feed.fetchPosts();
  assert.equal(posts.length, 1, 'posts without captions are skipped');
  assert.deepEqual([posts[0].venue, posts[0].city, posts[0].url], ["The Workman's Club", 'Dublin', 'https://instagram.com/p/1']);
  assert.deepEqual(errors, [{ account: 'broken', error: 'HTTP 400' }]);
  assert.ok(calls[0].includes('business_discovery.username(workmansclub)'));
});
