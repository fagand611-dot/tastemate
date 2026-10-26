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

Settings come from the environment, or from a `.env` file in the project
folder (copy `.env.example`).

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | HTTP port |
| `DB_FILE` | `data/tastemate.db` | SQLite file |
| `PUBLIC_URL` | the address the request came to | Where people reach Tastemate; connect sign-ins come back to `PUBLIC_URL/api/connect/<app>/callback`. Set it in production |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | *(unset)* | Turns on **Connect Spotify** |
| `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` | *(unset)* | Turns on **Connect Instagram** |
| `TOKEN_KEY` | a key kept in `data/token.key` | 32-byte hex key that seals connected apps' tokens |
| `TICKETMASTER_API_KEY` | *(unset)* | Live events in Next ([Ticketmaster Discovery API](https://developer.ticketmaster.com), free) |
| `GOOGLE_PLACES_API_KEY` | *(unset)* | Live cafés, food, bars, shops and galleries in Next (Places API (New), billed by Google) |
| `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` | *(unset)* | Live things to buy in Next (eBay Browse API) |
| `EBAY_MARKETPLACE` | `EBAY_GB` | Which eBay site to search |
| `IG_USER_ID` | *(unset)* | Your Instagram business account ID, for the venue feed |
| `IG_ACCESS_TOKEN` | *(unset)* | A Meta Graph API token with `instagram_basic` |
| `VENUE_ACCOUNTS` | *(unset)* | Venues to follow, e.g. `Dublin:workmansclub,Bangkok:studiolam` |
| `MUSICBRAINZ` | on | Set to `off` to stop looking up unknown artists on MusicBrainz |
| `MUSICBRAINZ_UA` | Tastemate UA | User-Agent MusicBrainz asks for (include a contact) |

Without the three `IG_` / `VENUE_` variables the venue feed is off; pasting
posts still works.

### Live events and places in Next

Out of the box, places in Next are real, from **OpenStreetMap** (no key
needed): cafés, bakeries, bars, pubs, restaurants by cuisine, record and book
shops, vintage and wine shops, galleries, museums, cinemas, theatres and
clubs around the city centre, each linked to its website or map page
(`OSM=off` turns it off; set `OSM_CONTACT` to an email or URL, as its usage
policy asks). Events and things to buy are samples, marked *demo*, until
you add keys. With keys it fetches the real thing for whichever city someone
looks at, their home city included (any city, not just the samples'):

- **Events** from Ticketmaster (gigs, comedy, theatre, film), refreshed every
  few hours, 45 days ahead, with dates, venue, prices, a photo and the link
  to buy. Strongest in North America, Europe, Australia and New Zealand.
- **Places** from Google Places (replacing OpenStreetMap, with ratings and photos): thirteen searches per city (specialty coffee,
  bakeries, natural wine and cocktail bars, jazz bars, record and book shops,
  galleries, vintage and design stores, noodles, street food, brunch), kept if
  they're open and rated 4.2 or more by at least 20 people, refreshed weekly.
  Photos come through Tastemate, so the key stays on the server, and each
  card credits its rating and photographer as Google asks.

- **Things to buy** from eBay: sixteen searches that follow tastes (jazz,
  soul and folk on vinyl, a tweed blazer, a linen shirt, beeswax candles, a
  stoneware pour-over, a film camera, art prints...), new and secondhand,
  five of each, with price, photo and link. They ship, so they're fetched
  once for everyone, daily. eBay may ask you to apply for Buy API access
  before production use.

Once a city has live events or places (or there are live things to buy),
the sample ones step aside, per kind: live events with no live places still
shows sample places. A feed that fails is retried after half an hour and
never breaks the page.

### Connecting Spotify and Instagram

People connect their apps from **You → Add saves**. Each app needs to know
about Tastemate first:

**Spotify**
1. Go to the [Spotify developer dashboard](https://developer.spotify.com/dashboard)
   → *Create app*, tick *Web API*.
2. Add the redirect URI `PUBLIC_URL/api/connect/spotify/callback`. Locally
   that's `http://127.0.0.1:5173/api/connect/spotify/callback`. Spotify
   doesn't accept `localhost`, so open Tastemate at `http://127.0.0.1:5173`
   too.
3. Put the app's client ID and secret in `.env` as `SPOTIFY_CLIENT_ID` and
   `SPOTIFY_CLIENT_SECRET`, and restart.
4. New Spotify apps are in *development mode*: only people added under
   *User Management* in the dashboard can connect. Opening it to everyone
   needs Spotify's approval (an extended quota request).

What comes in: liked songs and saved albums (up to 2,000), with their
artists' genres, re-synced about once a day. Scopes: `user-library-read`,
`user-read-private`.

**Instagram**
1. At [Meta for Developers](https://developers.facebook.com/apps) create an
   app and add the **Instagram** product, *API setup with Instagram login*.
2. Add `PUBLIC_URL/api/connect/instagram/callback` as a valid OAuth redirect
   URI. Meta needs `https`, so for local testing use a tunnel (for example
   `cloudflared` or `ngrok`) and set `PUBLIC_URL` to it.
3. Put the Instagram app ID and secret (from the Instagram product's API
   setup page) in `.env` as `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET`.
4. Until the app passes Meta's app review for `instagram_business_basic`,
   only accounts added as Instagram testers can connect.

What comes in: the person's **own posts** (captions, links, dates), and only
for professional accounts (business or creator). Instagram doesn't let any
app read someone's *saved* posts, so those come from the data download:
people upload the whole ZIP Instagram sends them, and Tastemate finds
`saved_collections.json` and `saved_posts.json` in it, in the browser.

Tokens are sealed with AES-256-GCM before they're stored and never sent to
the browser. Disconnecting deletes them; the saves already brought in stay.

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
    looks like, drawn from your saves and labelled with them, and saved as
    an image to share;
  - **Feed your Tastemate:** **connect Spotify** (liked songs and saved
    albums, kept up to date) and **Instagram** (your own posts, for
    professional accounts), upload the download each app sends you (the
    whole ZIP is fine: Spotify, Instagram saved posts, Google Takeout), paste
    Pinterest pins, or add a save by hand. Everything you've saved stays in a drawer, each save shown as
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
  your city. **Send the invite** makes a link and sends it on WhatsApp,
  email or text, or through the phone's share sheet (Instagram, Messenger…)
  with the invitation as a picture. Guests open it without an account, see
  the invitation, the colours to wear, the menu and the records, and say
  yes, maybe or can't make it; the host sees who's coming.
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
  routes/           auth, friends, profile (photo), connect (apps), saves (saves, graph, next, spots, occasion)
  connect.js        connected apps: tokens, refresh, sync, daily re-sync
  ingest.js         rows from an import or a sync → tagged saves
  secrets.js        seal tokens at rest (AES-256-GCM)
  providers/        spotify and instagram (connect), venue-posts (Instagram Business Discovery), musicbrainz (artist facts)
  seed/             sample spots and demo users
web/src/            React SPA (pages/, components/, styles.css)
test/               node:test tests: graph, importers, posts, occasions, MusicBrainz, API
```

## Tests

```bash
npm test
```
