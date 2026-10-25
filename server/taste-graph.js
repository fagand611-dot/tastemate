// The taste graph: saves from every app are read for what they signal
// (obviously, by translation, or possibly), those signals form one tag
// profile and a few cohesive clusters, and the profile ranks real-world
// spots (events, places, products) for a city and a date range.
//
// Pure functions: routes load rows, this scores them.
// See DESIGN.md §4.
import { ASSOCIATIONS, readSignals } from './taxonomy.js';

export const SPOT_BLEND = { content: 0.6, social: 0.2, fresh: 0.1, gem: 0.1 };
// How much each kind of signal counts.
export const TIER_CONF = { obvious: 1, translated: 0.7 };
const ASSOC_CONF = 0.4; // × association strength
const LEARNED_CONF = 0.35; // × how often the tags go together in your saves
const MIN_POSSIBLE = 0.1;
// Spots this new (days since opening) get the "just opened" boost.
const FRESH_DAYS = 60;
// Below this popularity a spot counts as a hidden gem.
const GEM_POPULARITY = 0.35;

/**
 * Read every save as a whole and attach `signals`: [{ tag, tier, conf, via }].
 *
 *   obvious     says it outright ("jazz", or a tag you added yourself)
 *   translated  means it without saying it ("listening bar", "Miles Davis",
 *               "@croissantdiaries")
 *   possible    could be: a known association (vinyl → maybe jazz) or your
 *               own habit (most of your speakeasy saves are also jazz)
 *
 * Possible signals only count for a fraction, so they shape a cluster
 * without inventing one.
 */
export function interpret(saves) {
  const base = saves.map((s) => {
    const read = new Map(readSignals(s).map((x) => [x.tag, x]));
    return (s.tags || []).map((tag) => {
      const r = read.get(tag);
      // Tags the text doesn't explain came from you or a curated spot: take them at face value.
      const tier = r?.tier === 'translated' && s.source !== 'tastemate' ? 'translated' : 'obvious';
      return { tag, tier, conf: TIER_CONF[tier], via: r && r.via !== tag ? r.via : null };
    });
  });

  // Your own habits: P(B | A) over your saves, for tags you use often.
  const count = new Map();
  const co = new Map();
  for (const sig of base) {
    const tags = sig.map((x) => x.tag);
    for (const a of tags) {
      count.set(a, (count.get(a) || 0) + 1);
      for (const b of tags) if (a !== b) co.set(`${a}|${b}`, (co.get(`${a}|${b}`) || 0) + 1);
    }
  }
  const learned = new Map(); // a → [[b, p]]
  for (const [key, n] of co) {
    const [a, b] = key.split('|');
    const p = n / count.get(a);
    if (count.get(a) >= 3 && p >= 0.5) learned.set(a, [...(learned.get(a) || []), [b, p]]);
  }

  return saves.map((s, i) => {
    const have = new Set(base[i].map((x) => x.tag));
    const maybe = new Map();
    const offer = (tag, conf, via) => {
      if (have.has(tag) || conf < MIN_POSSIBLE) return;
      if (!maybe.has(tag) || maybe.get(tag).conf < conf) maybe.set(tag, { tag, tier: 'possible', conf: +conf.toFixed(3), via });
    };
    for (const { tag } of base[i]) {
      for (const [t, w] of ASSOCIATIONS[tag] || []) offer(t, ASSOC_CONF * w, `${tag} often goes with ${t}`);
      for (const [t, p] of learned.get(tag) || []) offer(t, LEARNED_CONF * p, `most of your ${tag} saves are also ${t}`);
    }
    return { ...s, signals: [...base[i], ...maybe.values()] };
  });
}

/**
 * Similarity 0..1 → a "% match" for display. Cosine values on sparse tag
 * vectors rarely go above 0.6, so a square-root curve makes them easier to read.
 */
export const toPercent = (x) => Math.round(Math.sqrt(Math.max(0, Math.min(1, x))) * 100);

