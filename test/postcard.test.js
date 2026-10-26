import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postcardNote } from '../web/src/components/postcardNote.js';

const reasons = [
  { type: 'saves', evidence: [{ tag: 'jazz', examples: ['So What'], sources: [{ label: 'Spotify', n: 3 }] }, { tag: 'moody', examples: ['Candlelit wine bar'], sources: [{ label: 'Google Maps', n: 2 }] }] },
  { type: 'friends', names: ['Maya'] },
  { type: 'gem' },
];

test('postcard note: varied across cards, the same for one card, never broken', () => {
  const notes = Array.from({ length: 40 }, (_, i) => postcardNote({ spot: { id: i, title: `Spot ${i}`, kind: ['event', 'place', 'product'][i % 3] }, reasons, name: 'Demo' }));
  const tagLines = new Set(notes.map((n) => n.lines[0]));
  assert.ok(tagLines.size >= 5, `the taste line comes in many versions (${tagLines.size})`);
  assert.ok(new Set(notes.map((n) => n.greeting)).size >= 3);
  assert.ok(new Set(notes.map((n) => n.signoff)).size >= 3);
  assert.ok(notes.filter((n) => n.lines[0].includes('very you')).length < 15, '“very you” is one version among many');
  for (const n of notes) {
    assert.ok(n.lines.every((l) => !/undefined|null|\$\{/.test(l)), n.lines.join(' / '));
    assert.equal(new Set(n.lines).size, n.lines.length, 'no line twice on one card');
    assert.ok(n.lines.some((l) => l.includes('Maya')));
  }
  const spot = { id: 7, title: 'Kissa jazz evening', kind: 'event' };
  assert.deepEqual(postcardNote({ spot, reasons, name: 'Demo' }), postcardNote({ spot, reasons, name: 'Demo' }), 'the same card says the same thing every time');
});

test('postcard note: talks about the kind of thing, and has something to say with no reasons', () => {
  const ev = postcardNote({ spot: { id: 1, title: 'A', kind: 'event' }, reasons: [], name: 'Demo' });
  assert.equal(ev.lines.length, 2, 'a hunch, and a nudge');
  assert.ok(['Tickets won’t hang around.', 'Bring someone who’d love it.', 'Clear the evening.'].includes(ev.lines[1]));
  const stretch = postcardNote({ spot: { id: 2, title: 'B', kind: 'place' }, reasons: [{ type: 'stretch', tags: ['folk'], why: 'your coffee saves hint at it' }], name: 'Demo' });
  assert.match(stretch.lines[0], /folk/);
});
