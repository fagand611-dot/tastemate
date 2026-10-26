import crypto from 'node:crypto';
import { HttpError } from '../http.js';
import { requireUser } from '../auth.js';
import { avatarUrl } from './profile.js';

// Digital invitations from Host: the host makes a link, sends it on
// WhatsApp, Instagram, email or text, and guests open it (no account
// needed) and say yes, maybe or can't make it. The host sees who's coming.

const HEX = /^#[0-9a-f]{6}$/i;
const TYPES = ['serif', 'serif-italic', 'sans', 'display'];
const MOTIFS = ['record', 'candle', 'grid', 'sun', 'arc'];
const MAX_RSVPS = 300;
const text = (v, n) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);
const list = (v, n, len) => (Array.isArray(v) ? v.map((x) => text(x, len)).filter(Boolean).slice(0, n) : []);

/** Only the fields an invite shows, each checked, so a link can't carry anything else. */
function cleanPayload(b = {}) {
  const colors = b.colors || {};
  const p = {
    occasion: text(b.occasion, 40),
    headline: text(b.headline, 80),
    line: text(b.line, 80),
    when: text(b.when, 80),
    where: text(b.where, 120),
    dress: text(b.dress, 120),
    type: TYPES.includes(b.type) ? b.type : 'serif',
    motif: MOTIFS.includes(b.motif) ? b.motif : 'arc',
    colors: { bg: HEX.test(colors.bg) ? colors.bg : '#2b1d22', ink: HEX.test(colors.ink) ? colors.ink : '#f6f1e7', accent: HEX.test(colors.accent) ? colors.accent : '#e3a92a' },
    palette: (Array.isArray(b.palette) ? b.palette : []).filter((c) => HEX.test(c)).slice(0, 5),
    records: list(b.records, 3, 80),
    menu: list(b.menu, 5, 80),
  };
  if (!p.headline) throw new HttpError(400, 'The invite needs a headline');
  return p;
}

export default function inviteRoutes(r, { db }) {
  const byToken = (token) => db.prepare('SELECT * FROM invites WHERE token = ?').get(String(token));
  const answers = (inviteId) => db.prepare('SELECT name, answer, note, created_at FROM rsvps WHERE invite_id = ? ORDER BY created_at').all(inviteId);
  const mine = (req) => {
    const inv = byToken(req.params.token);
    if (!inv || inv.user_id !== req.user.id) throw new HttpError(404, 'No such invite');
    return inv;
  };

  r.post('/invites', requireUser, (req, res) => {
    const token = crypto.randomBytes(9).toString('base64url');
    db.prepare('INSERT INTO invites (token, user_id, payload) VALUES (?,?,?)').run(token, req.user.id, JSON.stringify(cleanPayload(req.body)));
    res.status(201).json({ token });
  });

  // The host changes the details after sending: the same link shows the new ones.
  r.put('/invites/:token', requireUser, (req, res) => {
    const inv = mine(req);
    db.prepare("UPDATE invites SET payload = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(cleanPayload(req.body)), inv.id);
    res.json({ token: inv.token });
  });

  r.get('/invites', requireUser, (req, res) => {
    const rows = db.prepare('SELECT * FROM invites WHERE user_id = ? ORDER BY id DESC LIMIT 20').all(req.user.id);
    res.json({ invites: rows.map((i) => ({ token: i.token, created_at: i.created_at, ...JSON.parse(i.payload), rsvps: answers(i.id) })) });
  });

  r.delete('/invites/:token', requireUser, (req, res) => {
    db.prepare('DELETE FROM invites WHERE id = ?').run(mine(req).id);
    res.json({ ok: true });
  });

  // Public: what a guest sees. First names only, and notes stay with the host.
  r.get('/invites/:token', (req, res) => {
    const inv = byToken(req.params.token);
    if (!inv) throw new HttpError(404, 'This invite isn’t there any more');
    const host = db.prepare('SELECT id, display_name FROM users WHERE id = ?').get(inv.user_id);
    const all = answers(inv.id);
    const isHost = req.user?.id === inv.user_id;
    res.json({
      invite: JSON.parse(inv.payload),
      host: { name: host.display_name, avatar_url: avatarUrl(db, host.id) },
      isHost,
      going: all.filter((a) => a.answer === 'yes').map((a) => a.name.split(/\s+/)[0]),
      counts: { yes: all.filter((a) => a.answer === 'yes').length, maybe: all.filter((a) => a.answer === 'maybe').length, no: all.filter((a) => a.answer === 'no').length },
      ...(isHost ? { rsvps: all } : {}),
    });
  });

  // Public: a guest answers. Answering again under the same name changes the answer.
  r.post('/invites/:token/rsvp', (req, res) => {
    const inv = byToken(req.params.token);
    if (!inv) throw new HttpError(404, 'This invite isn’t there any more');
    const name = text(req.body?.name, 60);
    const answer = ['yes', 'maybe', 'no'].includes(req.body?.answer) ? req.body.answer : null;
    if (!name || !answer) throw new HttpError(400, 'Add your name and an answer');
    const existing = db.prepare('SELECT id FROM rsvps WHERE invite_id = ? AND lower(name) = lower(?)').get(inv.id, name);
    if (existing) db.prepare('UPDATE rsvps SET answer = ?, note = ? WHERE id = ?').run(answer, text(req.body.note, 200), existing.id);
    else {
      if (db.prepare('SELECT COUNT(*) AS n FROM rsvps WHERE invite_id = ?').get(inv.id).n >= MAX_RSVPS) throw new HttpError(429, 'This invite has all the answers it can take');
      db.prepare('INSERT INTO rsvps (invite_id, name, answer, note) VALUES (?,?,?,?)').run(inv.id, name, answer, text(req.body.note, 200));
    }
    res.json({ ok: true, answer });
  });
}
