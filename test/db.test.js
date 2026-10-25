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
  assert.doesNotThrow(() => createApp({ db, venueFeed: null }), 'the server starts on it');
  // Running it again is a no-op.
  db.close();
  assert.doesNotThrow(() => openDb(file).close());
});
