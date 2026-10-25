import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createArtistLookup, soundsFromTags } from '../server/providers/musicbrainz.js';

test('soundsFromTags keeps sounds we know, strongest first', () => {
  assert.deepEqual(soundsFromTags([{ name: 'british', count: 9 }, { name: 'neo soul', count: 5 }, { name: 'jazz', count: 7 }, { name: 'soul', count: 1 }]), ['jazz', 'neo-soul', 'soul']);
});

test('lookup: confident matches only; bands get an era, people do not', async () => {
  assert.equal(createArtistLookup({ enabled: false }), null);
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push([String(url), opts.headers['User-Agent']]);
    const q = decodeURIComponent(String(url));
    const artists = q.includes('Some Band')
      ? [{ name: 'Some Band', score: 100, type: 'Group', 'life-span': { begin: '2013-04' }, 'begin-area': { name: 'Bristol' }, tags: [{ name: 'trip hop', count: 3 }] }]
      : q.includes('A Singer')
        ? [{ name: 'A Singer', score: 98, type: 'Person', 'life-span': { begin: '1999' }, area: { name: 'United Kingdom' }, tags: [] }]
        : [{ name: 'Someone Else', score: 60 }];
    return { ok: true, status: 200, json: async () => ({ artists }) };
  };
  const lookup = createArtistLookup({ fetchImpl, userAgent: 'Test/1' });
  assert.deepEqual(await lookup('Some Band'), { role: 'band', sounds: ['trip-hop'], moods: [], from: 'Bristol', era: '2010s' });
  assert.equal((await lookup('A Singer')).era, null, 'a birth year is not an era');
  assert.equal(await lookup('Nobody'), null);
  assert.equal(calls[0][1], 'Test/1');
  const failing = createArtistLookup({ fetchImpl: async () => ({ ok: false, status: 503 }) });
  await assert.rejects(failing('X'), /503/);
});
