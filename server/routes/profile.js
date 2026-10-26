import { HttpError, intParam } from '../http.js';
import { requireUser } from '../auth.js';

// Profile photos: small images the browser has already resized, stored as a
// data URL and served back as an image.
const MAX_BYTES = 300 * 1024;
const DATA_URL = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;

export default function profileRoutes(r, { db }) {
  r.put('/me/avatar', requireUser, (req, res) => {
    const m = DATA_URL.exec(String(req.body?.image || ''));
    if (!m) throw new HttpError(400, 'Send a PNG, JPEG or WebP image');
    if (Buffer.byteLength(m[2], 'base64') > MAX_BYTES) throw new HttpError(413, 'That photo is too big (300 KB at most)');
    db.prepare("UPDATE users SET avatar = ?, avatar_at = datetime('now') WHERE id = ?").run(m[0], req.user.id);
    res.json({ avatar_url: avatarUrl(db, req.user.id) });
  });

  r.delete('/me/avatar', requireUser, (req, res) => {
    db.prepare('UPDATE users SET avatar = NULL, avatar_at = NULL WHERE id = ?').run(req.user.id);
    res.json({ avatar_url: null });
  });

  r.get('/users/:id/avatar', (req, res) => {
    const u = db.prepare('SELECT avatar FROM users WHERE id = ?').get(intParam(req.params.id));
    const m = u?.avatar && DATA_URL.exec(u.avatar);
    if (!m) throw new HttpError(404, 'No photo');
    res.set('Cache-Control', 'public, max-age=86400');
    res.type(`image/${m[1]}`).send(Buffer.from(m[2], 'base64'));
  });
}

/** Where a user's photo is served, versioned so a new photo isn't cached away. */
export function avatarUrl(db, id) {
  const u = db.prepare('SELECT avatar_at FROM users WHERE id = ? AND avatar IS NOT NULL').get(id);
  return u ? `/api/users/${id}/avatar?v=${encodeURIComponent(u.avatar_at)}` : null;
}
