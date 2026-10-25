// Background lookups for artists the built-in list doesn't know. Saves are
// imported straight away; artists are queued, looked up one at a time (paced
// for MusicBrainz), cached in creator_facts, and the saves that mention them
// are re-tagged with the new facets (sound, place, era).
import { tx, hydrateSave } from './db.js';
import { CREATORS } from './creators.js';
import { autoTag, cleanTags, splitCreators } from './taxonomy.js';

/** Map of lower-case artist name → facts, for everything looked up so far. */
export function loadCreatorCache(db) {
  const m = new Map();
  for (const r of db.prepare('SELECT name, facts FROM creator_facts WHERE facts IS NOT NULL').all()) m.set(r.name, JSON.parse(r.facts));
  return m;
}

export function createEnricher(db, lookup, { delayMs = 1100 } = {}) {
  const queue = [];
  let running = null;
  let current = null;
  const known = (key) => CREATORS[key] || db.prepare('SELECT 1 FROM creator_facts WHERE name = ?').get(key);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Add the new facets to every save that mentions this artist, keeping the person's own edits. */
  function retag(key) {
    const cache = loadCreatorCache(db);
    const rows = db.prepare('SELECT * FROM saves WHERE creator IS NOT NULL AND lower(creator) LIKE ?').all(`%${key}%`).map(hydrateSave);
    tx(db, () => {
      const upd = db.prepare('UPDATE saves SET tags = ? WHERE id = ?');
      for (const s of rows) {
        if (!splitCreators(s.creator).some((n) => n.toLowerCase() === key)) continue;
        const tags = cleanTags([...s.tags, ...autoTag(s.title, s.creator, s.collection, s.note, cache)]);
        if (tags.length !== s.tags.length) upd.run(JSON.stringify(tags), s.id);
      }
    });
  }

  async function run() {
    while (queue.length) {
      const name = queue.shift();
      const key = name.toLowerCase();
      if (known(key)) continue;
      let facts;
      current = name;
      try {
        facts = await lookup(name);
      } catch {
        // Network trouble: leave it uncached so a later import tries again.
        facts = undefined;
      }
      current = null;
      if (facts !== undefined) {
        db.prepare('INSERT OR REPLACE INTO creator_facts (name, facts) VALUES (?, ?)').run(key, facts ? JSON.stringify(facts) : null);
        if (facts) retag(key);
      }
      if (queue.length) await sleep(delayMs);
    }
    running = null;
  }

  return {
    /** Queue artists (raw creator strings are split into names). Returns how many are waiting. */
    queue(creators) {
      if (!lookup) return 0;
      for (const c of creators) {
        for (const name of splitCreators(c)) {
          const key = name.toLowerCase();
          if (!known(key) && !queue.some((q) => q.toLowerCase() === key)) queue.push(name);
        }
      }
      if (queue.length && !running) running = run();
      return queue.length;
    },
    /** Artists still waiting or being looked up. */
    pending: () => queue.length + (current ? 1 : 0),
    /** Resolves when the queue is empty (for tests). */
    whenIdle: () => running || Promise.resolve(),
  };
}