function norm(v) {
  let s = 0;
  for (const x of v.values()) s += x * x;
  return Math.sqrt(s);
}

/** Cosine similarity of two sparse vectors (Map<tag, weight>). */
export function cosine(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [k, x] of small) {
    const y = big.get(k);
    if (y) dot += x * y;
  }
  return dot / (na * nb);
}

const ensure = (saves) => (saves.length && !saves[0].signals ? interpret(saves) : saves);

/** One tag profile from all saves: Map<tag, weight>. */
export function tasteProfile(saves) {
  const p = new Map();
  const add = (k, w) => p.set(k, (p.get(k) || 0) + w);
  for (const s of ensure(saves)) {
    const firm = s.signals.filter((x) => x.tier !== 'possible').length + (s.creator ? 1 : 0);
    if (!firm) continue;
    // Normalise by how much the save says outright, so heavily tagged saves don't dominate.
    const n = Math.sqrt(firm);
    for (const x of s.signals) add(x.tag, x.conf / n);
    if (s.creator) add(`creator:${s.creator.toLowerCase()}`, 1 / n);
  }
  return p;
}

/** Strongest tags, for the tag cloud. */
export function topSaveTags(profile, n = 24) {
  return [...profile.entries()]
    .filter(([k]) => !k.startsWith('creator:'))
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([tag, w]) => ({ tag, weight: +w.toFixed(3) }));
}

/**
 * Cohesive clusters of taste, e.g. "jazz · intimate · vinyl", built from
 * everything that points at the seed tag: songs that say jazz, a listening
 * bar that means jazz, a speakeasy that could be jazz. Greedy: the
 * strongest tag not yet in a cluster seeds one, the two tags it goes with
 * most describe it, and it's kept if at least two saves firmly support it
 * and they span more than one kind of thing or more than one app.
 */
export function findPatterns(saves, { max = 5, minSaves = 3 } = {}) {
  const all = ensure(saves).filter((s) => s.signals.length);
  const weight = new Map();
  const co = new Map();
  for (const s of all) {
    for (const a of s.signals) {
      weight.set(a.tag, (weight.get(a.tag) || 0) + a.conf);
      if (a.tier === 'possible') continue;
      for (const b of s.signals) {
        if (a.tag === b.tag || b.tier === 'possible') continue;
        if (!co.has(a.tag)) co.set(a.tag, new Map());
        co.get(a.tag).set(b.tag, (co.get(a.tag).get(b.tag) || 0) + 1);
      }
    }
  }
  const used = new Set();
  const out = [];
  for (const [seed] of [...weight.entries()].sort((a, b) => b[1] - a[1])) {
    if (out.length >= max) break;
    if (used.has(seed)) continue;
    const partners = [...(co.get(seed) || new Map()).entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([t]) => t);
    const tiers = { obvious: [], translated: [], possible: [] };
    for (const s of all) {
      const sig = s.signals.find((x) => x.tag === seed);
      if (sig) tiers[sig.tier].push({ id: s.id, title: s.title, kind: s.kind, source: s.source, via: sig.via });
    }
    const firm = [...tiers.obvious, ...tiers.translated];
    if (firm.length < 2 || firm.length + tiers.possible.length < minSaves) continue;
    const support = [...firm, ...tiers.possible];
    const kinds = countBy(support, (x) => x.kind);
    const sources = countBy(support, (x) => x.source);
    // A cluster is only interesting if it crosses kinds or apps.
    if (Object.keys(kinds).length < 2 && Object.keys(sources).length < 2) continue;
    const tags = [seed, ...partners];
    tags.forEach((t) => used.add(t));
    out.push({
      tags,
      count: firm.length,
      maybe: tiers.possible.length,
      kinds,
      sources,
      tiers,
      examples: support.slice(0, 4),
    });
  }
  return out;
}

/**
 * The taste web: your strongest tags as nodes, joined where they show up in
 * the same saves, each placed in the cluster it belongs to. Edge weight is
 * the summed confidence of the pair (a could-be signal counts for less).
 * Each node carries the saves behind it, firm signals first.
 */
