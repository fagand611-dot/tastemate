# ✦ Tastemate

Everything you save on **Spotify, Instagram, Google Maps and Pinterest**,
connected into one taste, and turned into *what should I do, buy or go to
next*: at home tomorrow, on a trip to Bangkok, or when you're having people
over tonight.

> **Tastemate turns everything you've saved, across every app, into your
> taste character, then into real things to do, see and buy, near you or on
> your next trip, with a little push beyond your usual.**

At its heart is the **taste graph**: Tastemate reads every save as a whole,
breaks it into what it says (one Olivia Dean song → neo-soul, warm, London,
2020s), and builds your character from what your saves say outright, what
they mean, and what they could be.

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
| `MUSICBRAINZ` | on | Set to `off` to stop looking up unknown artists on MusicBrainz |
| `MUSICBRAINZ_UA` | Tastemate UA | User-Agent MusicBrainz asks for (include a contact) |

Without the three `IG_` / `VENUE_` variables the venue feed is off; pasting
posts still works.

## What's in it

- **You** (the first tab), laid out like an app: your character on top,
  quick buttons and a tile for each part of you, each opening its own
  screen, and an **Add saves** button always one tap away. It reads you the
  way a personality test does, not as a list of what you saved:
  - a name, tagline and one-liner: *The Late-Night Listener, with a
    candlelit streak. You're drawn to low-lit rooms, records with a story
    and slow evenings.* With a cartoon emblem, and a share button;
  - **Your taste web:** a spider web of six sides of your life (music,
    food & drink, nights out, art & culture, style, travel), with
  - **How you roll** underneath: five dials (early bird ↔ night owl, homebody ↔ out
    and about, classic ↔ fresh, calm ↔ lively, local ↔ wanderer);
  - **The sides of you:** your top three sides, each proved by a few saves
    broken down into what they say;
  - **Your perfect day** in your home city (morning, afternoon, evening);
  - **Stretch your taste:** what your saves keep hinting at that you
    haven't explored;
  - **Your taste twin** among your friends;
  - **Everything is connected:** you (character and photo) in the middle
    of a crossword of your tastes, tied together with red string;
  - **Your world, in one picture:** what's in your bag and what your room
    looks like, drawn from your saves and labelled with them;
  - **Feed your Tastemate:** import the data export from each app (Spotify
    `YourLibrary.json`, Instagram `saved_collections.json`, Google Takeout
    `Saved Places.json` or list CSVs, pasted Pinterest pins) or add a save
    by hand. Everything you've saved stays in a drawer, each save shown as
    its parts (artist, sound, food, vibe, place, time, price, era), what
    it's tied to, and retaggable.
- **Breaking saves down:** each save is read for facets, in three tiers:
  **obvious** (says it), **translated** (means it: "Vinyl listening bar"
  → jazz, Olivia Dean → London neo-soul) and **could be** (goes with it, or
  matches your habits). Artists the built-in list doesn't know are looked up
  on MusicBrainz in the background and cached.
- **Next:** pick a city and Tomorrow, This weekend, Next 2 weeks or trip
  dates. Get events (*Worth leaving the house for*), places (*Spots with
  your name on them*) and things to buy (*Little things you'd love*), each
  with a short reason, plus **Something a little different** from your
  stretch tastes. Your own saves in that city come first (*Don't forget,
  you saved these*). Loving London artists counts towards London spots, and
  **under-the-radar** places get a boost. **Why?** on any pick is a postcard
  from your Tastemate: the place on the front, a handwritten note on the
  back saying which of your saves led there.
  **Make a night of it** pairs a show with a place a short walk away.
  Events look like old movie tickets; places and things show a photo with
  their taste icon as a label.
- **Events from posts:** paste a venue's Instagram or Facebook post and
  Tastemate reads the date, time, venue, city and price into an event
  for you to check. Friends see it too. Optionally follow venue accounts
  through Instagram's Business Discovery API.
- **Host:** the evening comes as an envelope; open it and the invitation,
  a ticket, the menu, a record and the rest spill out, each opening its
  detail. Pick an occasion (dinner party, house party, date night,
  birthday, brunch) and get one theme from your clusters, with wine,
  cocktails, a zero-proof drink, food, a playlist from your own saves, an
  invitation styled in the theme, a pinned collage of your saves, a venue
  to throw it at, your style of the night, the night hour by hour, who's
  coming (friends with their taste titles and what each should bring),
  the scene, ice-breakers, a countdown, and where to pick things up in
  your city.
- **Profile photo** next to your character, set from Account or the
  character card.
- **Friends:** mutual friendships with a taste-match %, each friend shown
  with their character and Tastemate title. When a friend saves
  a spot, it shows up in your Next with their name on it.

## Project layout

```
server/
  app.js            Express app (createApp is used by the tests too)
  db.js             schema + helpers (node:sqlite)
  taxonomy.js       shared tag vocabulary, keyword rules, readSignals()
  taste-graph.js    interpret saves, profile, clusters, character, connections, board, pairs, rank spots (pure)
  creators.js       built-in artist facts (sound, vibe, from, era)
  enrich.js         background artist lookups, cache, re-tagging
  importers.js      parse each app's data export into saves
  posts.js          read a venue post into an event draft
  occasions.js      plan an occasion from a cluster (pure)
  collage.js        your bag and your room, drawn from your saves (pure)
  routes/           auth, friends, profile (photo), saves (saves, graph, next, spots, occasion)
  providers/        venue-posts (Instagram Business Discovery), musicbrainz (artist facts)
  seed/             sample spots and demo users
web/src/            React SPA (pages/, components/, styles.css)
test/               node:test tests: graph, importers, posts, occasions, MusicBrainz, API
```

## Tests

```bash
npm test
```
