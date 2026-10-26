import { test } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { isZip, readFromZip } from '../web/src/components/unzip.js';

/** A minimal ZIP: [name, text, deflate?] → File. */
function makeZip(files) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const [name, text, deflate] of files) {
    const raw = Buffer.from(text);
    const data = deflate ? zlib.deflateRawSync(raw) : raw;
    const n = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(deflate ? 8 : 0, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(n.length, 26);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(deflate ? 8 : 0, 10);
    dir.writeUInt32LE(data.length, 20);
    dir.writeUInt32LE(raw.length, 24);
    dir.writeUInt16LE(n.length, 28);
    dir.writeUInt32LE(offset, 42);
    locals.push(local, n, data);
    central.push(dir, n);
    offset += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return new File([Buffer.concat([...locals, cd, end])], 'instagram-dee.zip', { type: 'application/zip' });
}

test('readFromZip: finds the saves files in a whole download, stored or compressed', async () => {
  const zip = makeZip([
    ['your_instagram_activity/', '', false],
    ['your_instagram_activity/saved/saved_collections.json', JSON.stringify({ saved_saved_collections: [] }), true],
    ['your_instagram_activity/saved/saved_posts.json', '{"saved_saved_media":[]}', false],
    ['media/posts/photo.jpg', 'x'.repeat(5000), true],
  ]);
  assert.ok(isZip(zip));
  const found = await readFromZip(zip, [/saved_collections\.json$/, /saved_posts\.json$/]);
  assert.deepEqual(found.map((f) => f.name), ['saved_collections.json', 'saved_posts.json']);
  assert.deepEqual(JSON.parse(found[0].text), { saved_saved_collections: [] });
  assert.deepEqual(await readFromZip(zip, [/YourLibrary\.json$/]), []);
  await assert.rejects(readFromZip(new File(['not a zip'], 'x.zip'), [/./]), /doesn’t look like a ZIP/);
});