export function tasteWeb(saves, clusters, profile, { maxNodes = 28, maxEdges = 60, minEdge = 0.7 } = {}) {
  const all = ensure(saves);
  const top = topSaveTags(profile, maxNodes);
  const keep = new Set(top.map((t) => t.tag));
  const pair = new Map();
  const behind = new Map();
  for (const s of all) {
    const sig = s.signals.filter((x) => keep.has(x.tag));
    for (const x of sig) {
      if (!behind.has(x.tag)) behind.set(x.tag, []);
      behind.get(x.tag).push({ id: s.id, title: s.title, kind: s.kind, source: s.source, tier: x.tier, via: x.via });
    }
    for (let i = 0; i < sig.length; i++) {
      for (let j = i + 1; j < sig.length; j++) {
        const [a, b] = [sig[i].tag, sig[j].tag].sort();
        const key = `${a}|${b}`;
        pair.set(key, (pair.get(key) || 0) + Math.min(sig[i].conf, sig[j].conf));
      }
    }
  }
  const edges = [...pair.entries()]
    .filter(([, w]) => w >= minEdge)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxEdges)
    .map(([key, w]) => {
      const [a, b] = key.split('|');
      return { a, b, w: +w.toFixed(2) };
    });
  const weightBetween = (a, b) => pair.get([a, b].sort().join('|')) || 0;
  // A tag belongs to the first cluster that names it, else to the cluster
  // whose seed it goes with most, else to none ("other tastes").
  const clusterOf = (tag) => {
    const named = clusters.findIndex((c) => c.tags.includes(tag));
    if (named >= 0) return named;
    let best = null;
    let bestW = 1;
    clusters.forEach((c, i) => {
      const w = weightBetween(tag, c.tags[0]);
      if (w >= bestW) [best, bestW] = [i, w];
    });
    return best;
  };
  const tierRank = { obvious: 0, translated: 1, possible: 2 };
  const nodes = top.map(({ tag, weight }) => {
    const list = (behind.get(tag) || []).sort((x, y) => tierRank[x.tier] - tierRank[y.tier]);
    return {
      id: tag,
      weight,
      cluster: clusterOf(tag),
      firm: list.filter((x) => x.tier !== 'possible').length,
      maybe: list.filter((x) => x.tier === 'possible').length,
      saves: list.slice(0, 8),
    };
  });
  return { nodes, edges, clusters: clusters.map((c, i) => ({ index: i, tags: c.tags })) };
}

// Moods and qualities: they describe a taste but aren't something to go and
// try, so they never count as a stretch.
const VIBE_WORDS = new Set(['chill', 'cerebral', 'moody', 'dark', 'atmospheric', 'intimate', 'romantic', 'lively', 'high-energy', 'uplifting', 'emotional', 'classic', 'cozy', 'vintage', 'minimal', 'epic', 'nostalgic', 'gritty', 'weird', 'luxe', 'food', 'tense', 'funny', 'hidden gem']);

// Who a tag makes you: [archetype, the "side" it adds]. Checked in order of
// your strongest tags, so the most specific match wins.
const ARCHETYPES = {
  jazz: ['Late-Night Listener', 'a jazz-bar soul'],
  vinyl: ['Crate Digger', 'a record-shop streak'],
  'dark academia': ['Library Ghost', 'a tweed-and-candles side'],
  moody: ['Candlelit Romantic', 'a candlelit streak'],
  pastry: ['Pastry Pilgrim', 'a weakness for croissants'],
  coffee: ['Café Hopper', 'a café habit'],
  'wine bar': ['Natural-Wine Wanderer', 'a natural-wine thirst'],
  cocktails: ['Speakeasy Seeker', 'a hidden-bar habit'],
  art: ['Gallery Wanderer', 'a gallery eye'],
  architecture: ['Concrete Romantic', 'an eye for buildings'],
  craft: ['Hand-Made Collector', 'a love of hand-made things'],
  minimal: ['Quiet Minimalist', 'a minimalist streak'],
  tailoring: ['Sharp Dresser', 'a sharp wardrobe'],
  vintage: ['Second-Hand Treasure Hunter', 'a vintage soft spot'],
  books: ['Bookshop Lingerer', 'a bookshop habit'],
  house: ['Dancefloor Regular', 'a dancefloor side'],
  techno: ['Warehouse Night Owl', 'a warehouse-rave side'],
  'live music': ['Front-Row Regular', 'a live-music itch'],
  comedy: ['Front-Row Laugher', 'a comedy-club side'],
  folk: ['Fireside Folkie', 'a fireside-folk side'],
  'street food': ['Night-Market Grazer', 'a street-food appetite'],
  outdoors: ['Trail Seeker', 'an outdoors itch'],
  cozy: ['Cosy-Corner Dweller', 'a cosy side'],
  photography: ['Golden-Hour Chaser', 'a photographer’s eye'],
};

