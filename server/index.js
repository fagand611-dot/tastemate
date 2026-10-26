import fs from 'node:fs';

// Settings can live in a .env file (see .env.example).
if (fs.existsSync('.env')) process.loadEnvFile('.env');

const { openDb } = await import('./db.js');
const { createApp } = await import('./app.js');
const { seedSpots } = await import('./seed/seed.js');

const db = openDb();
// Sample spots, so Next is usable straight away; new ones are added as they ship.
const added = seedSpots(db);
if (added) console.log(`Added ${added} sample spots`);

const port = Number(process.env.PORT) || 3001;
const app = createApp({ db });
// Connected apps re-sync about once a day.
app.locals.connections.startAutoSync();
for (const [name, c] of Object.entries({ Spotify: process.env.SPOTIFY_CLIENT_ID, Instagram: process.env.INSTAGRAM_APP_ID })) {
  if (!c) console.log(`${name} connect is off (no keys in .env); file imports still work.`);
}
app
  .listen(port, () => console.log(`Tastemate API on http://localhost:${port}`))
  .on('error', (e) => {
    if (e.code !== 'EADDRINUSE') throw e;
    console.error(`\nPort ${port} is already in use, probably by an earlier Tastemate server that's still running.`);
    console.error(`Stop it (close that terminal, or run: npx kill-port ${port}) and start again.\n`);
    process.exit(1);
  });
