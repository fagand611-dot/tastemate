// Turning rows from an app (a file import, or a connected account's sync)
// into saves: tag each, guess its kind, skip what's already there, and queue
// unknown artists for a background lookup.
import { tx } from './db.js';
import { autoTag, cleanTags, guessKind } from './taxonomy.js';
import { loadCreatorCache } from './enrich.js';

/**
 * @param rows [{ kind, title, creator?, collection?, url?, note?, city?, external_key, saved_at? }]
 * @returns {{ found, added, skipped, untagged, lookingUp }}
 */
export function ingestRows(db, userId, source, rows, enricher) {
  const cache = loadCreatorCache(db);
  let added = 0;
  let untagged = 0;
  tx(db, () => {
    const ins = db.prepare(
      `INSERT OR IGNORE INTO saves (user_id, kind, title, creator, source, collection, url, note, city, tags, external_key, saved_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    for (const row of rows) {
      const tags = cleanTags(autoTag(row.title, row.creator, row.collection, row.note, cache));
      const kind = row.kind === 'other' ? guessKind(tags) : row.kind;
      const r = ins.run(userId, kind, row.title, row.creator ?? null, source, row.collection ?? null, row.url ?? null, row.note ?? null, row.city ?? null, JSON.stringify(tags), String(row.external_key).slice(0, 500), row.saved_at ?? null);
      if (r.changes) {
        added++;
        if (!tags.length) untagged++;
      }
    }
  });
  // Artists we don't know yet are looked up in the background; their saves fill in as answers arrive.
  const lookingUp = enricher ? enricher.queue(rows.filter((x) => x.kind === 'song' && x.creator).map((x) => x.creator)) : 0;
  return { found: rows.length, added, skipped: rows.length - added, untagged, lookingUp };
}