/**
 * Your Tastemate character: a name from your strongest clusters, the sides
 * that make it up, the apps it was read from, and "stretch" tastes: things
 * your saves point towards that you haven't saved much yet.
 */
export function tasteCharacter(saves, clusters, profile) {
  const all = ensure(saves);
  if (!all.length) return null;
  const ranked = [...profile.entries()].filter(([k]) => !k.startsWith('creator:')).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const picks = ranked.filter((t) => ARCHETYPES[t]);
  const main = picks[0] ? ARCHETYPES[picks[0]][0] : 'Curious Explorer';
  const side = picks.find((t, i) => i > 0 && !clusters[0]?.tags.includes(t) && t !== picks[0]);
  const total = clusters.reduce((n, c) => n + c.count + c.maybe, 0) || 1;
  const sides = clusters.slice(0, 3).map((c, i) => ({ index: i, tags: c.tags, share: Math.round((100 * (c.count + c.maybe)) / total) }));
  const apps = countBy(all.filter((s) => s.source !== 'tastemate'), (s) => s.source);
  // Stretch: strongest could-be tags you rarely say outright.
  const firm = new Map();
  const maybe = new Map();
  for (const s of all) for (const x of s.signals) {
    const m = x.tier === 'possible' ? maybe : firm;
    m.set(x.tag, (m.get(x.tag) || 0) + x.conf);
  }
  const stretch = [...maybe.entries()]
    .filter(([t]) => (firm.get(t) || 0) < 1.5 && !VIBE_WORDS.has(t))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([t]) => t);
  return {
    name: `The ${main}`,
    tagline: side ? `with ${ARCHETYPES[side][1]}` : null,
    sides,
    apps: Object.entries(apps).sort((a, b) => b[1] - a[1]).map(([source, n]) => ({ source, label: SOURCE_LABEL[source] || source, n })),
    saves: all.length,
    stretch,
  };
}

function countBy(list, key) {
  const m = {};
  for (const x of list) m[key(x)] = (m[key(x)] || 0) + 1;
  return m;
}

/** Does an event run at some point between from and to (ISO dates, inclusive)? */
export function inWindow(spot, from, to) {
  if (spot.kind !== 'event') return true;
  const start = (spot.starts_at || '').slice(0, 10);
  const end = (spot.ends_at || spot.starts_at || '').slice(0, 10);
  if (!start) return false;
  return (!to || start <= to) && (!from || end >= from);
}

/**
 * Rank spots for one city and date window.
 *
 * @param {object} ctx
 * @param {Map}    ctx.profile      from tasteProfile()
 * @param {Array}  ctx.saves        the user's saves, used to explain picks
 * @param {Array}  ctx.spots        candidate spots { id, kind, title, city, tags, starts_at, ends_at, opened_at, popularity }
 * @param {string} [ctx.city]       null = anywhere
 * @param {string} [ctx.from]       YYYY-MM-DD
 * @param {string} [ctx.to]         YYYY-MM-DD
 * @param {Map}    [ctx.friendSaves] spot_id → [friend name]
 * @param {Set}    [ctx.exclude]    spot ids already saved or dismissed
 * @param {string} [ctx.today]      YYYY-MM-DD, for "just opened"
 */
