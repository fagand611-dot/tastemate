import crypto from 'node:crypto';
import { HttpError, ah } from '../http.js';
import { requireUser } from '../auth.js';

// Connect an app: send the person to the app to say yes, check the state on
// the way back, keep the tokens, and bring their library in (in the
// background, so they land back on Tastemate straight away).
const STATE_TTL = 10 * 60e3;

export default function connectRoutes(r, { db, connections, connectors, publicUrl = process.env.PUBLIC_URL }) {
  // Where this server is reached; the redirect URI has to match the one registered with the app exactly.
  const base = (req) => (publicUrl || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const redirectUri = (req, provider) => `${base(req)}/api/connect/${provider}/callback`;
  const connector = (provider) => {
    if (!Object.hasOwn(connectors, provider)) throw new HttpError(404, 'Unknown app');
    if (!connectors[provider]) throw new HttpError(400, `${provider} isn’t set up on this server yet`);
    return connectors[provider];
  };

  r.get('/connect', requireUser, (req, res) => res.json({ apps: connections.status(req.user.id) }));

  // A page navigation, not a fetch: answers with a redirect to the app.
  r.get('/connect/:provider/start', (req, res) => {
    if (!req.user) return res.redirect('/');
    const c = connector(req.params.provider);
    db.prepare('DELETE FROM oauth_states WHERE created_at < ?').run(Date.now() - STATE_TTL);
    const state = crypto.randomBytes(24).toString('base64url');
    // Come back to the address they started from (it can differ from PUBLIC_URL in development).
    const from = `${req.protocol}://${req.get('host')}`;
    db.prepare('INSERT INTO oauth_states (state, user_id, provider, return_to, created_at) VALUES (?,?,?,?,?)').run(state, req.user.id, req.params.provider, from, Date.now());
    res.redirect(c.authorizeUrl({ redirectUri: redirectUri(req, req.params.provider), state }));
  });

  r.get('/connect/:provider/callback', async (req, res, next) => {
    const { provider } = req.params;
    const back = (to, q) => res.redirect(`${to || base(req)}/you/add?${new URLSearchParams(q)}`);
    try {
      const c = connector(provider);
      const st = db.prepare('SELECT * FROM oauth_states WHERE state = ?').get(String(req.query.state || ''));
      if (st) db.prepare('DELETE FROM oauth_states WHERE state = ?').run(st.state);
      if (!st || st.provider !== provider || st.created_at < Date.now() - STATE_TTL) return back(st?.return_to, { connect_error: provider, reason: 'expired' });
      if (req.query.error || !req.query.code) return back(st.return_to, { connect_error: provider, reason: 'declined' });
      const tokens = await c.exchange({ code: String(req.query.code), redirectUri: redirectUri(req, provider) });
      const account = await c.account(tokens.access_token);
      connections.store(st.user_id, provider, account, tokens);
      connections.sync(st.user_id, provider).catch(() => {});
      back(st.return_to, { connected: provider });
    } catch (e) {
      if (e.status) return next(e);
      console.error(`Connecting ${provider}:`, e.message);
      back(null, { connect_error: provider, reason: 'failed' });
    }
  });

  r.post('/connect/:provider/sync', requireUser, ah(async (req, res) => {
    connector(req.params.provider);
    const result = await connections.sync(req.user.id, req.params.provider);
    if (!result) throw new HttpError(404, 'Not connected');
    res.json(result);
  }));

  r.delete('/connect/:provider', requireUser, (req, res) => {
    if (!Object.hasOwn(connectors, req.params.provider)) throw new HttpError(404, 'Unknown app');
    connections.disconnect(req.user.id, req.params.provider);
    res.json({ ok: true });
  });
}
