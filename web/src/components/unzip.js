// Read files out of a ZIP in the browser, so people can upload the whole
// download Instagram, Spotify or Google sends them instead of digging out
// one file. Reads only the directory and the files asked for (File.slice is
// lazy), so a big archive with photos in it is fine.

const u16 = (v, o) => v.getUint16(o, true);
const u32 = (v, o) => v.getUint32(o, true);
const view = async (file, start, end) => new DataView(await file.slice(start, end).arrayBuffer());

/** The archive's entries: [{ name, method, size, offset }]. */
async function entries(file) {
  // The end-of-directory record sits in the last 64 KB (after an optional comment).
  const tailStart = Math.max(0, file.size - 65557);
  const tail = await view(file, tailStart, file.size);
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) if (u32(tail, i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('That doesn’t look like a ZIP file.');
  const count = u16(tail, eocd + 10);
  const dirSize = u32(tail, eocd + 12);
  const dirOffset = u32(tail, eocd + 16);
  if (dirOffset === 0xffffffff) throw new Error('That archive is too big to read here. Download your information again with only “Saved” chosen (JSON).');
  const dir = await view(file, dirOffset, dirOffset + dirSize);
  const names = new TextDecoder();
  const out = [];
  for (let p = 0, i = 0; i < count && u32(dir, p) === 0x02014b50; i++) {
    const nameLen = u16(dir, p + 28);
    out.push({
      method: u16(dir, p + 10),
      size: u32(dir, p + 20),
      offset: u32(dir, p + 42),
      name: names.decode(new Uint8Array(dir.buffer, dir.byteOffset + p + 46, nameLen)),
    });
    p += 46 + nameLen + u16(dir, p + 30) + u16(dir, p + 32);
  }
  return out;
}

async function read(file, e) {
  const head = await view(file, e.offset, e.offset + 30);
  const start = e.offset + 30 + u16(head, 26) + u16(head, 28);
  const data = file.slice(start, start + e.size);
  if (e.method === 0) return data.text();
  if (e.method !== 8) throw new Error(`Can’t unpack ${e.name}.`);
  return new Response(data.stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
}

/** The text of every file whose path matches one of the patterns: [{ name, text }]. */
export async function readFromZip(file, patterns) {
  const want = (await entries(file)).filter((e) => !e.name.endsWith('/') && patterns.some((re) => re.test(e.name)));
  return Promise.all(want.map(async (e) => ({ name: e.name.split('/').pop(), text: await read(file, e) })));
}

export const isZip = (file) => /\.zip$/i.test(file.name) || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
