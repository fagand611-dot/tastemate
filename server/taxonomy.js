import { CREATORS, SOUND_PARENTS, creatorFacts } from './creators.js';

// The shared tag vocabulary. Every save, spot and idea is described in
// these words (jazz, intimate, pastry, tailoring…), which is what lets a
// jazz playlist point at a wine bar.

// Music genres and the moods they carry, so a jazz track also reads as
// chill and cerebral, the same words a listening bar is tagged with.
export const MUSIC_GENRES = ['house', 'techno', 'electronic', 'rock', 'indie', 'folk', 'pop', 'hip-hop', 'jazz', 'soul', 'metal', 'ambient', 'country', 'classical', 'punk'];

export const GENRE_MOODS = {
  house: ['high-energy', 'uplifting'],
  techno: ['high-energy', 'dark'],
  electronic: ['high-energy', 'atmospheric'],
  rock: ['high-energy'],
  indie: ['nostalgic'],
  folk: ['chill', 'emotional', 'atmospheric'],
  pop: ['uplifting'],
  'hip-hop': ['gritty', 'high-energy'],
  jazz: ['chill', 'cerebral'],
  soul: ['emotional', 'romantic'],
  metal: ['dark', 'high-energy'],
  ambient: ['atmospheric', 'chill'],
  country: ['nostalgic', 'emotional'],
  classical: ['atmospheric', 'epic'],
  punk: ['high-energy', 'gritty'],
};

// Other ways a genre gets written.
const ALIASES = {
  'deep house': 'house',
  'tech house': 'house',
  'progressive house': 'house',
  'alternative rock': 'rock',
  'hard rock': 'rock',
  'classic rock': 'rock',
  'indie rock': 'indie',
  'indie folk': 'folk',
  'folk rock': 'folk',
  'singer-songwriter': 'folk',
  'r&b': 'soul',
  rap: 'hip-hop',
  'hip hop': 'hip-hop',
  'heavy metal': 'metal',
  electronica: 'electronic',
  edm: 'electronic',
  dance: 'electronic',
  'trip-hop': 'electronic',
};

/** Normalise a genre string to our vocabulary, or return null. */
export function normalizeGenre(raw) {
  if (!raw) return null;
  const g = String(raw).trim().toLowerCase();
  if (MUSIC_GENRES.includes(g)) return g;
  if (ALIASES[g]) return ALIASES[g];
  return MUSIC_GENRES.find((known) => g.includes(known)) || null;
}

export function moodsForGenres(genres) {
  return [...new Set(genres.flatMap((g) => GENRE_MOODS[g] || []))];
}

// ----- Saves -----
// A save is anything you kept in another app: a song, a place, a look, a
// product.

export const SAVE_KINDS = ['song', 'place', 'look', 'product', 'art', 'food', 'event', 'other'];
export const SAVE_SOURCES = ['spotify', 'instagram', 'google_maps', 'pinterest', 'manual', 'tastemate'];
export const SPOT_KINDS = ['event', 'place', 'product'];

