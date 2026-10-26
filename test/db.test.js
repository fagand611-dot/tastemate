import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';

test('openDb upgrades a database made by an earlier version', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tm-')), 'old.db');
  // The shape an earlier version left behind: no users.home_city, a
  // separate user_settings table, and spots without added_by.
  const old = new DatabaseSync(file);
  old.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
                        password_hash TEXT NOT NULL, onboarded INTEGER NOT NULL DEFAULT 0, created_at TEXT);
    CREATE TABLE user_settings (user_id INTEGER PRIMARY KEY, home_city TEXT);
    CREATE TABLE spots (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, city TEXT, venue TEXT,
                        creators TEXT NOT NULL DEFAULT '[]', tags TEXT NOT NULL DEFAULT '[]', description TEXT,
                        starts_at TEXT, ends_at TEXT, opened_at TEXT, price TEXT, url TEXT,
                        popularity REAL NOT NULL DEFAULT 0.5, source TEXT NOT NULL DEFAULT 'local',
                        external_id TEXT, is_demo INTEGER NOT NULL DEFAULT 0, UNIQUE (source, external_id));
    INSERT INTO users (id, username, display_name, password_hash) VALUES (1, 'demo', 'Demo', 'x');
    INSERT INTO user_settings VALUES (1, 'Dublin');
  `);
  old.close();

  const db = openDb(file);
  assert.equal(db.prepare('SELECT home_city FROM users WHERE id = 1').get().home_city, 'Dublin');
  assert.ok(db.prepare('PRAGMA table_info(spots)').all().some((c) => c.name === 'added_by'));
  assert.doesNotThrow(() => createApp({ db, venueFeed: null, artistLookup: null }), 'the server starts on it');
  // Running it again is a no-op.
  db.close();
  assert.doesNotThrow(() => openDb(file).close());
});

test('openDb clears the junk saves left by Spotify CSVs read as plain lines', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tm-')), 'junk.db');
  const db = openDb(file);
  db.exec(`INSERT INTO users (id, username, display_name, password_hash) VALUES (1, 'u', 'U', 'x')`);
  const add = db.prepare(`INSERT INTO saves (user_id, kind, title, creator, source, tags, external_key) VALUES (1, 'song', ?, ?, ?, '[]', ?)`);
  add.run('playlist_name,playlist_url,playlist_uri,position,track_title', null, 'spotify', 'k1');
  add.run('liked_song,Night Changes,One Direction,spotify:track:5iX,https://open.spotify.com/track/5iX?si=4,False,PLAYABLE;SAVED,228533', null, 'spotify', 'k2');
  add.run('Acoustic Dance Version,Shary-An,spotify:track:0EE,https://open.spotify.com/track/0EE,False,PLAYABLE;SAVED,210960', 'liked_song,Paparazzi', 'spotify', 'k3');
  add.run('Night Changes', 'One Direction', 'spotify', 'spotify:track:5iX');
  add.run('Paparazzi - Acoustic Dance Version', 'Shary-An', 'spotify', 'spotify:track:0EE');
  add.run('Notes on spotify:track:links', null, 'pinterest', 'k6');
  db.prepare('INSERT INTO creator_facts (name, facts) VALUES (?, NULL), (?, NULL)').run('liked_song,paparazzi', 'one direction');
  db.close();

  const again = openDb(file);
  assert.deepEqual(again.prepare('SELECT title FROM saves ORDER BY id').all().map((r) => r.title), ['Night Changes', 'Paparazzi - Acoustic Dance Version', 'Notes on spotify:track:links'], 'only the junk goes; real songs and other apps stay');
  assert.deepEqual(again.prepare('SELECT name FROM creator_facts').all().map((r) => r.name), ['one direction']);
  again.close();
});
