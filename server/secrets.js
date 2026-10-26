// Sealing connected apps' tokens before they go in the database: AES-256-GCM
// with a key from TOKEN_KEY (32 bytes, base64 or hex). Without one, a key is
// made once and kept in a file beside the database (data/token.key), so a
// copied database alone doesn't hand out anyone's Spotify or Instagram.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function parseKey(k) {
  const buf = /^[0-9a-f]{64}$/i.test(k) ? Buffer.from(k, 'hex') : Buffer.from(k, 'base64');
  if (buf.length !== 32) throw new Error('TOKEN_KEY must be 32 bytes (64 hex characters, or base64)');
  return buf;
}

/** The key: TOKEN_KEY, or the key file next to the database (made if missing), or a throwaway one in memory. */
export function loadTokenKey(dbFile = process.env.DB_FILE || 'data/tastemate.db', env = process.env.TOKEN_KEY) {
  if (env) return parseKey(env.trim());
  if (dbFile === ':memory:') return crypto.randomBytes(32);
  const file = path.join(path.dirname(dbFile), 'token.key');
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  return parseKey(fs.readFileSync(file, 'utf8').trim());
}

export function createSealer(key) {
  return {
    seal(text) {
      if (text == null) return null;
      const iv = crypto.randomBytes(12);
      const c = crypto.createCipheriv('aes-256-gcm', key, iv);
      const body = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);
      return `v1.${iv.toString('base64')}.${c.getAuthTag().toString('base64')}.${body.toString('base64')}`;
    },
    open(sealed) {
      if (sealed == null) return null;
      const [v, iv, tag, body] = String(sealed).split('.');
      if (v !== 'v1') throw new Error('Unknown token format');
      const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
      d.setAuthTag(Buffer.from(tag, 'base64'));
      return Buffer.concat([d.update(Buffer.from(body, 'base64')), d.final()]).toString('utf8');
    },
  };
}
