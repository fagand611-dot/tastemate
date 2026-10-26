// Sample spots (events, places, products) and sample saves for the demo
// accounts. Real deployments would fill spots from event and venue feeds
// (DESIGN.md §7); these exist so Next works out of the box.
//
// Events: [title, city, venue, tags, startOffsetDays, lengthDays, popularity, description, creators?]
// Places: [title, city, venue, tags, openedDaysAgo | null, popularity, description]
// Products: [title, city | null, store, tags, price, popularity, description]

export const SPOT_CITIES = ['Bangkok', 'London', 'Dublin', 'Tokyo'];

export const EVENTS = [
  ['Late-night jazz at a listening bar', 'Bangkok', 'Studio Lam', ['jazz', 'vinyl', 'intimate', 'chill', 'moody'], 1, 1, 0.25, 'Original pressings, a small room and a sound system built for it.'],
  ['Contemporary Thai artists: group show', 'Bangkok', 'Bangkok Art and Culture Centre', ['art', 'contemporary art', 'gallery', 'cerebral'], -5, 40, 0.55, 'Twelve artists working in installation, photography and textiles.'],
  ['Night market and street food crawl', 'Bangkok', 'Jodd Fairs', ['market', 'street food', 'food', 'lively', 'thai'], 2, 1, 0.8, 'A guided walk through the stalls, with a local food writer.'],
  ['Ceramics studio open day', 'Bangkok', 'Charoenkrung Craft House', ['art', 'craft', 'minimal', 'hidden gem'], 3, 2, 0.12, 'Throw a bowl, meet the potters, buy straight from the kiln.'],
  ['Deep house rooftop session', 'Bangkok', 'Octave Rooftop', ['house', 'rooftop', 'high-energy', 'lively'], 4, 1, 0.6, 'Sunset to late. Local selectors.'],
  ['Comedy and jazz night', 'Dublin', 'The Workman’s Club', ['comedy', 'funny', 'jazz', 'intimate', 'live music'], 6, 1, 0.3, 'Stand-up sets between trio sets. Small room, bring a friend.'],
  ['Irish folk session, upstairs', 'Dublin', 'The Cobblestone', ['folk', 'live music', 'intimate', 'emotional'], 1, 1, 0.45, 'An open session; no stage, just a circle of players.'],
  ['Photography after dark: exhibition', 'Dublin', 'Gallery of Photography', ['art', 'photography', 'gallery', 'moody', 'dark'], -10, 30, 0.35, 'Night photography from the city, 1950s to now.'],
  ['Candlelit string quartet', 'London', 'St Martin-in-the-Fields', ['classical', 'moody', 'intimate', 'romantic', 'atmospheric'], 5, 1, 0.7, 'Film scores and Vivaldi by candlelight.'],
  ['Brutalist architecture walking tour', 'London', 'Barbican Centre', ['architecture', 'design', 'minimal', 'dark'], 2, 1, 0.3, 'Two hours through the estate, the conservatory and the towers.'],
  ['Natural wine and vinyl evening', 'London', 'Brawn', ['wine bar', 'vinyl', 'intimate', 'jazz'], 3, 1, 0.2, 'A winemaker pours; a DJ plays records only.'],
  ['Dark academia book club: The Secret History', 'London', 'Daunt Books Marylebone', ['books', 'dark academia', 'cerebral', 'cozy', 'moody'], 8, 1, 0.15, 'Discussion, tea and a reading from a new campus novel.'],
  ['Techno all-nighter', 'London', 'Fabric', ['techno', 'high-energy', 'dark', 'lively'], 6, 1, 0.75, 'Three rooms, eight hours.'],
  ['Kissa jazz evening', 'Tokyo', 'JBS Shibuya', ['jazz', 'vinyl', 'intimate', 'chill'], 2, 1, 0.3, 'A wall of records and an owner who takes requests.'],
  ['Outdoor screening: In the Mood for Love', 'Bangkok', 'Lumpini Park lawn', ['film', 'cinema', 'romantic', 'atmospheric', 'night out'], 3, 1, 0.35, 'Wong Kar-wai under the trees. Bring a blanket.', ['Wong Kar-wai']],
  ['Film club: Paris, Texas on 35mm', 'Dublin', 'Irish Film Institute', ['film', 'cinema', 'cerebral', 'atmospheric'], 4, 1, 0.3, 'A print screening with a short talk before.', ['Wim Wenders']],
  ['Late screening: Jazz on a Summer’s Day', 'London', 'Prince Charles Cinema', ['film', 'cinema', 'jazz', 'vintage', 'night out'], 5, 1, 0.25, 'The 1958 festival film, restored, at 11pm.'],
];