// Keyword → tags. Matched against a save's title, note, collection and
// creator, so "Candlelit wine bar" picks up wine bar, intimate and moody.
// Order doesn't matter; every matching keyword adds its tags.
export const VIBE_KEYWORDS = {
  jazz: ['jazz', 'chill', 'cerebral'],
  'bossa nova': ['jazz', 'chill', 'romantic'],
  blues: ['jazz', 'emotional'],
  soul: ['soul', 'emotional'],
  techno: ['techno', 'high-energy', 'dark'],
  house: ['house', 'high-energy'],
  'deep house': ['house', 'chill'],
  disco: ['house', 'high-energy', 'nostalgic'],
  vinyl: ['vinyl', 'vintage'],
  'record store': ['vinyl', 'vintage'],
  'listening bar': ['vinyl', 'jazz', 'intimate', 'night out@0.6'],
  folk: ['folk', 'chill'],
  acoustic: ['folk', 'intimate'],
  ambient: ['ambient', 'atmospheric'],
  'lo-fi': ['ambient', 'chill'],
  indie: ['indie', 'nostalgic'],
  'stand-up': ['comedy', 'funny'],
  comedy: ['comedy', 'funny'],
  improv: ['comedy', 'funny', 'intimate'],
  gallery: ['art', 'gallery', 'cerebral'],
  museum: ['art', 'gallery', 'cerebral'],
  exhibition: ['art', 'gallery'],
  'contemporary art': ['art', 'contemporary art', 'cerebral'],
  installation: ['art', 'contemporary art', 'weird'],
  ceramics: ['art', 'craft', 'minimal'],
  photography: ['art', 'photography'],
  print: ['art', 'design'],
  design: ['design', 'minimal'],
  architecture: ['design', 'architecture'],
  brutalist: ['architecture', 'minimal', 'dark'],
  pastry: ['pastry', 'food', 'daytime@0.6'],
  croissant: ['pastry', 'food', 'daytime@0.6'],
  bakery: ['pastry', 'food', 'cozy', 'daytime@0.7'],
  patisserie: ['pastry', 'food'],
  viennoiserie: ['pastry', 'food'],
  coffee: ['coffee', 'cozy', 'daytime@0.6'],
  cafe: ['coffee', 'cozy', 'daytime@0.6'],
  'specialty coffee': ['coffee', 'minimal'],
  matcha: ['coffee', 'minimal'],
  'wine bar': ['wine bar', 'intimate', 'romantic', 'night out@0.6'],
  'natural wine': ['wine bar', 'intimate'],
  wine: ['wine bar'],
  cocktail: ['cocktails', 'intimate', 'night out@0.7'],
  speakeasy: ['cocktails', 'intimate', 'moody', 'night out'],
  rooftop: ['rooftop', 'lively', 'night out@0.5'],
  candlelit: ['moody', 'intimate', 'romantic', 'night out@0.5'],
  candle: ['moody', 'cozy'],
  moody: ['moody', 'dark', 'atmospheric'],
  'dark academia': ['dark academia', 'moody', 'vintage', 'cerebral'],
  tweed: ['dark academia', 'tailoring', 'vintage'],
  wool: ['tailoring', 'cozy'],
  coat: ['tailoring', 'outerwear'],
  trench: ['tailoring', 'outerwear', 'classic'],
  blazer: ['tailoring', 'classic'],
  tailoring: ['tailoring', 'classic'],
  minimal: ['minimal'],
  minimalist: ['minimal'],
  linen: ['minimal', 'chill'],
  vintage: ['vintage', 'nostalgic'],
  thrift: ['vintage', 'budget@0.6'],
  streetwear: ['streetwear', 'high-energy'],
  sneaker: ['streetwear'],
  gorpcore: ['outdoors', 'streetwear'],
  hiking: ['outdoors', 'uplifting'],
  trail: ['outdoors'],
  park: ['outdoors', 'chill'],
  beach: ['outdoors', 'chill'],
  bookshop: ['books', 'cozy', 'cerebral'],
  bookstore: ['books', 'cozy', 'cerebral'],
  library: ['books', 'cerebral'],
  poetry: ['books', 'intimate', 'emotional'],
  cinema: ['film', 'atmospheric'],
  film: ['film'],
  movie: ['film'],
  criterion: ['film', 'cerebral'],
  screening: ['film'],
  'film club': ['film', 'cerebral'],
  noodle: ['food', 'noodles', 'street food@0.7', 'casual@0.6', 'budget@0.5'],
  'street food': ['food', 'street food', 'lively', 'casual', 'budget@0.7', 'night out@0.5'],
  market: ['market', 'lively', 'daytime@0.5'],
  'night market': ['market', 'street food', 'lively', 'night out', 'budget@0.7'],
  omakase: ['food', 'japanese', 'intimate', 'luxe', 'splurge'],
  'tasting menu': ['food', 'luxe', 'splurge'],
  ramen: ['food', 'noodles', 'japanese', 'casual@0.6'],
  thai: ['food', 'thai'],
  pizza: ['food', 'pizza', 'casual', 'budget@0.5'],
  sushi: ['food', 'japanese'],
  brunch: ['food', 'daytime', 'coffee@0.5'],
  breakfast: ['food', 'daytime'],
  'late night': ['night out'],
  'free entry': ['budget'],
  cheap: ['budget'],
  michelin: ['food', 'luxe', 'splurge'],
  izakaya: ['food', 'japanese', 'intimate', 'lively', 'night out@0.7'],
  rave: ['techno', 'high-energy', 'lively', 'night out'],
  club: ['lively', 'high-energy', 'night out@0.7'],
  'live music': ['live music', 'lively'],
  gig: ['live music', 'lively'],
  concert: ['live music'],
  festival: ['live music', 'lively', 'epic'],
  sauna: ['wellness', 'chill'],
  spa: ['wellness', 'chill', 'luxe', 'splurge@0.6'],
  yoga: ['wellness', 'chill'],
  luxury: ['luxe', 'splurge'],
  cozy: ['cozy'],
  cosy: ['cozy'],
  'hidden gem': ['hidden gem'],
  secret: ['hidden gem', 'intimate'],
  'blue note': ['jazz', 'vinyl'],
  kissa: ['jazz', 'vinyl', 'coffee', 'intimate'],
  coltrane: ['jazz'],
  saxophone: ['jazz'],
  trumpet: ['jazz'],
  'piano trio': ['jazz', 'intimate'],
  'upright bass': ['jazz'],
  smoky: ['moody', 'jazz'],
  records: ['vinyl'],
  turntable: ['vinyl'],
  'hi-fi': ['vinyl', 'jazz'],
  candlelight: ['moody', 'intimate', 'romantic'],
  concrete: ['architecture', 'minimal'],
  lamination: ['pastry'],
  laminated: ['pastry'],
  sourdough: ['food', 'pastry'],
  tea: ['cozy'],
  'string quartet': ['classical', 'intimate'],
  orchestra: ['classical', 'epic'],
};

