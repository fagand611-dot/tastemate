// Live feeds for Next: what's on (Ticketmaster), where to go (Google
// Places) and things to buy (eBay), fetched per city when someone looks
// (things that ship, once for everyone), kept as spots and refreshed
// when they go stale (events every few hours, places weekly). Once a city has
// live spots, the sample ones there step aside.
import { tx, upsertFeedSpot } from './db.js';

const RETRY_AFTER_ERROR = 30 * 60e3;
const LIVE_FOR = 14 * 864e5;
const EVENT_DAYS = 45;

const cityKey = (city) => String(city || '').trim().toLowerCase();
// Feeds of things that ship (scope "global") are fetched once for everyone.
const keyFor = (p, city) => (p.scope === 'global' ? '*' : cityKey(city));
const addDays = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

export function createFeeds({ db, providers = [] }) {
  const active = providers.filter(Boolean);
  const inFlight = new Map();
  const run = (key, provider) => db.prepare('SELECT * FROM feed_runs WHERE city_key = ? AND provider = ?').get(key, provider);

  const fetchOne = async (city, p) => {
    const key = keyFor(p, city);
    const today = new Date().toISOString().slice(0, 10);
    try {
      const rows = await p.fetchCity(city, { from: today, to: addDays(today, EVENT_DAYS) });
      tx(db, () => {
        for (const r of rows) upsertFeedSpot(db, r);
        db.prepare('INSERT OR REPLACE INTO feed_runs (city_key, provider, fetched_at, ok, count, error) VALUES (?,?,?,1,?,NULL)').run(key, p.provider, Date.now(), rows.length);
        // Gone from the feed for weeks, and nobody saved it: let it go.
        db.prepare(`DELETE FROM spots WHERE source = ? AND (lower(city) = ? OR (? = '*' AND city IS NULL)) AND fetched_at < datetime('now', '-45 days') AND id NOT IN (SELECT spot_id FROM saves WHERE spot_id IS NOT NULL)`).run(p.provider, key, key);
      });
    } catch (e) {
      console.error(`${p.label} for ${city}:`, e.message);
      db.prepare('INSERT OR REPLACE INTO feed_runs (city_key, provider, fetched_at, ok, count, error) VALUES (?,?,?,0,0,?)').run(key, p.provider, Date.now(), String(e.message).slice(0, 200));
    }
  };

  return {
    enabled: active.length > 0,
    /**
     * Make sure a city's feeds are fresh. Stale ones are fetched (once, however
     * many people ask at the same moment); waits up to `wait` ms, so a first
     * look at a new city fills in, and a slow feed doesn't hold the page up.
     */
    ensureCity(city, { wait = 4000 } = {}) {
      if (!cityKey(city) || !active.length) return Promise.resolve();
      const jobs = active.map((p) => {
        const key = keyFor(p, city);
        const last = run(key, p.provider);
        const fresh = last && Date.now() - last.fetched_at < (last.ok ? p.ttl : RETRY_AFTER_ERROR);
        if (fresh) return null;
        const id = `${key}|${p.provider}`;
        if (!inFlight.has(id)) inFlight.set(id, fetchOne(city, p).finally(() => inFlight.delete(id)));
        return inFlight.get(id);
      }).filter(Boolean);
      if (!jobs.length) return Promise.resolve();
      const all = Promise.all(jobs);
      return wait ? Promise.race([all, new Promise((r) => setTimeout(r, wait).unref?.())]) : all;
    },
    /** True when the city has live spots of this kind (or any kind), so its samples can step aside. */
    isLive(city, kind) {
      return active.some((p) => (!kind || p.kinds.includes(kind)) && (p.scope === 'global' || cityKey(city)) && (() => {
        const last = db.prepare('SELECT * FROM feed_runs WHERE city_key = ? AND provider = ? AND ok = 1 AND count > 0').get(keyFor(p, city), p.provider);
        return last && Date.now() - last.fetched_at < LIVE_FOR;
      })());
    },
    /** A photo's image address, from whichever feed serves photos. */
    photoUrl: (ref) => active.find((p) => p.photoUrl)?.photoUrl(ref) ?? null,
    /** For the page: which feeds a city's picks come from, and when they were fetched. */
    status(city) {
      return active.map((p) => {
        const last = run(keyFor(p, city), p.provider);
        return { provider: p.provider, label: p.label, kinds: p.kinds, fetched_at: last?.fetched_at ?? null, ok: last ? !!last.ok : null, count: last?.count ?? 0 };
      });
    },
  };
}