export const PLACES = [
  ['Kissa-style listening café', 'Bangkok', 'Ari', ['coffee', 'vinyl', 'jazz', 'cozy', 'intimate'], 21, 0.18, 'Hand-drip coffee by day, records at night.'],
  ['Laminated: a croissant bakery', 'Bangkok', 'Thonglor', ['pastry', 'food', 'coffee'], 14, 0.4, 'Croissants laminated over three days. Sells out by noon.'],
  ['Speakeasy behind a noodle shop', 'Bangkok', 'Chinatown', ['cocktails', 'speakeasy', 'intimate', 'moody', 'hidden gem'], null, 0.22, 'Order the house noodle, then ask for the back room.'],
  ['Riverside contemporary gallery', 'Bangkok', 'Charoenkrung', ['art', 'gallery', 'contemporary art', 'minimal'], null, 0.3, 'A converted warehouse on the river.'],
  ['Brutalist bookshop and café', 'Bangkok', 'Silom', ['books', 'coffee', 'architecture', 'minimal', 'cerebral'], null, 0.25, 'Concrete shelves, design books, very good iced latte.'],
  ['New pastry counter by a Parisian chef', 'London', 'Shoreditch', ['pastry', 'food', 'viennoiserie', 'minimal'], 9, 0.35, 'Just opened. Pistachio cruffins and a short coffee menu.'],
  ['Candlelit wine bar in a railway arch', 'London', 'Bermondsey', ['wine bar', 'intimate', 'moody', 'romantic'], null, 0.4, 'Low arches, natural wine, small plates.'],
  ['Members-free jazz basement', 'London', 'Soho', ['jazz', 'live music', 'intimate', 'moody'], null, 0.55, 'Walk-ins after 10pm.'],
  ['Specialty coffee and records', 'Dublin', 'Stoneybatter', ['coffee', 'vinyl', 'cozy'], 30, 0.2, 'Second-hand jazz and soul by the till.'],
  ['Pastry and natural wine bistro', 'Dublin', 'Portobello', ['pastry', 'wine bar', 'food', 'intimate'], null, 0.3, 'Bakery in the morning, wine bar at night.'],
  ['Art-house café next to the gallery', 'Bangkok', 'Pathum Wan', ['coffee', 'art', 'design', 'cozy'], 40, 0.2, 'Rotating shows on the walls, very good flat whites.'],
  ['Tiny café on Meeting House Square', 'Dublin', 'Temple Bar', ['coffee', 'pastry', 'art'], null, 0.25, 'Window seats looking straight at the gallery.'],
  ['Noodle shop with a queue at midnight', 'Bangkok', 'Chinatown', ['food', 'noodles', 'street food', 'night out', 'budget', 'thai'], null, 0.45, 'Boat noodles until 2am. Cash only.'],
];

