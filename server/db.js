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
  avatar TEXT,          -- a small profile photo, as a data URL
  avatar_at TEXT,
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
  lat REAL,
  lng REAL,
  image TEXT,           -- a photo of the place or thing, from its feed
  credit TEXT,          -- where it came from, shown on the card ("Tickets via Ticketmaster")
  fetched_at TEXT,      -- last time a live feed returned it
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

-- Artists looked up on MusicBrainz (facts is null when there was no match,
-- so they aren't looked up again).
CREATE TABLE IF NOT EXISTS creator_facts (
  name TEXT PRIMARY KEY,
  facts TEXT,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS spot_dismissals (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spot_id INTEGER NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, spot_id)
);

-- When each live feed last fetched each city (events, places).
CREATE TABLE IF NOT EXISTS feed_runs (
  city_key TEXT NOT NULL,
  provider TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,   -- ms since epoch
  ok INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  PRIMARY KEY (city_key, provider)
);

-- Digital invitations: a link guests open (no account needed) and answer.
CREATE TABLE IF NOT EXISTS invites (
  id INTEGER PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payload TEXT NOT NULL,         -- JSON: headline, line, when, where, dress, colours, motif, type, palette, records, menu
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS rsvps (
  id INTEGER PRIMARY KEY,
  invite_id INTEGER NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  answer TEXT NOT NULL CHECK (answer IN ('yes', 'maybe', 'no')),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (invite_id, name)
);

-- Apps a person has connected (Spotify, Instagram). Tokens are sealed with
-- AES-GCM (server/secrets.js) and never leave the server.
CREATE TABLE IF NOT EXISTS connections (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  account_id TEXT,
  account_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at INTEGER,            -- ms since epoch
  scope TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at TEXT,
  last_added INTEGER,
  last_error TEXT,
  PRIMARY KEY (user_id, provider)
);

-- A sign-in in progress: the state sent to the app and checked on the way back.
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  return_to TEXT,
  created_at INTEGER NOT NULL    -- ms since epoch
);
`;

export function openDb(file = process.env.DB_FILE || 'data/tastemate.db') {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

/**
 * Bring a database made by an earlier version up to this schema. CREATE TABLE
 * IF NOT EXISTS leaves existing tables alone, so columns added since have to
 * be added here.
 */
function migrate(db) {
  const has = (table, col) => db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);
  if (!has('users', 'home_city')) {
    db.exec('ALTER TABLE users ADD COLUMN home_city TEXT');
    // Earlier versions kept it in a separate table.
    if (db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'user_settings'`).get()) {
      db.exec('UPDATE users SET home_city = (SELECT home_city FROM user_settings WHERE user_settings.user_id = users.id)');
    }
  }
  if (!has('spots', 'added_by')) db.exec('ALTER TABLE spots ADD COLUMN added_by INTEGER REFERENCES users(id) ON DELETE CASCADE');
  if (!has('spots', 'lat')) db.exec('ALTER TABLE spots ADD COLUMN lat REAL; ALTER TABLE spots ADD COLUMN lng REAL');
  if (!has('spots', 'image')) db.exec('ALTER TABLE spots ADD COLUMN image TEXT');
  if (!has('spots', 'credit')) db.exec('ALTER TABLE spots ADD COLUMN credit TEXT; ALTER TABLE spots ADD COLUMN fetched_at TEXT');
  if (!has('users', 'avatar')) db.exec('ALTER TABLE users ADD COLUMN avatar TEXT; ALTER TABLE users ADD COLUMN avatar_at TEXT');
  clearCsvJunk(db);
}

// Before Spotify CSVs were understood, each line of one became a "song" whose
// title (or artist, where the line had a " - " in it) was the raw CSV line,
// and those artists were queued for lookup. Real titles and artist names
// never contain a Spotify URI or link, so those rows are safe to remove.
const CSV_JUNK = ['%spotify:track:%', '%spotify:playlist:%', '%spotify:album:%', '%open.spotify.com/%', 'category,title,%', 'playlist_name,playlist_url%', 'liked_song,%'];

function clearCsvJunk(db) {
  const where = (col) => CSV_JUNK.map(() => `${col} LIKE ?`).join(' OR ');
  db.prepare(`DELETE FROM saves WHERE source = 'spotify' AND (${where('title')} OR ${where('coalesce(creator, \'\')')})`).run(...CSV_JUNK, ...CSV_JUNK);
  db.prepare(`DELETE FROM creator_facts WHERE ${where('name')}`).run(...CSV_JUNK);
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

/** Insert or refresh a spot from a live feed (the feed's latest word wins). */
export function upsertFeedSpot(db, s) {
  db.prepare(
    `INSERT INTO spots (kind, title, city, venue, creators, tags, description, starts_at, ends_at, price, url, popularity, lat, lng, image, credit, source, external_id, is_demo, fetched_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0, datetime('now'))
     ON CONFLICT (source, external_id) DO UPDATE SET kind = excluded.kind, title = excluded.title, city = excluded.city, venue = excluded.venue,
       tags = excluded.tags, description = excluded.description, starts_at = excluded.starts_at, ends_at = excluded.ends_at, price = excluded.price,
       url = excluded.url, popularity = excluded.popularity, lat = excluded.lat, lng = excluded.lng, image = excluded.image, credit = excluded.credit,
       fetched_at = excluded.fetched_at`
  ).run(
    s.kind, s.title, s.city ?? null, s.venue ?? null, JSON.stringify(s.creators ?? []), JSON.stringify(s.tags ?? []), s.description ?? null,
    s.starts_at ?? null, s.ends_at ?? null, s.price ?? null, s.url ?? null, s.popularity ?? 0.5, s.lat ?? null, s.lng ?? null, s.image ?? null,
    s.credit ?? null, s.source, String(s.external_id)
  );
}

/** Insert a spot (or return the existing one with the same source/external_id). */
export function upsertSpot(db, s) {
  const existing = s.external_id && db.prepare('SELECT * FROM spots WHERE source = ? AND external_id = ?').get(s.source ?? 'local', String(s.external_id));
  if (existing) return hydrateSpot(existing);
  const r = db
    .prepare(
      `INSERT INTO spots (kind, title, city, venue, creators, tags, description, starts_at, ends_at, opened_at,
                          price, url, popularity, source, external_id, is_demo, added_by, lat, lng, image)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      s.kind, s.title, s.city ?? null, s.venue ?? null,
      JSON.stringify(s.creators ?? []), JSON.stringify(s.tags ?? []), s.description ?? null,
      s.starts_at ?? null, s.ends_at ?? null, s.opened_at ?? null, s.price ?? null, s.url ?? null,
      s.popularity ?? 0.5, s.source ?? 'local', s.external_id != null ? String(s.external_id) : null, s.is_demo ? 1 : 0,
      s.added_by ?? null, s.lat ?? null, s.lng ?? null, s.image ?? null
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
