import { HttpError, intParam } from '../http.js';
import { requireUser } from '../auth.js';
import { friendIds, hydrateSave } from '../db.js';
import { cosine, interpret, tasteProfile, toPercent } from '../taste-graph.js';
import { loadCreatorCache } from '../enrich.js';

// Friends are mutual and need an accept. They matter to the taste graph:
// a spot a friend saved shows up in Next with "Maya saved it".
export default function friendRoutes(r, { db }) {
  const profileOf = (userId) => tasteProfile(interpret(db.prepare('SELECT * FROM saves WHERE user_id = ?').all(userId).map(hydrateSave), { cache: loadCreatorCache(db) }));

  r.get('/friends', requireUser, (req, res) => {
    const me = req.user.id;
    const mine = profileOf(me);
    const ids = friendIds(db, me);
    const friends = ids
      .map((id) => db.prepare('SELECT id, username, display_name FROM users WHERE id = ?').get(id))
      .map((u) => ({ ...u, match: toPercent(Math.max(0, cosine(mine, profileOf(u.id)))) }))
      .sort((a, b) => b.match - a.match);
    const incoming = db
      .prepare(`SELECT u.id, u.username, u.display_name FROM friendships f JOIN users u ON u.id = f.requester_id WHERE f.addressee_id = ? AND f.status = 'pending'`)
      .all(me);
    const outgoing = db
      .prepare(`SELECT u.id, u.username, u.display_name FROM friendships f JOIN users u ON u.id = f.addressee_id WHERE f.requester_id = ? AND f.status = 'pending'`)
      .all(me);
    res.json({ friends, incoming, outgoing });
  });

  r.post('/friends/request', requireUser, (req, res) => {
    const target = db.prepare('SELECT * FROM users WHERE username = ?').get(String(req.body?.username || ''));
    if (!target) throw new HttpError(404, 'No user with that username');
    if (target.id === req.user.id) throw new HttpError(400, "You can't add yourself");
    const existing = db
      .prepare('SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)')
      .get(req.user.id, target.id, target.id, req.user.id);
    if (existing?.status === 'accepted') return res.json({ status: 'accepted' });
    if (existing && existing.requester_id === target.id) {
      // They already asked us, so accept it.
      db.prepare(`UPDATE friendships SET status = 'accepted' WHERE requester_id = ? AND addressee_id = ?`).run(target.id, req.user.id);
      return res.json({ status: 'accepted' });
    }
    if (!existing) db.prepare(`INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?,?, 'pending')`).run(req.user.id, target.id);
    res.status(201).json({ status: 'pending' });
  });

  r.post('/friends/:id/accept', requireUser, (req, res) => {
    const { changes } = db
      .prepare(`UPDATE friendships SET status = 'accepted' WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'`)
      .run(intParam(req.params.id), req.user.id);
    if (!changes) throw new HttpError(404, 'No pending request from that user');
    res.json({ status: 'accepted' });
  });

  // Unfriend, decline, or cancel a request.
  r.delete('/friends/:id', requireUser, (req, res) => {
    const other = intParam(req.params.id);
    db.prepare('DELETE FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)').run(req.user.id, other, other, req.user.id);
    res.json({ ok: true });
  });
}
