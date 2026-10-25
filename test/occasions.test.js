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