// Indirect links between tags: things that often go with a taste without
// naming it. A vinyl habit could be jazz; a speakeasy could be too. These
// are "could be" signals, weighted well below what a save says outright.
export const ASSOCIATIONS = {
  vinyl: [['jazz', 0.5], ['soul', 0.4], ['vintage', 0.3]],
  speakeasy: [['jazz', 0.4], ['cocktails', 0.6]],
  cocktails: [['jazz', 0.25]],
  'wine bar': [['jazz', 0.2], ['food', 0.3]],
  moody: [['jazz', 0.2], ['classical', 0.2]],
  intimate: [['jazz', 0.25], ['folk', 0.2]],
  'dark academia': [['books', 0.5], ['classical', 0.35], ['jazz', 0.2]],
  books: [['coffee', 0.3], ['cozy', 0.3]],
  coffee: [['pastry', 0.35]],
  pastry: [['coffee', 0.4]],
  vintage: [['vinyl', 0.3], ['jazz', 0.15]],
  tailoring: [['classic', 0.4], ['dark academia', 0.2]],
  minimal: [['design', 0.3], ['craft', 0.2]],
  architecture: [['design', 0.4], ['art', 0.3]],
  art: [['gallery', 0.4]],
  craft: [['art', 0.3], ['minimal', 0.3]],
  cozy: [['books', 0.2], ['coffee', 0.25]],
  techno: [['lively', 0.4]],
  house: [['lively', 0.4], ['rooftop', 0.25]],
  chill: [['jazz', 0.15], ['ambient', 0.2]],
  cerebral: [['books', 0.2], ['gallery', 0.2]],
  romantic: [['wine bar', 0.3]],
  soul: [['vinyl', 0.3], ['jazz', 0.3]],
  folk: [['intimate', 0.3], ['live music', 0.2]],
  'live music': [['jazz', 0.2]],
};

