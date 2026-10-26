// Connect Spotify: the Authorization Code flow, then the saved tracks and
// albums in the person's library, with their artists' genres, as saves.
// Needs an app from https://developer.spotify.com/dashboard with this
// server's callback (PUBLIC_URL + /api/connect/spotify/callback) added as a
// redirect URI. Apps start in development mode, where only people you add
// to the app's user list can connect.
//
// Env: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET

const ACCOUNTS = 'https://accounts.spotify.com';
const API = 'https://api.spotify.com/v1';
export const SPOTIFY_SCOPES = ['user-library-read', 'user-read-private'];

export function createSpotify({
  clientId = process.env.SPOTIFY_CLIENT_ID,
  clientSecret = process.env.SPOTIFY_CLIENT_SECRET,
  fetchImpl = fetch,
  wait = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  if (!clientId || !clientSecret) return null;
  const basic = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

  const token = async (form) => {
    const res = await fetchImpl(`${ACCOUNTS}/api/token`, {
      method: 'POST',
      headers: { authorization: basic, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form).toString(),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Spotify sign-in failed: ${j.error_description || j.error || res.status}`);
    return { access_token: j.access_token, refresh_token: j.refresh_token ?? null, expires_at: Date.now() + (j.expires_in || 3600) * 1000, scope: j.scope ?? null };
  };

  // GET with one polite retry when Spotify says slow down.
  const get = async (url, access) => {
    for (let attempt = 0; ; attempt++) {
      const res = await fetchImpl(url.startsWith('http') ? url : `${API}${url}`, { headers: { authorization: `Bearer ${access}` } });
      if (res.status === 429 && attempt === 0) {
        await wait(Math.min(10, Number(res.headers.get('retry-after')) || 2) * 1000);
        continue;
      }
      if (res.status === 401) throw Object.assign(new Error('Spotify needs you to connect again'), { reconnect: true });
      if (!res.ok) throw new Error(`Spotify answered ${res.status}`);
      return res.json();
    }
  };

  // Every page of a library list, up to max items.
  const all = async (path, access, max) => {
    const out = [];
    let next = path;
    while (next && out.length < max) {
      const page = await get(next, access);
      out.push(...(page.items || []));
      next = page.next;
    }
    return out.slice(0, max);
  };

  return {
    provider: 'spotify',
    label: 'Spotify',
    authorizeUrl({ redirectUri, state }) {
      const q = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri, state, scope: SPOTIFY_SCOPES.join(' ') });
      return `${ACCOUNTS}/authorize?${q}`;
    },
    exchange: ({ code, redirectUri }) => token({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    async refresh(t) {
      const fresh = await token({ grant_type: 'refresh_token', refresh_token: t.refresh_token });
      // Spotify may or may not send a new refresh token; keep the old one if not.
      return { ...fresh, refresh_token: fresh.refresh_token || t.refresh_token };
    },
    async account(access) {
      const me = await get('/me', access);
      return { id: me.id, name: me.display_name || me.id };
    },
    /** The library as import rows (the same shape and keys as a YourLibrary.json import, so nothing doubles up). */
    async fetchRows(access, { max = 2000 } = {}) {
      const tracks = await all('/me/tracks?limit=50', access, max);
      const albums = await all('/me/albums?limit=50', access, Math.max(0, max - tracks.length));
      // Artists' genres ride along in the collection, where the tagger reads them.
      const ids = [...new Set([...tracks.flatMap((x) => x.track?.artists || []), ...albums.flatMap((x) => x.album?.artists || [])].map((a) => a.id).filter(Boolean))].slice(0, 500);
      const genres = new Map();
      try {
        for (let i = 0; i < ids.length; i += 50) {
          const page = await get(`/artists?ids=${ids.slice(i, i + 50).join(',')}`, access);
          for (const a of page.artists || []) if (a?.genres?.length) genres.set(a.id, a.genres.slice(0, 3));
        }
      } catch (e) {
        if (e.reconnect) throw e;
        // Genres are a bonus; the artist lookup fills in without them.
      }
      const collection = (album, artists) => [album, ...new Set(artists.flatMap((a) => genres.get(a.id) || []))].filter(Boolean).join(' · ') || null;
      const rows = [];
      for (const { track: t, added_at } of tracks) {
        if (!t?.name) continue;
        rows.push({ kind: 'song', title: t.name, creator: t.artists.map((a) => a.name).join(', ') || null, collection: collection(t.album?.name, t.artists), url: t.external_urls?.spotify || null, external_key: t.uri, saved_at: added_at || null });
      }
      for (const { album: a, added_at } of albums) {
        if (!a?.name) continue;
        rows.push({ kind: 'song', title: a.name, creator: a.artists.map((x) => x.name).join(', ') || null, collection: collection(null, a.artists), url: a.external_urls?.spotify || null, external_key: a.uri, saved_at: added_at || null });
      }
      return rows;
    },
  };
}
