# Tastemate: design

> Everything you save everywhere, connected into *what should I do, buy or
> go to next*.

## 1. The problem

You have interests across many things, and a different app for each.
Songs you like (and the one you heard on the street) go into Spotify. Looks,
pastry accounts and art go into Instagram collections. Places you loved,
want to visit or were told about get starred in Google Maps. Rooms and
outfits go onto Pinterest boards.

Almost none of it gets used again:

- **Planning a trip, you forget.** In Bangkok you're overwhelmed and miss
  the gallery showing exactly the kind of art you save, or the jazz café you
  starred two years ago.
- **At home, only the big names reach you.** You'll hear about the stadium
  show. The small comedy-jazz night you'd love isn't pushed to anyone.
- **Each app sees a fragment.** "Moody jazz + dark academia outfits +
  candlelit wine bars" is one taste split across four apps, and each only
  recommends from its own catalogue.

## 2. Two layers, built in order

| Layer | What it is |
|---|---|
| **A. My saves, connected** | Saves from every app land in one place, read for what they signal, and grouped into visible taste clusters. |
| **B. Taste → action** | The clusters rank real events, places and products for a city and dates, and plan occasions. Every suggestion says which of your saves led to it. |

B only works once A exists. Products that try B without A end up with
generic recommendations, which is why import and interpretation come first.

## 3. Core journeys

1. **Import.** Upload each app's data export, or paste lines. Re-importing is safe.
2. **See your taste.** Clusters across apps, each with its evidence. Retag
   anything the reading got wrong.
3. **Tomorrow, at home.** Next for your home city, *Tomorrow*: small,
   matching events first, explained in your own saves.
4. **A trip.** Next for Bangkok with trip dates: your own Bangkok saves
   first, then events on while you're there, places (including ones that
   just opened), and things to buy.
5. **A post you saw.** Paste a venue's post; check the draft; it's in your
   plan, and friends who'd like it see it.
6. **Hosting tonight.** Pick the occasion and a theme from your clusters;
   get drinks, food, music, an invitation and a moodboard that belong together.

## 4. Reading saves: the taste graph

A keyword match alone isn't taste. Tastemate reads each save as a whole
(title, creator, collection, note) and records **signals** in three tiers
(`server/taxonomy.js` `readSignals`, `server/taste-graph.js` `interpret`):

| Tier | Meaning | Examples | Weight |
|---|---|---|---|
| **Obvious** | The save says it | "late night **jazz**", a tag you added | 1.0 |
| **Translated** | It means it without saying it | "listening bar" → jazz; Miles Davis → jazz; "@croissantdiaries" contains "croissant" → pastry; "concrete" → architecture | 0.7 |
| **Could be** | It goes with it, or your habits say so | vinyl *often goes with* jazz; *most of your intimate saves are also jazz* | 0.4 × strength, or 0.35 × P(B given A) |

- **Translation** uses keyword rules over a shared vocabulary, known artists
  (including "Duke Ellington & John Coltrane" → both), run-together handles
  (only inside things that look like handles, so "candlelit" isn't "candle"),
  and music genres, which carry their moods (jazz is also *chill* and
  *cerebral*, the same words a listening bar gets).
- **Could-be** signals come from hand-written associations (`ASSOCIATIONS`)
  and from the user's own co-occurrences: if tag A appears in at least 3
  saves and B appears in at least half of them, an A-only save could be B.
  They're weighted low, so they shape a cluster without inventing one.

**Profile** = Σ over saves of `signal confidence / √(firm signals in that save)`.

**Clusters** (`findPatterns`): the strongest tag not yet in a cluster seeds
one; the two tags it co-occurs with most describe it. A cluster is kept only
if at least two saves firmly support it and its saves span more than one
kind of thing or more than one app. Each cluster lists its evidence by tier,
so the UI can say *why jazz*.

### Your Tastemate character and the taste universe

The graph is shown to people as a character, not a chart (`tasteCharacter`,
`tasteWeb`). The **name** comes from the strongest tag with an archetype
("jazz" → *The Late-Night Listener*), the **tagline** from the next strongest
outside that side ("with a candlelit streak"). **Sides** are the top three
clusters with their share of saves. **Stretch** tastes are the strongest
could-be signals the person rarely says outright, leaving out pure moods:
the things to broaden into.

The **taste universe** draws tags as bubbles (size = strength), coloured and
haloed by side, joined by curved lines weighted by how often they're saved
together (could-be signals count less). Side colours are three categorical
slots validated as a set for colour-blind separation on both themes; text
stays in text colours and every bubble is labelled, so colour is never the
only cue. The same data is available as a cloud and as a plain list. **Why?**
on a pick in Next is a flow: apps → shared tastes → the pick's match ring,
with friends and other signals as grey streams and hints dashed.

## 5. Taste → action

### Next (`rankSpots`)

```
score = 0.6 · cosine(profile, spot tags)
      + 0.2 · tanh(0.6 · friends who saved it)
      + 0.1 · just opened (within 60 days)
      + 0.1 · (1 − popularity)
```

The last term is deliberate: it favours the under-the-radar things nobody
advertises to you. Filters: city (products without a city ship anywhere),
and events must overlap the chosen dates. Reasons come from your own saves,
grouped by app ("jazz: 4 on Spotify, 2 on Google Maps, 3 more could be"),
plus friends, new openings and hidden gems.

### Events from posts (`server/posts.js`)

Small venues announce on Instagram and Facebook first. `parsePost` reads a
caption into a draft: title (first line, without emoji and hashtags), date
(ISO, "14 Nov", "Nov 14th, 2027", "14–16 November", "14/11" day-first,
tonight, tomorrow, "this Saturday", rolling into next year when needed),
time ("8pm", "9.30pm", "20:00"), venue ("at …", "@ …", "📍 …"), city,
price ("€12", "free entry") and tags. Anything missing is listed so the
person fills it in. Spots added this way are visible to the person who
added them and their friends only.

### Host (`server/occasions.js`)

The theme is the cluster that best fits the occasion's leaning (date night
leans *romantic* and *intimate*, house party *lively*), switchable by the
user. The theme vector is the cluster's tags, the occasion's leaning and a
little of the wider profile. Hand-written idea lists for drinks, food and
records each carry tags in the same vocabulary and are scored against it.
The invitation takes the theme's type style, motif and palette (darkest
colour as background, readable text, most vivid readable accent). The
moodboard is the user's own saves that carry the theme, alternating kinds.