// Kinds a save is filed under, guessed from its tags when the source can't say.
const KIND_HINTS = [
  ['place', ['wine bar', 'coffee', 'cocktails', 'rooftop', 'gallery', 'bookshop', 'market', 'park']],
  ['food', ['pastry', 'food', 'street food']],
  ['look', ['tailoring', 'outerwear', 'streetwear', 'dark academia']],
  ['art', ['art', 'photography', 'architecture']],
];

// "night out@0.5": the keyword points that way, but only partly.
const weighted = (tags) => tags.map((t) => {
  const [tag, w] = t.split('@');
  return [tag, w ? Number(w) : 1];
});
const KEYWORD_RES = Object.entries(VIBE_KEYWORDS)
  .sort((a, b) => b[0].length - a[0].length)
  .map(([k, tags]) => [new RegExp(`(^|[^a-z])${k.replace(/[-]/g, '[- ]?')}(s|es)?([^a-z]|$)`, 'i'), k, weighted(tags)]);
// Single words long enough to spot inside a run-together handle.
const HANDLE_WORDS = Object.entries(VIBE_KEYWORDS)
  .filter(([k]) => k.length >= 5 && /^[a-z -]+$/.test(k))
  .map(([k, tags]) => [k.replace(/[ -]/g, ''), weighted(tags)]);

// Every signal belongs to a facet, so one save breaks down into who, how it
// sounds, how it feels, where and when.
export const FACETS = ['artist', 'sound', 'food', 'vibe', 'place', 'time', 'price', 'era', 'thing'];
const VIBES = new Set(['casual', 'dark', 'tense', 'cerebral', 'emotional', 'uplifting', 'funny', 'romantic', 'atmospheric', 'high-energy', 'chill', 'epic', 'weird', 'nostalgic', 'gritty', 'moody', 'intimate', 'cozy', 'lively', 'warm', 'minimal', 'vintage', 'luxe', 'classic', 'hidden gem']);
const SOUNDS = new Set([...MUSIC_GENRES, ...Object.keys(SOUND_PARENTS), 'poetry']);
const FOODS = new Set(['food', 'pastry', 'coffee', 'street food', 'thai', 'noodles', 'pizza', 'japanese', 'wine bar', 'cocktails']);
const TIMES = new Set(['night out', 'daytime']);
const PRICES = new Set(['budget', 'splurge']);
const PLACES = new Set([
  ...Object.values(CREATORS).map((c) => c.from.toLowerCase()),
  'bangkok', 'london', 'dublin', 'tokyo', 'paris', 'new york', 'berlin', 'lisbon', 'barcelona', 'amsterdam', 'copenhagen', 'seoul', 'mexico city',
]);

const PLACE_RES = [...PLACES].map((c) => [new RegExp(`(^|[^a-z])${c.replace(/[.,]/g, '\\$&')}([^a-z]|$)`, 'i'), c]);

/** Which facet a tag belongs to. */
export function facetOf(tag) {
  if (/^\d{4}s$/.test(tag)) return 'era';
  if (PLACES.has(tag)) return 'place';
  if (SOUNDS.has(tag)) return 'sound';
  if (FOODS.has(tag)) return 'food';
  if (TIMES.has(tag)) return 'time';
  if (PRICES.has(tag)) return 'price';
  if (VIBES.has(tag)) return 'vibe';
  return 'thing';
}

/**
 * Read a save as a whole and say what it signals, and how directly:
 *   obvious     the tag's own word is there ("jazz", or a music genre)
 *   translated  something that means it ("listening bar", "@croissantdiaries"
 *               → pastry), or a fact about the artist (Olivia Dean → neo-soul,
 *               London, 2020s)
 * Returns [{ tag, tier, via, facet, w }], strongest tier per tag; w (0–1) is
 * how strongly the save points that way ("street food" is only partly a
 * night out). "Could be"
 * signals come later, from associations and the user's own patterns
 * (taste-graph.js). `cache` holds artists looked up on MusicBrainz.
 */