export const PRODUCTS = [
  ['Charcoal wool overcoat, relaxed cut', 'Dublin', 'Arnotts, Henry Street', ['tailoring', 'outerwear', 'minimal', 'classic', 'dark academia'], '€240 (was €320)', 0.5, 'In store now, sizes S–XL.'],
  ['Tweed blazer, vintage', 'London', 'Rokit, Covent Garden', ['dark academia', 'tailoring', 'vintage'], '£68', 0.3, 'Hand-picked vintage; one of each.'],
  ['Linen camp shirt', 'Bangkok', 'Siam Discovery', ['minimal', 'linen', 'chill'], '฿1,490', 0.4, 'Breathable and very Bangkok.'],
  ['Stoneware pour-over set', null, 'Ships worldwide', ['coffee', 'craft', 'minimal'], '$58', 0.25, 'Made by a small studio; ships to Ireland, UK, Thailand.'],
  ['Blue Note reissue on 180g vinyl', null, 'Ships worldwide', ['jazz', 'vinyl'], '$34', 0.45, 'The Tone Poet series, mastered from the original tapes.'],
  ['Long wool trench in camel', null, 'Ships to Ireland and UK', ['tailoring', 'outerwear', 'classic', 'minimal'], '€190', 0.55, 'Free returns within 30 days.'],
  ['Natural and skin-contact wine, by the bottle', 'Dublin', 'A small wine shop, Drury Street', ['wine bar', 'intimate', 'craft', 'moody'], '€18–35', 0.3, 'Ask for something orange and textured.'],
  ['Pastry box to pre-order', 'Dublin', 'Neighbourhood bakery, Stoneybatter', ['pastry', 'coffee'], '€22', 0.25, 'Order by 8pm for the next morning.'],
  ['Old-world reds: Nebbiolo, Rhône Syrah', 'London', 'Wine merchant, Clerkenwell', ['wine bar', 'moody', 'dark', 'food'], '£20–60', 0.35, 'Staff will match a bottle to your menu.'],
  ['Natural wine shop and bar', 'Bangkok', 'Ari', ['wine bar', 'chill', 'intimate'], '฿900+', 0.3, 'Takeaway bottles and a fridge of pét-nat.'],
  ['Beeswax dinner candles, set of 6', null, 'Ships worldwide', ['moody', 'intimate', 'cozy', 'romantic'], '$24', 0.3, 'Slow-burning, smoke-free.'],
];

// Where things are, so Next can pair a show with somewhere to eat nearby.
const COORDS = {
  'Late-night jazz at a listening bar': [13.7313, 100.5847],
  'Contemporary Thai artists: group show': [13.7466, 100.53],
  'Night market and street food crawl': [13.757, 100.566],
  'Ceramics studio open day': [13.7235, 100.515],
  'Deep house rooftop session': [13.7236, 100.5806],
  'Outdoor screening: In the Mood for Love': [13.7314, 100.5414],
  'Kissa-style listening café': [13.7797, 100.5446],
  'Laminated: a croissant bakery': [13.731, 100.579],
  'Speakeasy behind a noodle shop': [13.7398, 100.5094],
  'Riverside contemporary gallery': [13.7225, 100.514],
  'Brutalist bookshop and café': [13.7262, 100.53],
  'Art-house café next to the gallery': [13.7469, 100.5306],
  'Noodle shop with a queue at midnight': [13.7405, 100.5101],
  'Comedy and jazz night': [53.3452, -6.2672],
  'Irish folk session, upstairs': [53.3497, -6.278],
  'Photography after dark: exhibition': [53.3449, -6.2672],
  'Film club: Paris, Texas on 35mm': [53.3446, -6.265],
  'Specialty coffee and records': [53.353, -6.284],
  'Pastry and natural wine bistro': [53.3318, -6.265],
  'Tiny café on Meeting House Square': [53.3451, -6.2667],
  'Candlelit string quartet': [51.5089, -0.1265],
  'Brutalist architecture walking tour': [51.5202, -0.0937],
  'Natural wine and vinyl evening': [51.529, -0.07],
  'Dark academia book club: The Secret History': [51.5205, -0.1525],
  'Techno all-nighter': [51.5197, -0.1026],
  'Late screening: Jazz on a Summer’s Day': [51.5112, -0.1302],
  'New pastry counter by a Parisian chef': [51.526, -0.078],
  'Candlelit wine bar in a railway arch': [51.498, -0.079],
  'Members-free jazz basement': [51.5135, -0.132],
  'Kissa jazz evening': [35.6595, 139.7005],
};

