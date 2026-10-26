// Connect Instagram, through Meta's "Instagram API with Instagram Login".
// What it can read is the person's own posts (captions, links, dates), and
// only for professional accounts (business or creator; switching is free in
// the Instagram app). Instagram doesn't let any other app read someone's
// saved posts, so those still come from the data download (a ZIP upload).
//
// Needs a Meta app with the Instagram product, the instagram_business_basic
// permission, and PUBLIC_URL + /api/connect/instagram/callback as a valid
// OAuth redirect URI. Until the app passes Meta's review, only accounts added
// as testers can connect.
//
// Env: INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET

const AUTH = 'https://www.instagram.com/oauth/authorize';
const TOKEN = 'https://api.instagram.com/oauth/access_token';
const GRAPH = 'https://graph.instagram.com';
export const INSTAGRAM_SCOPES = ['instagram_business_basic'];

export function createInstagram({
  appId = process.env.INSTAGRAM_APP_ID,
  appSecret = process.env.INSTAGRAM_APP_SECRET,
  fetchImpl = fetch,
} = {}) {
  if (!appId || !appSecret) return null;

  const json = async (res, what) => {
    const j = await res.json().catch(() => ({}));
    if (res.status === 401 || j.error?.code === 190) throw Object.assign(new Error('Instagram needs you to connect again'), { reconnect: true });
    if (!res.ok) throw new Error(`Instagram ${what} failed: ${j.error_message || j.error?.message || res.status}`);
    return j;
  };
  const longLived = (j) => ({ access_token: j.access_token, refresh_token: null, expires_at: Date.now() + (j.expires_in || 60 * 864e2) * 1000, scope: INSTAGRAM_SCOPES.join(',') });

  return {
    provider: 'instagram',
    label: 'Instagram',
    authorizeUrl({ redirectUri, state }) {
      const q = new URLSearchParams({ client_id: appId, redirect_uri: redirectUri, response_type: 'code', scope: INSTAGRAM_SCOPES.join(','), state });
      return `${AUTH}?${q}`;
    },
    // A code buys a short-lived token (an hour), traded straight away for a long-lived one (60 days).
    async exchange({ code, redirectUri }) {
      const short = await json(await fetchImpl(TOKEN, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: appId, client_secret: appSecret, grant_type: 'authorization_code', redirect_uri: redirectUri, code }).toString(),
      }), 'sign-in');
      const q = new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: appSecret, access_token: short.access_token });
      return longLived(await json(await fetchImpl(`${GRAPH}/access_token?${q}`), 'sign-in'));
    },
    // Long-lived tokens are refreshed with themselves (any time after a day, before they lapse).
    async refresh(t) {
      const q = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: t.access_token });
      return longLived(await json(await fetchImpl(`${GRAPH}/refresh_access_token?${q}`), 'refresh'));
    },
    async account(access) {
      const me = await json(await fetchImpl(`${GRAPH}/me?${new URLSearchParams({ fields: 'user_id,username', access_token: access })}`), 'profile');
      return { id: String(me.user_id || me.id), name: me.username ? `@${me.username}` : 'Instagram' };
    },
    /** Your own posts as import rows: the caption's first line as the title, the rest as a note. */
    async fetchRows(access, { max = 500, cityFrom = () => null } = {}) {
      const rows = [];
      let next = `${GRAPH}/me/media?${new URLSearchParams({ fields: 'id,caption,media_type,permalink,timestamp', limit: '50', access_token: access })}`;
      while (next && rows.length < max) {
        const page = await json(await fetchImpl(next), 'posts');
        for (const m of page.data || []) {
          const caption = (m.caption || '').trim();
          const first = caption.split('\n')[0].replace(/#\S+/g, '').trim();
          rows.push({
            kind: 'other',
            title: (first || caption || 'Instagram post').slice(0, 100),
            collection: 'Your posts',
            note: caption ? caption.slice(0, 400) : null,
            url: m.permalink || null,
            city: cityFrom(caption),
            external_key: `ig:${m.id}`,
            saved_at: m.timestamp || null,
          });
        }
        next = page.paging?.next || null;
      }
      return rows.slice(0, max);
    },
  };
}
