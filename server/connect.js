// Connected apps: keep each person's tokens (sealed), refresh them before
// they lapse, and sync their library into saves, on connect, on "Sync now",
// and in the background about once a day.
import { ingestRows } from './ingest.js';
import { cityFrom } from './importers.js';

// Refresh when a token has less than this left. Spotify's last an hour;
// Instagram's 60 days, and can only be refreshed once they're a day old.
const REFRESH_MARGIN = { spotify: 60e3, instagram: 50 * 864e5 };
const DAY = 864e5;

export function createConnections({ db, connectors, sealer, enricher, cities = () => [] }) {
  const running = new Set();
  const row = (userId, provider) => db.prepare('SELECT * FROM connections WHERE user_id = ? AND provider = ?').get(userId, provider);

  const store = (userId, provider, account, t) => {
    db.prepare(
      `INSERT INTO connections (user_id, provider, account_id, account_name, access_token, refresh_token, expires_at, scope)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT (user_id, provider) DO UPDATE SET account_id = excluded.account_id, account_name = excluded.account_name,
         access_token = excluded.access_token, refresh_token = excluded.refresh_token, expires_at = excluded.expires_at,
         scope = excluded.scope, last_error = NULL`
    ).run(userId, provider, account?.id ?? null, account?.name ?? null, sealer.seal(t.access_token), sealer.seal(t.refresh_token), t.expires_at ?? null, t.scope ?? null);
  };

  /** A working access token, refreshed first if it's about to lapse. */
  const access = async (c, connector) => {
    const t = { access_token: sealer.open(c.access_token), refresh_token: sealer.open(c.refresh_token), expires_at: c.expires_at };
    if (t.expires_at && t.expires_at < Date.now() && c.provider === 'instagram') throw Object.assign(new Error('Instagram needs you to connect again'), { reconnect: true });
    if (t.expires_at && t.expires_at - Date.now() < (REFRESH_MARGIN[c.provider] ?? 60e3)) {
      const fresh = await connector.refresh(t);
      store(c.user_id, c.provider, { id: c.account_id, name: c.account_name }, fresh);
      return fresh.access_token;
    }
    return t.access_token;
  };

  const sync = async (userId, provider) => {
    const connector = connectors[provider];
    const c = row(userId, provider);
    if (!connector || !c) return null;
    const key = `${userId}:${provider}`;
    if (running.has(key)) return { running: true };
    running.add(key);
    try {
      const token = await access(c, connector);
      const known = cities();
      const rows = await connector.fetchRows(token, { cityFrom: (text) => cityFrom(text, known) });
      const result = ingestRows(db, userId, provider, rows, enricher);
      db.prepare(`UPDATE connections SET last_synced_at = datetime('now'), last_added = ?, last_error = NULL WHERE user_id = ? AND provider = ?`).run(result.added, userId, provider);
      return result;
    } catch (e) {
      db.prepare('UPDATE connections SET last_error = ? WHERE user_id = ? AND provider = ?').run(e.reconnect ? 'reconnect' : String(e.message).slice(0, 200), userId, provider);
      return { error: e.message, reconnect: !!e.reconnect };
    } finally {
      running.delete(key);
    }
  };

  return {
    store,
    sync,
    /** Every app, whether this server can connect it, and this person's connection (never the tokens). */
    status(userId) {
      return Object.entries(connectors).map(([provider, connector]) => {
        const c = row(userId, provider);
        return {
          provider,
          label: connector?.label || provider[0].toUpperCase() + provider.slice(1),
          available: !!connector,
          connected: !!c,
          account: c?.account_name ?? null,
          last_synced_at: c?.last_synced_at ?? null,
          last_added: c?.last_added ?? null,
          saves: db.prepare('SELECT COUNT(*) AS n FROM saves WHERE user_id = ? AND source = ?').get(userId, provider).n,
          needs_reconnect: c?.last_error === 'reconnect',
          error: c?.last_error && c.last_error !== 'reconnect' ? c.last_error : null,
          syncing: running.has(`${userId}:${provider}`),
        };
      });
    },
    /** Forget the tokens. The saves already brought in stay. */
    disconnect(userId, provider) {
      db.prepare('DELETE FROM connections WHERE user_id = ? AND provider = ?').run(userId, provider);
    },
    /** Re-sync connections not synced for a day, every few hours. */
    startAutoSync({ every = 6 * 36e5 } = {}) {
      const tick = async () => {
        const stale = db.prepare(`SELECT user_id, provider FROM connections WHERE (last_error IS NULL OR last_error != 'reconnect') AND (last_synced_at IS NULL OR last_synced_at < datetime('now', ?))`).all(`-${DAY / 1000} seconds`);
        for (const c of stale) await sync(c.user_id, c.provider);
      };
      const timer = setInterval(() => tick().catch((e) => console.error('Auto-sync:', e.message)), every);
      timer.unref();
      return () => clearInterval(timer);
    },
  };
}
