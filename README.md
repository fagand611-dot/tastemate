# ✦ Tastemate

Everything you save on **Spotify, Instagram, Google Maps and Pinterest**,
connected into one taste, and turned into *what should I do, buy or go to
next*: at home tomorrow, on a trip to Bangkok, or when you're having people
over tonight.

The feature at its heart is the **taste graph**: Tastemate reads every save
as a whole (not just what's labelled) and builds clusters of taste from what
your saves say outright, what they mean, and what they could be.

See [DESIGN.md](DESIGN.md) for the product thinking, the model, the data
model and an honest feasibility check.

## Quick start

Requires **Node 22.13+**. SQLite is built into Node, so there are no native modules.

```bash
npm install
npm run seed -- --demo   # optional: demo friends (maya, sam, jo) and a `demo` login
npm run dev              # API on :3001, app on http://localhost:5173
```

Sign in as `demo` / `demo1234` to see 23 sample saves from four apps,
friends, and sample spots in Bangkok, London, Dublin and Tokyo. Or create
your own account and import your own saves.

### If something looks out of date or broken

`npm run dev` refuses to start if ports 3001 or 5173 are already taken, because
an older run still holding them would serve old code. Stop it and try again:

```bash
npx kill-port 3001 5173
npm run dev
```

A `data/tastemate.db` left by an earlier version is upgraded in place when
the server starts. To start over with a clean database instead, stop the
server, delete the `data/` folder and run `npm run seed -- --demo` again.

### Production

```bash
npm run build && npm start   # serves the API and the built app on :3001
```

### Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | HTTP port |
| `DB_FILE` | `data/tastemate.db` | SQLite file |
| `IG_USER_ID` | *(unset)* | Your Instagram business account ID, for the venue feed |
| `IG_ACCESS_TOKEN` | *(unset)* | A Meta Graph API token with `instagram_basic` |
| `VENUE_ACCOUNTS` | *(unset)* | Venues to follow, e.g. `Dublin:workmansclub,Bangkok:studiolam` |

Without the three `IG_` / `VENUE_` variables the venue feed is off; pasting
posts still works.

## What's in it

- **Saves:** import the data export from each app (Spotify `YourLibrary.json`,
  Instagram `saved_collections.json`, Google Takeout `Saved Places.json` or
  list CSVs, pasted Pinterest pins), or add a save by hand. Every save is
  tagged automatically and you can retag anything.
- **Taste clusters:** recurring tastes that run across your apps, e.g.
  *jazz · chill · cerebral*, each with its evidence in three tiers:
  - **Obvious:** says it outright ("Jazz café with a record wall").
  - **Translated:** means it without saying it ("Vinyl listening bar",
    a Miles Davis track, "@bluenote.records").
  - **Could be:** goes with it, or matches your habits ("most of your
    intimate saves are also jazz").
- **Your Tastemate character:** who your saves say you are, e.g. *The
  Late-Night Listener, with a candlelit streak*: your top sides as shares,
  the apps it was read from, and **stretch** tastes your saves point
  towards but you haven't explored yet.
- **Taste universe:** your tastes as floating bubbles (bigger = more
  loved), glowing by side, with lines for what goes together. Tap one to see
  *why it's you*. Also as a cloud, or a plain list.
- **Next:** pick a city and Tomorrow, This weekend, Next 2 weeks or trip
  dates. Get events, places and things to buy, each explained by your own
  saves ("jazz: 4 on Spotify, 2 on Google Maps"), what friends saved, what
  just opened, and a boost for **under-the-radar** spots. Your own saves in
  that city come first, so a trip never forgets the café you starred years ago.
  **Why?** on any pick draws the streams from your apps, through the tastes
  they share, into the pick's match ring.
- **Events from posts:** paste a venue's Instagram or Facebook post and
  Tastemate reads the date, time, venue, city and price into an event
  for you to check. Friends see it too. Optionally follow venue accounts
  through Instagram's Business Discovery API.
- **Host:** pick an occasion (dinner party, house party, date night,
  birthday, brunch) and get one theme from your clusters, with wine,
  cocktails, a zero-proof drink, food, a playlist from your own saves, an
  invitation styled in the theme, a moodboard of your saves, and where to
  pick things up in your city.
- **Friends:** mutual friendships with a taste-match %. When a friend saves
  a spot, it shows up in your Next with their name on it.

## Project layout

```
server/
  app.js            Express app (createApp is used by the tests too)
  db.js             schema + helpers (node:sqlite)
  taxonomy.js       shared tag vocabulary, keyword rules, readSignals()
  taste-graph.js    interpret saves, profile, clusters, rank spots (pure)
  importers.js      parse each app's data export into saves
  posts.js          read a venue post into an event draft
  occasions.js      plan an occasion from a cluster (pure)
  routes/           auth, friends, saves (saves, graph, next, spots, occasion)
  providers/        venue-posts (Instagram Business Discovery)
  seed/             sample spots and demo users
web/src/            React SPA (pages/, components/, styles.css)
test/               node:test tests: graph, importers, posts, occasions, API
```

## Tests

```bash
npm test
```