export function rankSpots({ profile, saves = [], spots, city, from, to, friendSaves = new Map(), exclude = new Set(), today = new Date().toISOString().slice(0, 10) }) {
  const byTag = new Map();
  const maybeByTag = new Map();
  for (const s of ensure(saves)) for (const x of s.signals) {
    const m = x.tier === 'possible' ? maybeByTag : byTag;
    if (!m.has(x.tag)) m.set(x.tag, []);
    m.get(x.tag).push(s);
  }
  const out = [];
  for (const spot of spots) {
    if (exclude.has(spot.id)) continue;
    // Products with no city are online and ship anywhere.
    if (city && spot.city && spot.city.toLowerCase() !== city.toLowerCase()) continue;
    if (city && !spot.city && spot.kind !== 'product') continue;
    if (!inWindow(spot, from, to)) continue;

    const f = new Map(spot.tags.map((t) => [t, 1]));
    for (const c of spot.creators || []) f.set(`creator:${c.toLowerCase()}`, 1.5);
    const content = cosine(profile, f);
    const friends = friendSaves.get(spot.id) || [];
    if (content <= 0 && !friends.length) continue;

    const social = Math.tanh(0.6 * friends.length);
    const age = spot.opened_at ? daysBetween(spot.opened_at, today) : null;
    const fresh = age != null && age >= -30 && age <= FRESH_DAYS ? 1 : 0;
    const gem = 1 - (spot.popularity ?? 0.5);
    const score = SPOT_BLEND.content * content + SPOT_BLEND.social * social + SPOT_BLEND.fresh * fresh + SPOT_BLEND.gem * gem;

    out.push({
      spot,
      score: +score.toFixed(4),
      match: toPercent(content),
      reasons: explainSpot({ spot, f, profile, byTag, maybeByTag, friends, fresh, age, gem }),
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a.slice(0, 10))) / 864e5);
}

const SOURCE_LABEL = { spotify: 'Spotify', instagram: 'Instagram', google_maps: 'Google Maps', pinterest: 'Pinterest', manual: 'your notes', tastemate: 'your plan' };

/**
 * Reasons in the user's own terms: which of their saves, from which apps,
 * point at this spot ("6 jazz saves on Spotify, 2 on Google Maps").
 */
function explainSpot({ spot, f, profile, byTag, maybeByTag, friends, fresh, age, gem }) {
  const reasons = [];
  const shared = [...f.keys()]
    .filter((k) => (profile.get(k) || 0) > 0)
    .sort((a, b) => profile.get(b) - profile.get(a));
  const creator = shared.find((k) => k.startsWith('creator:'));
  if (creator) {
    const name = spot.creators.find((c) => `creator:${c.toLowerCase()}` === creator);
    reasons.push({ type: 'creator', name });
  }
  const tags = shared.filter((k) => !k.startsWith('creator:')).slice(0, 3);
  const evidence = tags
    .map((tag) => {
      const list = byTag.get(tag) || [];
      const bySource = countBy(list, (s) => s.source);
      return {
        tag,
        n: list.length,
        sources: Object.entries(bySource).sort((a, b) => b[1] - a[1]).map(([source, n]) => ({ source, label: SOURCE_LABEL[source] || source, n })),
        examples: list.slice(0, 2).map((s) => s.title),
        maybe: (maybeByTag.get(tag) || []).length,
      };
    })
    .filter((e) => e.n > 0);
  if (evidence.length) reasons.push({ type: 'saves', evidence });
  else if (tags.length) reasons.push({ type: 'tags', tags });
  if (friends.length) reasons.push({ type: 'friends', names: friends.slice(0, 3), n: friends.length });
  if (fresh) reasons.push({ type: 'new', days: age });
  if (gem >= 1 - GEM_POPULARITY) reasons.push({ type: 'gem' });
  return reasons;
}