export function readSignals({ title, creator, collection, note } = {}, cache = null) {
  const s = [title, creator, collection, note].filter(Boolean).join(' · ');
  const out = new Map();
  const put = (tag, tier, via, facet = facetOf(tag), w = 1) => {
    const prev = out.get(tag);
    if (!prev || (prev.tier === 'translated' && tier === 'obvious') || (prev.tier === tier && w > prev.w)) out.set(tag, { tag, tier, via, facet, w });
  };
  if (!s) return [];
  for (const [re, k, tags] of KEYWORD_RES) {
    if (!re.test(s)) continue;
    for (const [t, w] of tags) put(t, t === k ? 'obvious' : 'translated', k, undefined, w);
  }
  // Handles run words together ("croissantdiaries", "concrete.daily"). Only
  // look inside things that are handles, so "candlelit" isn't read as "candle".
  const handles = (s.toLowerCase().match(/@[a-z0-9._]{3,}|[a-z0-9]+[._][a-z0-9._]+/g) || []).map((h) => h.replace(/^@/, ''));
  if (creator && !/\s/.test(creator)) handles.push(creator.toLowerCase());
  for (const token of new Set(handles)) {
    for (const [k, tags] of HANDLE_WORDS) {
      if (token.includes(k)) for (const [t, w] of tags) put(t, 'translated', `“${token}” contains “${k}”`, undefined, w);
    }
  }
  // Cities named in the text ("Bangkok trip") are places.
  for (const [re, city] of PLACE_RES) if (re.test(s)) put(city, 'obvious', city, 'place');
  // Genres only from short phrases ("Pink Moon · folk"), never mid-sentence,
  // so "pop-up" or "the house special" don't count as music.
  const phrases = s.toLowerCase().split(/[·,/|\n]/).map((x) => x.trim()).filter((x) => x && x.split(/\s+/).length <= 3);
  for (const g of new Set(phrases.map(normalizeGenre).filter(Boolean))) {
    if (!phrases.some((x) => new RegExp(`(^|[^a-z-])${g}([^a-z-]|$)`).test(x) || x === g)) continue;
    put(g, 'obvious', g);
    for (const m of moodsForGenres([g])) put(m, 'translated', `${g} is ${m}`);
  }
  // What we know about the artist. "Duke Ellington & John Coltrane" counts for both.
  for (const name of splitCreators(creator)) {
    const f = creatorFacts(name, cache);
    if (!f) continue;
    for (const sound of f.sounds || []) {
      put(sound, 'translated', `${name} makes ${sound}`, 'sound');
      const parent = SOUND_PARENTS[sound];
      if (parent) put(parent, 'translated', `${sound} is ${parent}`, 'sound');
      for (const m of moodsForGenres([parent || sound])) put(m, 'translated', `${parent || sound} is ${m}`, 'vibe');
    }
    for (const m of f.moods || []) put(m, 'translated', `${name} feels ${m}`, 'vibe');
    if (f.from) put(f.from.toLowerCase(), 'translated', `${name} is from ${f.from}`, 'place');
    if (f.era) put(f.era, 'translated', `${name} came up in the ${f.era}`, 'era');
  }
  return [...out.values()];
}

/** Tags implied by a save (title, artist, collection name, note). */
export function autoTag(title, creator, collection, note, cache = null) {
  return readSignals({ title, creator, collection, note }, cache).map((x) => x.tag);
}

/** "Duke Ellington & John Coltrane" → both names. */
export function splitCreators(creator) {
  return creator ? creator.split(/\s*(?:&|,| and | feat\.? | ft\.? | x )\s*/i).map((x) => x.trim()).filter(Boolean) : [];
}

/** Best-guess kind for a save from its tags, or `fallback`. */
export function guessKind(tags, fallback = 'other') {
  for (const [kind, hints] of KIND_HINTS) if (hints.some((h) => tags.includes(h))) return kind;
  return fallback;
}

/** Clean a user-supplied tag list: lower case, trimmed, deduplicated, bounded. */
export function cleanTags(list) {
  return [...new Set((Array.isArray(list) ? list : []).map((t) => String(t).trim().toLowerCase().slice(0, 40)).filter(Boolean))].slice(0, 20);
}
