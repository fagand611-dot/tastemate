import crypto from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadUser } from './auth.js';
import { createVenuePosts } from './providers/venue-posts.js';
import { createArtistLookup } from './providers/musicbrainz.js';
import { createEnricher } from './enrich.js';
import authRoutes from './routes/auth.js';
import savesRoutes from './routes/saves.js';
import friendRoutes from './routes/friends.js';
import profileRoutes from './routes/profile.js';
import connectRoutes from './routes/connect.js';
import inviteRoutes from './routes/invites.js';
import { createSpotify } from './providers/spotify.js';
import { createInstagram } from './providers/instagram.js';
import { createConnections } from './connect.js';
import { createFeeds } from './feeds.js';
import { createTicketmaster } from './providers/ticketmaster.js';
import { createGooglePlaces } from './providers/google-places.js';
import { createEbay } from './providers/ebay.js';
import { createSealer, loadTokenKey } from './secrets.js';

export function createApp({
  db,
  venueFeed = createVenuePosts(),
  artistLookup = createArtistLookup(),
  // Apps people can connect; null where this server has no keys for one.
  connectors = { spotify: createSpotify(), instagram: createInstagram() },
  // Live events, places and things to buy for Next; none without keys, and Next uses the samples.
  feedProviders = [createTicketmaster(), createGooglePlaces(), createEbay()],
  // Only needed (and only made) once there's an app to connect.
  tokenKey = Object.values(connectors).some(Boolean) ? loadTokenKey() : null,
  publicUrl = process.env.PUBLIC_URL,
}) {
  const app = express();
  app.disable('x-powered-by');
  // Export files from other apps can be large; everything else stays small.
  app.use('/api/saves/import', express.json({ limit: '8mb' }));
  app.use('/api/me/avatar', express.json({ limit: '512kb' }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(loadUser(db));

  const enricher = createEnricher(db, artistLookup);
  app.locals.enricher = enricher;
  const cities = () => db.prepare('SELECT DISTINCT city FROM spots WHERE city IS NOT NULL').all().map((x) => x.city);
  const connections = createConnections({ db, connectors, sealer: createSealer(tokenKey || crypto.randomBytes(32)), enricher, cities });
  app.locals.connections = connections;
  const feeds = createFeeds({ db, providers: feedProviders });
  const ctx = { db, venueFeed, enricher, connections, connectors, publicUrl, feeds };
  const api = express.Router();
  authRoutes(api, ctx);
  friendRoutes(api, ctx);
  profileRoutes(api, ctx);
  connectRoutes(api, ctx);
  inviteRoutes(api, ctx);
  savesRoutes(api, ctx);
  api.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use('/api', api);

  // Serve the built SPA in production.
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Something went wrong' : err.message });
  });
  return app;
}
