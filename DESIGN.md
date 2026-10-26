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
2. **Meet your Tastemate.** The You tab comes first: your character, dials,
   sides with proof, a perfect day in your city, stretch tastes and your taste
   twin. Your raw saves stay in a drawer, each shown as its parts, retaggable.
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

- **Facets.** Every signal belongs to a facet (`facetOf`): **sound**,
  **food**, **vibe**, **place**, **time** (day or night), **price**, **era**
  or **thing**, plus the **artist** itself. One
  save breaks down into several: "Dive — Olivia Dean" → neo-soul, soul, pop
  · warm, uplifting, romantic · London · 2020s; "Noodle street shop" in
  Bangkok → noodles, street food · casual · late night · budget · Bangkok.
  The city a save was made in, or a city named in it, counts as a place.
- **Weights.** Keyword rules carry a weight per attribute (`'night out@0.5'`):
  a wine bar is surely moody and only probably a night out. A signal's
  confidence is its tier × that weight.
- **Artist facts** come from a built-in list (`server/creators.js`) and,
  for anyone else, from MusicBrainz (`providers/musicbrainz.js`): where
  they're from, sounds from community tags (kept only when they're sounds
  we know), and a band's formation decade (never a person's birth year).
  Lookups run in the background at MusicBrainz's pace of one a second
  (`server/enrich.js`), every answer is cached in `creator_facts` (including
  "no match", so it isn't asked again), and the saves that mention the
  artist get the new tags added, keeping the person's own edits.
- **Translation** uses keyword rules over a shared vocabulary, artist facts
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

**Connections** (`connectSaves`): every save is tied to the few others it
shares the most with. Strength is the sum, over shared firm attributes, of
the lower confidence × how much that kind of attribute says about taste
(artist 1.4, sound and food 1, things 0.9, vibe 0.8, place 0.7, era 0.5,
time 0.4, price 0.3); very broad tags ("food", "art") count for 0.3. Only
saves that share a tag are compared, through an index by tag. The drawer
shows each save's ties ("Tied to Blue in Green, by Miles Davis, jazz").

**The taste board** (`tasteBoard`): your strongest tastes (at most four
moods and three of anything else, so it's a mix), each with a weight
relative to the top one, its facet, its side and the saves behind it, and
threads between tastes that turn up together in at least two saves.

### Your Tastemate character

People don't come back to a list of their own tags; they come back to a
character, the way personality tests work. So the graph is shown only as a
character (`tasteCharacter`), never as a chart:

- **Name and tagline.** The name comes from the strongest tag with an
  archetype, preferring something specific over a mood ("jazz" → *The
  Late-Night Listener*); the tagline from your next side ("with a
  candlelit streak"). A one-line **description** strings together phrases
  for your top tastes ("low-lit rooms, records with a story and slow
  evenings").
- **Five dials** (`vibeDials`), each a ratio between opposites read from
  your tastes and saves: early bird ↔ night owl, homebody ↔ out and about
  (kinds of saves), classic ↔ fresh (eras), calm ↔ lively, local ↔ wanderer
  (how many places you save in). A dial with nothing to go on is left out.
- **Sides** are the top three clusters, each with its own name ("your
  jazz-bar soul") and up to three saves of different kinds as proof, broken
  down into facet chips. A save proves only one side.
- **Your perfect day** (`perfectDay`): the best-matching spot in your home
  city for the morning (cafés, bakeries, markets), the afternoon (galleries,
  shops, craft) and the evening (bars, gigs, events in the next week), three
  different places.
- **Stretch** tastes are the strongest could-be signals you rarely say
  outright, only sounds and things (never moods, places or eras): the
  things to broaden into. Next turns them into *Something a little different*.
- **Taste twin:** the friend whose profile is closest, and what you share.
- **Everything is connected:** the taste board drawn as a crossword pinned
  around your character (and your photo): each taste a word in letter
  blocks, bigger blocks for bigger loves, coloured by facet, tied to you with
  red string, with dashed threads between tastes that go together. Tap a
  word to light up what it's tied to. On phones the words wrap below you.
- **Profile photo:** each person has their character and, if they like, a
  photo, cropped and shrunk to 320px in the browser and shown as a taped
  polaroid on the character card and in the top bar.

It's drawn as a playful card with a cartoon emblem (`TasteArt`), sticker-
style side cards and dial knobs. Side colours are three categorical slots
validated as a set for colour-blind separation on both themes, and text
always stays in text colours. **Why?** on a pick in Next is the one
explanatory picture: streams from your apps, through the tastes they share,
pouring into the pick's match ring, with friends and extras in grey and
hints dashed.

### Look and feel

Wes Anderson colours meet Pop Mart toys, on paper white, with the idea that
*everything is connected* running through it (red string, pins, crosswords):

- **Palette:** flat Wes Anderson blocks (Mendl's pink, sky, butter, mint,
  peach, lilac, cream) with navy ink and a coral accent; red string
  (`--thread`) for anything that ties things together. Dark mode is navy
  with the same blocks. Side colours (teal, coral, violet) are validated as
  a set for colour-blind separation on both themes.
- **Objects for things:** events are old movie tickets (ADMIT ONE, a stub
  with the date, a barcode and a serial number), places are polaroids,
  products have price tags, music is vinyl that spins on hover, and the Host
  moodboard is a cork board of pinned polaroids tied with red string.
- **Character art:** the Tastemate mascot, a round big-eyed Crybaby-ish
  character with blush cheeks and a single tear, holding a sticker of your
  taste, on a candy-striped pastry-box card. It blinks and bobs.
- **Type:** Jost for headlines (geometric, a little retro), Nunito for
  text, 16px base.
- **Interaction:** outlined buttons and cards with a hard offset shadow
  that press flat, cards that tilt on hover, stickers that wiggle, pages
  that float in, a floating tab bar on phones. Everything respects
  reduced-motion settings.

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

**Make a night of it** (`pairSpots`): each top event is paired with the
best-matching place within 1.5 km in the same city (taste first, a little
for being closer), with the walk in minutes and the tastes it's picked for:
*the screening, and a café a doorstep from the cinema*. Spots carry
coordinates for this.

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
moodboard is the user's own saves that carry the theme, alternating kinds,
pinned up as a collage. **Throw it at:** the place in the chosen city that
best fits the theme ("throw a Moody jazz supper at the candlelit wine bar").
**Your style of the night:** the dress line and the theme's colours to
wear.

## 6. Data model

```
users(id, username, display_name, password_hash, home_city, avatar?, avatar_at?, created_at)
sessions(token, user_id, expires_at)
friendships(requester_id, addressee_id, status[pending|accepted], created_at)
saves(id, user_id, kind[song|place|look|product|art|food|event|other], title, creator,
      source[spotify|instagram|google_maps|pinterest|manual|tastemate], collection, url,
      note, city, tags[], spot_id?, external_key, saved_at, created_at)
      UNIQUE(user_id, source, external_key)        -- re-imports are idempotent
spots(id, kind[event|place|product], title, city, venue, creators[], tags[], description,
      starts_at, ends_at, opened_at, price, url, popularity 0..1, source, external_id,
      lat?, lng?, is_demo, added_by?)
spot_dismissals(user_id, spot_id)
creator_facts(name, facts?, fetched_at)            -- MusicBrainz answers, null = no match
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
| Artist facts | **Feasible.** Built-in list plus MusicBrainz (free, no key, one request a second), cached. | Community tags are uneven, so only known sounds are kept. Spotify's artist genres and Last.fm tags would add more; an LLM could add vibe words. |
| Interpretation quality | Rules, associations and artist facts in v1. | Next: text and image embeddings, or an LLM that maps a save (caption, image) into the shared vocabulary with a tier. Scoring stays the same. |
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