// Stand-in photos for the sample places and things (Unsplash). A real feed
// brings its own; without one the card falls back to its illustration.
const PHOTOS = {
  'Kissa-style listening café': '1501339847302-ac426a4a7cbb',
  'Laminated: a croissant bakery': '1555507036-ab1f4038808a',
  'Speakeasy behind a noodle shop': '1470337458703-46ad1756a187',
  'Riverside contemporary gallery': '1460661419201-fd4cecdf8a8b',
  'Brutalist bookshop and café': '1481627834876-b7833e8f5570',
  'New pastry counter by a Parisian chef': '1509440159596-0249088772ff',
  'Candlelit wine bar in a railway arch': '1510812431401-41d2bd2722f3',
  'Members-free jazz basement': '1415201364774-f6f0bb35f28f',
  'Specialty coffee and records': '1554118811-1e0d58224f24',
  'Pastry and natural wine bistro': '1517248135467-4c7edcad34c4',
  'Art-house café next to the gallery': '1509042239860-f550ce710b93',
  'Tiny café on Meeting House Square': '1495474472287-4d71bcdd2085',
  'Noodle shop with a queue at midnight': '1569718212165-3a8278d5f624',
  'Charcoal wool overcoat, relaxed cut': '1591047139829-d91aecb6caea',
  'Tweed blazer, vintage': '1507679799987-c73779587ccf',
  'Linen camp shirt': '1596755094514-f87e34085b2c',
  'Stoneware pour-over set': '1495474472287-4d71bcdd2085',
  'Blue Note reissue on 180g vinyl': '1483412033650-1015ddeb83d1',
  'Long wool trench in camel': '1544022613-e87ca75a784a',
  'Natural and skin-contact wine, by the bottle': '1506377247377-2a5b3b417ebb',
  'Pastry box to pre-order': '1555507036-ab1f4038808a',
  'Old-world reds: Nebbiolo, Rhône Syrah': '1510812431401-41d2bd2722f3',
  'Natural wine shop and bar': '1506377247377-2a5b3b417ebb',
  'Beeswax dinner candles, set of 6': '1602874801006-e26c4c5b5e8a',
};
const photo = (id) => id && `https://images.unsplash.com/photo-${id}?w=640&q=70&auto=format&fit=crop`;

/** Spot rows with dates relative to `now`. */
export function demoSpots(now = new Date()) {
  const day = (offset) => new Date(now.getTime() + offset * 864e5).toISOString().slice(0, 10);
  const rows = [];
  for (const [title, city, venue, tags, start, len, popularity, description, creators] of EVENTS) {
    rows.push({ kind: 'event', title, city, venue, tags, creators, starts_at: day(start), ends_at: len > 1 ? day(start + len - 1) : null, popularity, description });
  }
  for (const [title, city, venue, tags, openedAgo, popularity, description] of PLACES) {
    rows.push({ kind: 'place', title, city, venue, tags, opened_at: openedAgo != null ? day(-openedAgo) : null, popularity, description });
  }
  for (const [title, city, venue, tags, price, popularity, description] of PRODUCTS) {
    rows.push({ kind: 'product', title, city, venue, tags, price, popularity, description });
  }
  return rows.map((r) => ({ ...r, lat: COORDS[r.title]?.[0], lng: COORDS[r.title]?.[1], image: photo(PHOTOS[r.title]), source: 'seed', external_id: `${r.kind}:${r.title}`, is_demo: true }));
}

