import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tasteCollage } from '../server/collage.js';
import { interpret, tasteProfile } from '../server/taste-graph.js';

const save = (id, kind, title, tags, extra = {}) => ({ id, kind, source: 'manual', title, tags, ...extra });

test('tasteCollage: a bag and a room from your saves, labelled from real saves of the right kind', () => {
  const saves = interpret([
    save(1, 'song', 'So What', ['jazz', 'vinyl', 'chill'], { creator: 'Miles Davis' }),
    save(2, 'song', 'Blue in Green', ['jazz', 'cerebral'], { creator: 'Bill Evans' }),
    save(3, 'place', 'Laminated bakery', ['pastry', 'coffee']),
    save(4, 'place', '@croissantdiaries', ['pastry']),
    save(5, 'place', 'Candlelit wine bar', ['wine bar', 'moody', 'intimate']),
    save(6, 'book', 'The Secret History', ['books', 'dark academia']),
  ]);
  const c = tasteCollage(saves, tasteProfile(saves), { city: 'Dublin', nightOwl: 0.8 });
  const bag = Object.fromEntries(c.bag.map((x) => [x.obj, x.caption]));
  const room = Object.fromEntries(c.room.map((x) => [x.obj, x.caption]));
  assert.equal(bag.book, 'The Secret History');
  assert.match(bag.headphones, /on repeat$/);
  assert.ok([bag.coffee, bag.croissant].some((x) => x.endsWith('from Laminated bakery')));
  assert.ok(![...c.bag, ...c.room].some((x) => x.caption.includes('@')), 'never an @handle in a sentence');
  assert.equal(bag.keys, 'keys, with a Dublin keyring');
  assert.match(room.turntable, /on the turntable$/);
  assert.ok([...c.bag, ...c.room].some((x) => x.caption.includes('Candlelit wine bar')));
  assert.ok(!c.bag.some((x) => x.obj === 'turntable') && !c.room.some((x) => x.obj === 'headphones'), 'things go where they belong');
  const used = [...c.bag, ...c.room].map((x) => x.from).filter(Boolean);
  assert.equal(new Set(used).size, used.length, 'each save labels one thing');
  assert.deepEqual(c.window, { city: 'Dublin', night: true });
  assert.match(c.reflection.room, /^A room for late nights/);
  assert.match(c.reflection.bag, /^Never leaves the house without/);
  assert.equal(tasteCollage([], new Map()), null);
});
