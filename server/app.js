import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadUser } from './auth.js';
import { createVenuePosts } from './providers/venue-posts.js';
import authRoutes from './routes/auth.js';
import savesRoutes from './routes/saves.js';
import friendRoutes from './routes/friends.js';

export function createApp({ db, venueFeed = createVenuePosts() }) {
  const app = express();
  app.disable('x-powered-by');
  // Export files from other apps can be large; everything else stays small.
  app.use('/api/saves/import', express.json({ limit: '8mb' }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(loadUser(db));

  const ctx = { db, venueFeed };
  const api = express.Router();
  authRoutes(api, ctx);
  friendRoutes(api, ctx);
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