// Saves for the demo account, across four apps: [source, kind, title, creator, collection, city]
export const DEMO_SAVES = [
  ['spotify', 'song', 'So What', 'Miles Davis', 'Kind of Blue'],
  ['spotify', 'song', 'In a Sentimental Mood', 'Duke Ellington & John Coltrane', 'Ellington & Coltrane'],
  ['spotify', 'song', 'Blue in Green', 'Miles Davis & Bill Evans', 'Kind of Blue'],
  ['spotify', 'song', 'Take Five', 'The Dave Brubeck Quartet', 'Time Out'],
  ['spotify', 'song', 'Pink Moon', 'Nick Drake', 'Pink Moon · folk'],
  ['spotify', 'song', 'Teardrop', 'Massive Attack', 'Mezzanine'],
  ['spotify', 'song', 'Strings of Life', 'Rhythim Is Rhythim', 'Strings of Life'],
  ['instagram', 'look', '@thecharcoalcoat', 'thecharcoalcoat', 'Coats'],
  ['instagram', 'look', '@oldlibraryfits', 'oldlibraryfits', 'Dark academia'],
  ['instagram', 'look', '@tweedandtea', 'tweedandtea', 'Dark academia'],
  ['instagram', 'food', '@laminationlab', 'laminationlab', 'Pastry'],
  ['instagram', 'food', '@croissantdiaries', 'croissantdiaries', 'Pastry'],
  ['instagram', 'art', '@quietceramics', 'quietceramics', 'Ceramics'],
  ['instagram', 'art', '@concrete.daily', 'concrete.daily', 'Brutalist architecture'],
  ['google_maps', 'place', 'Candlelit wine bar near the canal', null, 'Want to go', 'Dublin'],
  ['google_maps', 'place', 'Vinyl listening bar', null, 'Loved', 'Tokyo'],
  ['google_maps', 'place', 'Speakeasy with a hi-fi', null, 'Want to go', 'London'],
  ['instagram', 'other', '@bluenote.records', 'bluenote.records', 'Music'],
  ['google_maps', 'place', 'Jazz café with a record wall', null, 'Bangkok trip', 'Bangkok'],
  ['google_maps', 'place', 'Specialty coffee, Ari', null, 'Bangkok trip', 'Bangkok'],
  ['google_maps', 'place', 'Bookshop café', null, 'Loved', 'London'],
  ['pinterest', 'look', 'Minimal wool coat outfit', null, 'Winter'],
  ['instagram', 'other', '@criterioncollection', 'criterioncollection', 'Films to watch'],
  ['google_maps', 'place', 'Noodle street shop', null, 'Bangkok trip', 'Bangkok'],
  ['pinterest', 'art', 'Candle-lit reading nook, moody', null, 'Home'],
];

// A few saves for each demo friend, so taste matches mean something:
// [source, kind, title, creator, collection, city]
export const FRIEND_SAVES = {
  maya: [
    ['spotify', 'song', 'Pink Moon', 'Nick Drake', 'Pink Moon · folk'],
    ['instagram', 'art', '@nightphotography', 'nightphotography', 'Photography'],
    ['google_maps', 'place', 'Candlelit wine bar', null, 'Want to go', 'London'],
    ['pinterest', 'look', 'Dark academia knitwear', null, 'Autumn'],
  ],
  sam: [
    ['spotify', 'song', 'Strings of Life', 'Rhythim Is Rhythim', 'Strings of Life'],
    ['spotify', 'song', 'One More Time', 'Daft Punk', 'Discovery'],
    ['google_maps', 'place', 'Rooftop bar', null, 'Loved', 'Bangkok'],
    ['instagram', 'look', '@sneakerdrops', 'sneakerdrops', 'Streetwear'],
  ],
  jo: [
    ['instagram', 'other', '@standupclips', 'standupclips', 'Comedy'],
    ['spotify', 'song', 'Take Five', 'The Dave Brubeck Quartet', 'Time Out'],
    ['google_maps', 'place', 'Croissant bakery', null, 'Want to go', 'London'],
  ],
};

// Spots demo friends have saved, so Next can say "Maya saved it".
export const FRIEND_SPOT_SAVES = {
  maya: ['Photography after dark: exhibition', 'Kissa-style listening café', 'Dark academia book club: The Secret History', 'Candlelit wine bar in a railway arch'],
  sam: ['Deep house rooftop session', 'Techno all-nighter', 'Laminated: a croissant bakery'],
  jo: ['Comedy and jazz night', 'New pastry counter by a Parisian chef'],
};
