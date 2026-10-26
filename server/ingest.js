// Turning rows from an app (a file import, or a connected account's sync)
// into saves: tag each, guess its kind, skip what's already there, and queue
// unknown artists for a background lookup.
import { tx } from './db.js';
import { autoTag, cleanTags, guessKind } from './taxonomy.js';
import { loadCreatorCache } from './enrich.js';

/**
 * @param rows [{ kind, title, creator?, collection?, url?, note?, city?, external_key, saved_at? }]
 * Rows already saved get any details they were missing filled in (`updated`).
 * @returns {{ found, added, updated, skipped, untagged, lookingUp }}
 */
export function ingestRows(db, userId, source, rows, enricher) {
  const cache = loadCreatorCache(db);
  let added = 0;
  let updated = 0;
  let untagged = 0;
  tx(db, () => {
    const ins = db.prepare(
      `INSERT OR IGNORE INTO saves (user_id, kind, title, creator, source, collection, url, note, city, tags, external_key, saved_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    const existing = db.prepare('SELECT * FROM saves WHERE user_id = ? AND source = ? AND external_key = ?');
    const fill = db.prepare('UPDATE saves SET creator = ?, collection = ?, note = ?, city = ?, tags = ? WHERE id = ?');
    for (const row of rows) {
      const key = String(row.external_key).slice(0, 500);
      const tags = cleanTags(autoTag(row.title, row.creator, row.collection, row.note, cache));
      const kind = row.kind === 'other' ? guessKind(tags) : row.kind;
      const r = ins.run(userId, kind, row.title, row.creator ?? null, source, row.collection ?? null, row.url ?? null, row.note ?? null, row.city ?? null, JSON.stringify(tags), key, row.saved_at ?? null);
      if (r.changes) {
        added++;
        if (!tags.length) untagged++;
        continue;
      }
      // Already here: fill in what this file knows and the earlier one didn't
      // (Instagram's collections file has the collection, the posts file the account).
      const old = existing.get(userId, source, key);
      const gaps = ['creator', 'collection', 'note', 'city'].filter((f) => !old[f] && row[f]);
      if (!gaps.length) continue;
      const next = Object.fromEntries(['creator', 'collection', 'note', 'city'].map((f) => [f, old[f] || row[f] || null]));
      const merged = cleanTags([...JSON.parse(old.tags || '[]'), ...autoTag(old.title, next.creator, next.collection, next.note, cache)]);
      fill.run(next.creator, next.collection, next.note, next.city, JSON.stringify(merged), old.id);
      updated++;
    }
  });
  // Artists we don't know yet are looked up in the background; their saves fill in as answers arrive.
  const lookingUp = enricher ? enricher.queue(rows.filter((x) => x.kind === 'song' && x.creator).map((x) => x.creator)) : 0;
  return { found: rows.length, added, updated, skipped: rows.length - added - updated, untagged, lookingUp };
}