## 6. Data model

```
users(id, username, display_name, password_hash, home_city, created_at)
sessions(token, user_id, expires_at)
friendships(requester_id, addressee_id, status[pending|accepted], created_at)
saves(id, user_id, kind[song|place|look|product|art|food|event|other], title, creator,
      source[spotify|instagram|google_maps|pinterest|manual|tastemate], collection, url,
      note, city, tags[], spot_id?, external_key, saved_at, created_at)
      UNIQUE(user_id, source, external_key)        -- re-imports are idempotent
spots(id, kind[event|place|product], title, city, venue, creators[], tags[], description,
      starts_at, ends_at, opened_at, price, url, popularity 0..1, source, external_id,
      is_demo, added_by?)
spot_dismissals(user_id, spot_id)
```

Signals aren't stored: they're computed from saves on each read, so better
rules apply to old saves immediately. Saving a spot creates a save
(`source = tastemate`), so acting feeds the graph.

## 7. Honest feasibility

| Piece | Status | Notes |
|---|---|---|
| Spotify saves | **Feasible.** Export works now; the Web API (`/me/tracks`, OAuth) can sync live. | API artist genres would make songs mostly *obvious*. New apps start in a limited development mode and need Spotify's approval for wider access. |
| Instagram saves | **Export only.** No API exposes saved posts. | The export has the account and link but no caption or image, so collection names and handles carry the signal. Next: a share-sheet "save to Tastemate", then image and caption reading. |
| Google Maps saves | **Export only** (Takeout). | Name, address and URL are enough; the Places API can add categories. |
| Pinterest | **Feasible** via API v5 (OAuth); paste works today. | |
| Events from venue posts | **Feasible with official APIs.** Instagram Business Discovery reads public posts of business and creator accounts (venues almost always are). Facebook Pages need Page Public Content Access, which requires Meta's app review. | Scraping breaks Meta's terms; don't. Captions are messy, so the parser drafts and a person confirms, or the feed only keeps posts with a clear date, city and tags. |
| Wider event and venue coverage | **The hard part.** The demo uses sample data. | Combine listings and ticketing sources (Eventbrite, Resident Advisor, Dice, local guides) and venue data (Google Places, Foursquare). The long tail needs the post path above and people sharing. |
| Products | **Feasible with affiliate and retailer feeds**, including stock and sale data where shared. | Affiliate revenue is the obvious business model. |
| Interpretation quality | Rules and associations in v1. | Next: text and image embeddings, or an LLM that maps a save (caption, image) into the shared vocabulary with a tier. Scoring stays the same. |
| Privacy | Saves are private. Friends see only spots you saved or added. | Import just the saves files from an export; never ask for passwords to other apps. |

## 8. Architecture

```
web/ (React + Vite SPA)  ──/api──▶  server/ (Node + Express)
                                       ├─ SQLite (node:sqlite, a single file)
                                       ├─ taste-graph.js, occasions.js, posts.js (pure, unit-tested)
                                       └─ providers/venue-posts.js (optional)
```

One language, no native build steps, a database in a single file. Moving to
Postgres later means swapping `db.js`. Auth is username and password
(scrypt) with an opaque session token in an httpOnly cookie.

## 9. Roadmap

- Live Spotify and Pinterest sync over OAuth; a share-sheet "save to
  Tastemate" for Instagram posts and any link.
- Image and LLM reading of saves into the shared vocabulary, with tiers.
- Real event, venue and product feeds per city.
- Notifications: "a show you'd love is on near you this week".
- Group mode: plan a night for several people from the overlap of their clusters.
- Mobile app, Postgres and hosted deployment.
