import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OCCASIONS, inviteStyle, moodboard, palette, planOccasion, themeName } from '../server/occasions.js';
import { findPatterns, interpret, tasteProfile } from '../server/taste-graph.js';

const save = (id, kind, source, tags, extra = {}) => ({ id, kind, source, title: `s${id}`, tags, ...extra });
const SAVES = interpret([
  save(1, 'song', 'spotify', ['jazz', 'chill', 'cerebral'], { title: 'So What', creator: 'Miles Davis' }),
  save(2, 'song', 'spotify', ['jazz', 'chill', 'cerebral'], { title: 'Blue in Green', creator: 'Bill Evans' }),
  save(3, 'place', 'google_maps', ['jazz', 'intimate', 'vinyl'], { title: 'Listening bar' }),
  save(4, 'place', 'google_maps', ['wine bar', 'intimate', 'moody'], { title: 'Candlelit wine bar' }),
  save(5, 'look', 'instagram', ['dark academia', 'moody', 'vintage'], { title: '@tweed' }),
  save(6, 'food', 'instagram', ['pastry', 'food'], { title: '@croissants' }),
]);

test('themeName: adjectives first, the thing last', () => {
  assert.equal(themeName(['jazz', 'chill'], OCCASIONS.party), 'Slow jazz party');
  assert.equal(themeName(['moody', 'cozy'], OCCASIONS.dinner), 'Candlelit cosy supper');
  assert.equal(themeName(['unknown-tag'], OCCASIONS.brunch), 'Easy brunch');
});

test('palette and invite: readable text on the theme colour', () => {
  assert.equal(palette(['jazz']).length, 3);
  const inv = inviteStyle(['jazz', 'moody'], OCCASIONS.date, 'Jazz evening', []);
  assert.equal(inv.motif, 'record');
  assert.equal(inv.colors.bg, '#2a1f1d', 'the darkest theme colour');
  assert.ok(['#f6f1e7', '#1a1a1a'].includes(inv.colors.ink));
  assert.equal(inviteStyle(['minimal'], OCCASIONS.dinner, 'x', []).type, 'sans');
});

test('planOccasion: a dinner themed on jazz pulls matching drinks, food, music and saves', () => {
  const clusters = findPatterns(SAVES, { minSaves: 2 });
  const plan = planOccasion({ type: 'dinner', clusters, profile: tasteProfile(SAVES), saves: SAVES, shop: [
    { id: 1, kind: 'product', title: 'Natural wine shop', tags: ['wine bar', 'intimate'] },
    { id: 2, kind: 'product', title: 'Sneakers', tags: ['streetwear'] },
  ] });
  assert.equal(plan.occasion.type, 'dinner');
  assert.ok(plan.themes.length >= 1);
  assert.ok(plan.theme.name.endsWith('supper'));
  assert.equal(plan.drinks.wine.length, 3);
  assert.equal(plan.drinks.cocktails.length, 2);
  assert.equal(plan.food.main.length, 1);
  assert.ok(plan.drinks.wine.every((w) => typeof w.note === 'string'));
  assert.ok(plan.playlist.fromSaves.some((s) => s.title === 'So What'), 'your own jazz saves make the playlist');
  assert.ok(!plan.playlist.more.some((s) => s.title === 'So What'));
  assert.deepEqual(plan.shop.map((s) => s.title), ['Natural wine shop']);
  assert.ok(plan.moodboard.length >= 3);
  assert.ok(new Set(plan.moodboard.map((m) => m.kind)).size >= 2, 'the board mixes kinds');
});

test('planOccasion: picking a theme, unknown occasion, and no clusters at all', () => {
  const clusters = findPatterns(SAVES, { minSaves: 2 });
  const last = clusters.length - 1;
  assert.equal(planOccasion({ type: 'party', clusters, theme: last, profile: new Map(), saves: SAVES }).theme.index, last);
  assert.equal(planOccasion({ type: 'rave-in-space', clusters, profile: new Map(), saves: SAVES }).occasion.type, 'dinner');
  const empty = planOccasion({ type: 'brunch', clusters: [], profile: new Map(), saves: [] });
  assert.equal(empty.theme.index, null);
  assert.ok(empty.theme.name.endsWith('brunch'));
  assert.deepEqual(moodboard([], ['jazz']), []);
});

test('planOccasion: the whole evening (running order, scene, games, guests and a countdown)', () => {
  const clusters = findPatterns(SAVES, { minSaves: 2 });
  const maya = { id: 7, name: 'Maya', title: 'The Café Wanderer', profile: new Map([['pastry', 1], ['coffee', 0.8]]) };
  const plan = planOccasion({ type: 'dinner', clusters, profile: tasteProfile(SAVES), saves: SAVES, guests: [maya] });
  assert.ok(plan.run.length >= 4 && plan.run.every((r) => r.time && r.what));
  assert.ok(plan.run.some((r) => r.what === plan.food.main[0].name), 'the running order uses the plan’s own picks');
  assert.deepEqual(plan.scene.map((x) => x.area), ['light', 'scent', 'table', 'sound']);
  assert.ok(plan.scene.every((x) => x.name));
  assert.equal(plan.games.length, 3);
  assert.equal(plan.guests[0].name, 'Maya');
  assert.equal(plan.guests[0].sample, false);
  assert.match(plan.guests[0].bring, /pastr|dessert/, 'guests bring something that suits their taste');
  assert.ok(plan.guests.slice(1).every((g) => g.sample), 'sample guests fill the rest, marked');
  assert.equal(new Set(plan.guests.map((g) => g.bring)).size, plan.guests.length, 'nobody brings the same thing');
  assert.ok(plan.prep.length >= 4 && plan.prep.every((p) => p.tasks.length));
  assert.equal(plan.numbers.find((n) => n.label === 'records').n, plan.playlist.fromSaves.length + plan.playlist.more.length);
  assert.equal(planOccasion({ type: 'date', clusters, profile: new Map(), saves: SAVES }).guests.length, 1);
});
