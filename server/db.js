import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// See DESIGN.md §6. A save is anything kept in another app; a spot is a
// real-world event, place or product that saves can point to.
const SCHEMA = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  home_city TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS friendships (
  requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending','accepted')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE TABLE IF NOT EXISTS spots (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('event','place','product')),
  title TEXT NOT NULL,
  city TEXT,
  venue TEXT,
  creators TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  description TEXT,
  starts_at TEXT,
  ends_at TEXT,
  opened_at TEXT,
  price TEXT,
  url TEXT,
  popularity REAL NOT NULL DEFAULT 0.5,
  source TEXT NOT NULL DEFAULT 'local',
  external_id TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  -- Who added it from a post (null for curated and feed spots). Their
  -- spots are shown to them and their friends only.
  added_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (source, external_id)
);
CREATE INDEX IF NOT EXISTS spots_city ON spots(city);

CREATE TABLE IF NOT EXISTS saves (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('song','place','look','product','art','food','event','other')),
  title TEXT NOT NULL,
  creator TEXT,
  source TEXT NOT NULL CHECK (source IN ('spotify','instagram','google_maps','pinterest','manual','tastemate')),
  collection TEXT,
  url TEXT,
  note TEXT,
  city TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  spot_id INTEGER REFERENCES spots(id) ON DELETE SET NULL,
  external_key TEXT,
  saved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, source, external_key)
);
CREATE INDEX IF NOT EXISTS saves_user ON saves(user_id);
CREATE INDEX IF NOT EXISTS saves_spot ON saves(spot_id);

CREATE TABLE IF NOT EXISTS spot_dismissals (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spot_id INTEGER NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, spot_id)
);
`;

export function openDb(file = process.env.DB_FILE || 'data/tastemate.db') {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  return db;
}

/** Run fn inside a transaction. */
export function tx(db, fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** Parse a saves or spots row's JSON columns. */
export function hydrateSave(row) {
  return row && { ...row, tags: JSON.parse(row.tags || '[]') };
}

export function hydrateSpot(row) {
  return row && { ...row, tags: JSON.parse(row.tags || '[]'), creators: JSON.parse(row.creators || '[]'), is_demo: !!row.is_demo };
}

/** Insert a spot (or return the existing one with the same source/external_id). */
export function upsertSpot(db, s) {
  const existing = s.external_id && db.prepare('SELECT * FROM spots WHERE source = ? AND external_id = ?').get(s.source ?? 'local', String(s.external_id));
  if (existing) return hydrateSpot(existing);
  const r = db
    .prepare(
      `INSERT INTO spots (kind, title, city, venue, creators, tags, description, starts_at, ends_at, opened_at,
                          price, url, popularity, source, external_id, is_demo, added_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      s.kind, s.title, s.city ?? null, s.venue ?? null,
      JSON.stringify(s.creators ?? []), JSON.stringify(s.tags ?? []), s.description ?? null,
      s.starts_at ?? null, s.ends_at ?? null, s.opened_at ?? null, s.price ?? null, s.url ?? null,
      s.popularity ?? 0.5, s.source ?? 'local', s.external_id != null ? String(s.external_id) : null, s.is_demo ? 1 : 0,
      s.added_by ?? null
    );
  return hydrateSpot(db.prepare('SELECT * FROM spots WHERE id = ?').get(r.lastInsertRowid));
}

/** Ids of the user's accepted friends. */
export function friendIds(db, userId) {
  return db
    .prepare(
      `SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END AS id
         FROM friendships WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)`
    )
    .all(userId, userId, userId)
    .map((r) => r.id);
}
