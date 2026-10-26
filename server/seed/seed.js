// Seed sample spots and, optionally, demo users.
//   npm run seed            → sample spots only (skipped if spots already exist)
//   npm run seed -- --demo  → also adds demo friends (maya, sam, jo) and a `demo` account
import { fileURLToPath } from 'node:url';
import { openDb, tx, upsertSpot } from '../db.js';
import { hashPassword } from '../auth.js';
import { autoTag, cleanTags, guessKind } from '../taxonomy.js';
import { DEMO_SAVES, FRIEND_SAVES, FRIEND_SPOT_SAVES, demoSpots } from './spots.js';

/** Sample events, places and products for Next. */
export function seedSpots(db) {
  const rows = demoSpots();
  let added = 0;
  tx(db, () => {
    const has = db.prepare('SELECT id, lat FROM spots WHERE source = ? AND external_id = ?');
    const place = db.prepare('UPDATE spots SET lat = ?, lng = ? WHERE id = ?');
    for (const s of rows) {
      const existing = has.get(s.source, s.external_id);
      if (!existing) (upsertSpot(db, s), added++);
      // Older databases: fill in coordinates added since.
      else if (existing.lat == null && s.lat != null) place.run(s.lat, s.lng, existing.id);
    }
  });
  return added;
}

const PERSONAS = [
  { username: 'maya', name: 'Maya' },
  { username: 'sam', name: 'Sam' },
  { username: 'jo', name: 'Jo' },
  { username: 'demo', name: 'Demo User', home: 'Dublin' },
];

export function seedDemo(db, { password = 'demo1234' } = {}) {
  const pw = hashPassword(password);
  tx(db, () => {
    const ids = {};
    for (const p of PERSONAS) {
      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(p.username);
      ids[p.username] = existing
        ? existing.id
        : Number(db.prepare('INSERT INTO users (username, display_name, password_hash, home_city) VALUES (?,?,?,?)').run(p.username, p.name, pw, p.home ?? null).lastInsertRowid);
    }
    const friend = db.prepare(`INSERT OR IGNORE INTO friendships (requester_id, addressee_id, status) VALUES (?,?, 'accepted')`);
    friend.run(ids.maya, ids.sam);
    friend.run(ids.maya, ids.jo);
    friend.run(ids.sam, ids.jo);
    for (const u of ['maya', 'sam', 'jo']) friend.run(ids[u], ids.demo);

    // Saves from other apps, tagged the same way an import would tag them.
    const addSave = db.prepare(
      `INSERT OR IGNORE INTO saves (user_id, kind, title, creator, source, collection, city, tags, spot_id, external_key)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    );
    const add = (userId, [source, kind, title, creator, collection, city]) => {
      const tags = cleanTags(autoTag(title, creator, collection));
      addSave.run(userId, kind === 'other' ? guessKind(tags) : kind, title, creator, source, collection, city ?? null, JSON.stringify(tags), null, `${source}|${title}`);
    };
    DEMO_SAVES.forEach((s) => add(ids.demo, s));
    for (const [u, saves] of Object.entries(FRIEND_SAVES)) saves.forEach((s) => add(ids[u], s));

    // Spots friends saved, so Next can say "Maya saved it".
    for (const [u, titles] of Object.entries(FRIEND_SPOT_SAVES)) {
      for (const t of titles) {
        const spot = db.prepare('SELECT * FROM spots WHERE title = ?').get(t);
        if (spot) addSave.run(ids[u], spot.kind, spot.title, null, 'tastemate', null, spot.city, spot.tags, spot.id, `spot:${spot.id}`);
      }
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = openDb();
  if (!db.prepare('SELECT 1 FROM spots LIMIT 1').get()) console.log(`Seeded ${seedSpots(db)} sample spots`);
  else console.log('Sample spots already present');
  if (process.argv.includes('--demo')) {
    seedDemo(db);
    console.log('Demo users added: maya, sam, jo, demo (password: demo1234)');
  }
}
