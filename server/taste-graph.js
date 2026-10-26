// The taste graph: saves from every app are read for what they signal
// (obviously, by translation, or possibly), those signals form one tag
// profile and a few cohesive clusters, and the profile ranks real-world
// spots (events, places, products) for a city and a date range.
//
// Pure functions: routes load rows, this scores them.
// See DESIGN.md §4.
import { ASSOCIATIONS, facetOf, readSignals, splitCreators } from './taxonomy.js';

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
export function interpret(saves, { cache = null } = {}) {
  const base = saves.map((s) => {
    const read = new Map(readSignals(s, cache).map((x) => [x.tag, x]));
    const sig = (s.tags || []).map((tag) => {
      const r = read.get(tag);
      // Tags the text doesn't explain came from you or a curated spot: take them at face value.
      const tier = r?.tier === 'translated' && s.source !== 'tastemate' ? 'translated' : 'obvious';
      return { tag, tier, conf: +(TIER_CONF[tier] * (r?.w ?? 1)).toFixed(3), via: r && r.via !== tag ? r.via : null, facet: r?.facet || facetOf(tag) };
    });
    // Where it was saved is part of the taste too ("London", "Bangkok").
    const city = s.city?.trim().toLowerCase();
    if (city && !sig.some((x) => x.tag === city)) sig.push({ tag: city, tier: 'obvious', conf: TIER_CONF.obvious, via: `saved in ${s.city}`, facet: 'place' });
    return sig;
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
      if (!maybe.has(tag) || maybe.get(tag).conf < conf) maybe.set(tag, { tag, tier: 'possible', conf: +conf.toFixed(3), via, facet: facetOf(tag) });
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

// Who a tag makes you: [archetype, the "side" it adds]. Something specific
// (jazz, pastry) names you before a mood does.
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
  soul: ['Soul Searcher', 'a soft spot for soul'],
  'neo-soul': ['Neo-Soul Dreamer', 'a neo-soul glow'],
  classical: ['Concert-Hall Dreamer', 'a strings-and-piano side'],
  electronic: ['After-Hours Wanderer', 'an after-hours side'],
  // Moods: used for sides, and for the name only when nothing more specific stands out.
  intimate: ['Small-Room Regular', 'a small-rooms-only rule'],
  chill: ['Slow-Evening Specialist', 'a slow-evening side'],
  cerebral: ['Deep Thinker', 'a deep-thinker side'],
  atmospheric: ['Atmosphere Hunter', 'an atmosphere-hunter side'],
  dark: ['After-Dark Explorer', 'an after-dark side'],
  romantic: ['Hopeless Romantic', 'a hopeless-romantic side'],
  emotional: ['Big Feeler', 'a big-feelings side'],
  warm: ['Warm Soul', 'a warm glow'],
  'high-energy': ['Live Wire', 'a live-wire side'],
  lively: ['Life of the Party', 'a party side'],
  uplifting: ['Sunshine Seeker', 'a sunny side'],
};

// What a taste says about you, for the one-line description:
// "You're drawn to records with a story, low-lit rooms and slow coffee."
const PHRASES = {
  jazz: 'records with a story', vinyl: 'the crackle of vinyl', soul: 'warm voices', 'neo-soul': 'warm, easy grooves',
  moody: 'low-lit rooms', intimate: 'small rooms', romantic: 'candlelight', dark: 'after-dark places', atmospheric: 'places with atmosphere',
  minimal: 'clean lines', cozy: 'corners you can sink into', vintage: 'second-hand finds', 'dark academia': 'old libraries',
  pastry: 'a really good croissant', coffee: 'slow coffee', 'wine bar': 'natural wine', cocktails: 'hidden bars', food: 'a long table',
  art: 'quiet galleries', architecture: 'bold buildings', craft: 'hand-made things', design: 'good design', photography: 'golden-hour light',
  books: 'bookshops', house: 'a good dancefloor', techno: 'warehouse nights', comedy: 'a good laugh', folk: 'songs by the fire',
  tailoring: 'a sharp coat', 'street food': 'night markets', outdoors: 'a long walk', 'live music': 'a gig in a small room',
  classical: 'strings and piano', electronic: 'late electronic sets', 'trip-hop': 'smoky beats', chill: 'slow evenings', warm: 'warmth',
};

// The five dials: pairs of opposites, each read from your tastes.
const NIGHT = ['moody', 'dark', 'jazz', 'cocktails', 'techno', 'house', 'intimate', 'wine bar', 'live music', 'comedy'];
const DAY = ['coffee', 'pastry', 'outdoors', 'market', 'uplifting', 'books', 'craft', 'art'];
const CALM = ['chill', 'intimate', 'minimal', 'atmospheric', 'cozy', 'ambient', 'folk', 'books'];
const LIVELY = ['lively', 'high-energy', 'house', 'techno', 'street food', 'comedy', 'live music', 'rooftop'];
const OUT_KINDS = new Set(['place', 'event', 'food']);

function dialLabel(v, [left, right]) {
  if (v >= 0.72) return `Proper ${right.toLowerCase()}`;
  if (v >= 0.56) return `Leans ${right.toLowerCase()}`;
  if (v > 0.44) return 'Bit of both';
  if (v > 0.28) return `Leans ${left.toLowerCase()}`;
  return `Proper ${left.toLowerCase()}`;
}

/** Your vibe as dials between opposites, 0 (left) … 1 (right). Dials with nothing to go on are left out. */
export function vibeDials(saves, profile) {
  const w = (tags) => tags.reduce((a, t) => a + Math.max(0, profile.get(t) || 0), 0);
  const ratio = (l, r) => (l + r > 0.3 ? r / (l + r) : null);
  const eras = saves.flatMap((s) => s.signals.filter((x) => x.facet === 'era').map((x) => Number(x.tag.slice(0, 4))));
  const places = new Set(saves.flatMap((s) => s.signals.filter((x) => x.facet === 'place' && x.tier !== 'possible').map((x) => x.tag)));
  const out = saves.filter((s) => OUT_KINDS.has(s.kind)).length;
  const old = eras.filter((y) => y < 2000).length + w(['vintage', 'classic']);
  const fresh = eras.filter((y) => y >= 2010).length;
  const dials = [
    { left: 'Early bird', right: 'Night owl', value: ratio(w(DAY), w(NIGHT)) },
    { left: 'Homebody', right: 'Out and about', value: ratio(saves.length - out, out) },
    { left: 'Classic', right: 'Fresh', value: ratio(old, fresh) },
    { left: 'Calm', right: 'Lively', value: ratio(w(CALM), w(LIVELY)) },
    { left: 'Local', right: 'Wanderer', value: places.size ? Math.min(0.92, 0.12 + 0.2 * (places.size - 1)) : null },
  ];
  return dials
    .filter((d) => d.value != null)
    .map((d) => ({ ...d, value: +d.value.toFixed(2), label: dialLabel(d.value, [d.left, d.right]) }));
}

const FACET_ORDER = ['sound', 'vibe', 'place', 'era', 'thing'];

/** What one save says, as a few chips: "neo-soul · warm · London · 2020s". */
export function saveChips(save, n = 5) {
  return save.signals
    .filter((x) => x.tier !== 'possible')
    .sort((a, b) => FACET_ORDER.indexOf(a.facet) - FACET_ORDER.indexOf(b.facet) || (a.tier === 'obvious' ? -1 : 1))
    .slice(0, n)
    .map((x) => ({ tag: x.tag, facet: x.facet, tier: x.tier, via: x.via }));
}

/**
 * Your Tastemate character, the way a personality test reads you: a name and
 * tagline from your strongest tastes, a one-line description, five vibe
 * dials, the sides that make you up (each with a few saves as proof, broken
 * down into what they say), the apps it was read from, and stretch tastes
 * your saves point towards but you haven't explored.
 */
export function tasteCharacter(saves, clusters, profile) {
  const all = ensure(saves);
  if (!all.length) return null;
  const ranked = [...profile.entries()].filter(([k]) => !k.startsWith('creator:')).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  // Something specific (jazz, pastry) names you before a mood (moody, chill) does.
  const picks = [...ranked.filter((t) => ARCHETYPES[t] && facetOf(t) !== 'vibe'), ...ranked.filter((t) => ARCHETYPES[t] && facetOf(t) === 'vibe')];
  const main = picks[0] || null;
  const phrases = [...new Set(ranked.map((t) => PHRASES[t]).filter(Boolean))].slice(0, 3);
  const total = clusters.reduce((n, c) => n + c.count + c.maybe, 0) || 1;
  const byId = new Map(all.map((s) => [s.id, s]));
  const usedKeys = new Set();
  const usedSaves = new Set();
  const sides = clusters.slice(0, 3).map((c, i) => {
    // Each side gets its own name, and its own saves as proof.
    const free = (t) => ARCHETYPES[t] && !usedKeys.has(t);
    // The seed names its side when it can; otherwise something specific in it does.
    const key = (free(c.tags[0]) && c.tags[0]) || c.tags.find((t) => free(t) && facetOf(t) !== 'vibe') || c.tags.find(free) || c.tags.find((t) => !usedKeys.has(t)) || c.tags[0];
    usedKeys.add(key);
    const firmIds = [...c.tiers.obvious, ...c.tiers.translated].filter((x) => !usedSaves.has(x.id));
    const kinds = new Set();
    const proof = [...firmIds.filter((x) => !kinds.has(x.kind) && kinds.add(x.kind)), ...firmIds]
      .filter((x, k, arr) => arr.findIndex((y) => y.id === x.id) === k)
      .slice(0, 3);
    proof.forEach((x) => usedSaves.add(x.id));
    return {
      index: i,
      key,
      name: ARCHETYPES[key] ? ARCHETYPES[key][1].replace(/^(a|an) /, '') : `${key} side`,
      tags: c.tags,
      share: Math.round((100 * (c.count + c.maybe)) / total),
      proof: proof.map((x) => {
        const sv = byId.get(x.id);
        return { id: x.id, title: sv.title, creator: sv.creator, kind: sv.kind, source: sv.source, chips: saveChips(sv) };
      }),
    };
  });
  const apps = countBy(all.filter((s) => s.source !== 'tastemate'), (s) => s.source);
  // Stretch: strongest could-be tastes you rarely say outright. Only things
  // you can go and try: sounds, food and things, not moods, places or eras.
  const firm = new Map();
  const maybe = new Map();
  const why = {};
  for (const s of all) for (const x of s.signals) {
    const m = x.tier === 'possible' ? maybe : firm;
    m.set(x.tag, (m.get(x.tag) || 0) + x.conf);
    if (x.tier === 'possible' && !why[x.tag]) why[x.tag] = x.via;
  }
  const stretch = [...maybe.entries()]
    .filter(([t]) => (firm.get(t) || 0) < 1.5 && ['sound', 'food', 'thing'].includes(facetOf(t)) && t !== 'food')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([t]) => t);
  return {
    name: `The ${main ? ARCHETYPES[main][0] : 'Curious Explorer'}`,
    key: main || 'explorer',
    tagline: (() => {
      const other = sides.find((sd) => sd.key !== main && ARCHETYPES[sd.key]) || (picks[1] && { key: picks[1] });
      return other ? `with ${ARCHETYPES[other.key][1]}` : null;
    })(),
    description: phrases.length ? `You’re drawn to ${phrases.length > 1 ? `${phrases.slice(0, -1).join(', ')} and ${phrases.at(-1)}` : phrases[0]}.` : null,
    dials: vibeDials(all, profile),
    sides,
    apps: Object.entries(apps).sort((a, b) => b[1] - a[1]).map(([source, n]) => ({ source, label: SOURCE_LABEL[source] || source, n })),
    saves: all.length,
    stretch,
    stretchWhy: Object.fromEntries(stretch.map((t) => [t, why[t]])),
  };
}

// How much a shared attribute ties two saves together, by dimension:
// the same artist ties them most, the same price band least.
export const DIM_WEIGHT = { artist: 1.4, sound: 1, food: 1, thing: 0.9, vibe: 0.8, place: 0.7, era: 0.5, time: 0.4, price: 0.3 };

// Tags so broad that sharing them says little ("both food").
const BROAD = new Set(['food', 'art', 'design']);

/** A save's firm attributes as Map<tag, { conf, facet }>, its artist included. */
function attributes(s) {
  const m = new Map();
  for (const x of s.signals) if (x.tier !== 'possible') m.set(x.tag, { conf: x.conf, facet: x.facet });
  if (s.creator) m.set(`creator:${s.creator.toLowerCase()}`, { conf: 1, facet: 'artist' });
  return m;
}

/**
 * Links between saves: each save to the few others it shares the most with.
 * Strength = Σ over shared attributes of min(confidence) × dimension weight.
 * Only saves sharing at least one attribute are compared (an index by tag).
 * Returns [{ a, b, strength, because: [tags] }].
 */
export function connectSaves(saves, { perSave = 3, min = 0.6 } = {}) {
  const all = ensure(saves);
  const attrs = all.map(attributes);
  const byTag = new Map();
  attrs.forEach((m, i) => { for (const t of m.keys()) byTag.set(t, [...(byTag.get(t) || []), i]); });
  const best = all.map(() => []);
  const seen = new Set();
  for (let i = 0; i < all.length; i++) {
    const candidates = new Set([...attrs[i].keys()].flatMap((t) => byTag.get(t)));
    for (const j of candidates) {
      if (j <= i || seen.has(`${i}|${j}`)) continue;
      seen.add(`${i}|${j}`);
      const shared = [];
      let strength = 0;
      for (const [t, x] of attrs[i]) {
        const y = attrs[j].get(t);
        if (!y) continue;
        const c = Math.min(x.conf, y.conf) * (DIM_WEIGHT[x.facet] ?? 0.8) * (BROAD.has(t) ? 0.3 : 1);
        strength += c;
        shared.push([t, c]);
      }
      if (strength < min) continue;
      const edge = {
        a: all[i].id,
        b: all[j].id,
        strength: +strength.toFixed(2),
        because: shared.sort((p, q) => q[1] - p[1]).slice(0, 3).map(([t]) => (t.startsWith('creator:') ? all[i].creator : t)),
      };
      best[i].push(edge);
      best[j].push(edge);
    }
  }
  const keep = new Set(best.flatMap((list) => list.sort((p, q) => q.strength - p.strength).slice(0, perSave)));
  return [...keep].sort((p, q) => q.strength - p.strength);
}

/**
 * The taste board: you in the middle, your strongest tastes around you
 * (weight 0–1, its dimension, which side it belongs to, a couple of saves
 * behind it), and threads between tastes that turn up in the same saves.
 */
export function tasteBoard(saves, clusters, profile, { size = 14, threads = 16 } = {}) {
  const all = ensure(saves);
  const ranked = [...profile.entries()].filter(([k, v]) => v > 0 && !k.startsWith('creator:')).sort((a, b) => b[1] - a[1]);
  // A mix of dimensions, so the board isn't fourteen moods.
  const perFacet = {};
  const picked = [];
  for (const [tag, w] of ranked) {
    const facet = facetOf(tag);
    if ((perFacet[facet] || 0) >= (facet === 'vibe' ? 4 : 3)) continue;
    perFacet[facet] = (perFacet[facet] || 0) + 1;
    picked.push([tag, w, facet]);
    if (picked.length === size) break;
  }
  const max = picked[0]?.[1] || 1;
  const keep = new Set(picked.map(([t]) => t));
  const pair = new Map();
  const behind = new Map();
  for (const s of all) {
    const tags = s.signals.filter((x) => x.tier !== 'possible' && keep.has(x.tag)).map((x) => x.tag);
    for (const t of tags) behind.set(t, [...(behind.get(t) || []), s.title]);
    for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) {
      const key = [tags[i], tags[j]].sort().join('|');
      pair.set(key, (pair.get(key) || 0) + 1);
    }
  }
  return {
    tastes: picked.map(([tag, w, facet]) => ({
      tag,
      facet,
      weight: +(w / max).toFixed(2),
      side: clusters.slice(0, 3).findIndex((c) => c.tags.includes(tag)),
      saves: (behind.get(tag) || []).length,
      examples: (behind.get(tag) || []).slice(0, 2),
    })),
    threads: [...pair.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, threads).map(([k, n]) => {
      const [a, b] = k.split('|');
      return { a, b, n };
    }),
  };
}

// The taste web: six sides of a life, each a set of tags (or a facet).
const WEB = [
  { key: 'music', label: 'Music', test: (t) => facetOf(t) === 'sound' || ['vinyl', 'live music'].includes(t) },
  { key: 'food', label: 'Food & drink', test: (t) => facetOf(t) === 'food' || ['wine bar', 'cocktails', 'coffee', 'pastry'].includes(t) },
  { key: 'nights', label: 'Nights out', test: (t) => ['night out', 'late night', 'live music', 'comedy', 'speakeasy', 'rooftop', 'cocktails', 'wine bar', 'lively', 'high-energy'].includes(t) },
  { key: 'culture', label: 'Art & culture', test: (t) => ['art', 'gallery', 'contemporary art', 'photography', 'architecture', 'design', 'craft', 'books', 'film', 'cinema', 'dark academia', 'classical'].includes(t) },
  { key: 'style', label: 'Style', test: (t) => ['tailoring', 'vintage', 'minimal', 'outerwear', 'linen', 'streetwear', 'classic', 'dark academia', 'fashion', 'interiors', 'beauty'].includes(t) },
  { key: 'travel', label: 'Travel', test: (t) => facetOf(t) === 'place' || ['travel', 'hotel'].includes(t) },
];

// What a save is counts too, not only what it's tagged: a song is music
// even before its genre is known. Weight per save, by kind, onto an axis.
const WEB_KINDS = { song: ['music', 1], food: ['food', 1], look: ['style', 1], art: ['culture', 1], event: ['nights', 0.5] };

/**
 * Your taste web: how much of your taste goes to each side of life, 0–1
 * relative to your biggest (square-rooted), from your tastes and from what you save (every
 * song counts towards music), with what leads each side: its top tastes,
 * or for music your most-saved artists when genres are thin.
 */
export function tasteWeb(profile, saves = []) {
  const byKind = countBy(saves, (s) => s.kind);
  const artists = new Map();
  for (const s of saves) {
    if (s.kind !== 'song' || !s.creator) continue;
    const first = splitCreators(s.creator)[0];
    if (first) artists.set(first, (artists.get(first) || 0) + 1);
  }
  const topArtists = [...artists.entries()].sort((x, y) => y[1] - x[1]).map(([n]) => n);
  const axes = WEB.map(({ key, label, test }) => {
    const tags = [...profile.entries()].filter(([t, v]) => v > 0 && !t.startsWith('creator:') && test(t)).sort((a, b) => b[1] - a[1]);
    const fromKinds = Object.entries(WEB_KINDS).filter(([, [axis]]) => axis === key).reduce((n, [kind, [, w]]) => n + (byKind[kind] || 0) * w, 0);
    let top = tags.slice(0, 2).map(([t]) => t);
    if (key === 'music' && top.length < 2) top = [...top, ...topArtists.filter((n) => !top.includes(n))].slice(0, 2);
    return { key, label, raw: tags.reduce((a, [, v]) => a + v, 0) + fromKinds, top };
  });
  const max = Math.max(...axes.map((a) => a.raw));
  if (!(max > 0)) return null;
  // Square-rooted, so a huge music library leads without flattening every other side.
  return axes.map(({ raw, ...a }) => ({ ...a, value: +Math.sqrt(raw / max).toFixed(2) }));
}

/** Metres between two points on Earth. */
export function distanceM(a, b) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/**
 * Make a day (or night) of it: for each event, the best-matching place within
 * walking distance, so "see this show" comes with "and eat here, it's four
 * minutes away and you love coffee and art". Needs coordinates on both.
 */
export function pairSpots({ events, places, profile, maxM = 1500, limit = 3 }) {
  const out = [];
  const used = new Set();
  for (const ev of events) {
    if (ev.spot.lat == null) continue;
    let best = null;
    for (const pl of places) {
      if (used.has(pl.spot.id) || pl.spot.lat == null || pl.spot.city !== ev.spot.city) continue;
      const d = distanceM(ev.spot, pl.spot);
      if (d > maxM) continue;
      // Closer is better, but taste matters more.
      const score = pl.score + 0.15 * (1 - d / maxM);
      if (!best || score > best.score) best = { place: pl, d, score };
    }
    if (!best) continue;
    used.add(best.place.spot.id);
    const because = best.place.spot.tags.filter((t) => (profile.get(t) || 0) > 0).sort((a, b) => profile.get(b) - profile.get(a)).slice(0, 2);
    out.push({ event: ev, place: best.place, distance: best.d, walk: Math.max(1, Math.round(best.d / 80)), because });
    if (out.length === limit) break;
  }
  return out;
}

function countBy(list, key) {
  const m = {};
  for (const x of list) m[key(x)] = (m[key(x)] || 0) + 1;
  return m;
}

// A day out, slot by slot: what kind of spot fits each part of the day.
const DAY_SLOTS = [
  { slot: 'Morning', tags: ['coffee', 'pastry', 'market', 'outdoors', 'books'], kinds: ['place'] },
  { slot: 'Afternoon', tags: ['art', 'gallery', 'craft', 'architecture', 'design', 'photography', 'vinyl', 'books', 'market'], kinds: ['place', 'event'] },
  { slot: 'Evening', tags: ['jazz', 'wine bar', 'cocktails', 'live music', 'comedy', 'moody', 'intimate', 'house', 'techno', 'food', 'folk'], kinds: ['event', 'place'] },
];

/**
 * Your perfect day in a city: the best-matching spot for the morning, the
 * afternoon and the evening, each a different place, events only if they're
 * on in the next week.
 */
export function perfectDay({ profile, saves, spots, city, today = new Date().toISOString().slice(0, 10), exclude = new Set() }) {
  const to = new Date(Date.parse(today) + 7 * 864e5).toISOString().slice(0, 10);
  const used = new Set(exclude);
  const out = [];
  for (const { slot, tags, kinds } of DAY_SLOTS) {
    const pool = spots.filter((sp) => kinds.includes(sp.kind) && sp.city && sp.tags.some((t) => tags.includes(t)));
    const best = rankSpots({ profile, saves, spots: pool, city, from: today, to, exclude: used, today })[0];
    if (!best) continue;
    used.add(best.spot.id);
    const because = best.spot.tags.filter((t) => (profile.get(t) || 0) > 0).sort((a, b) => profile.get(b) - profile.get(a)).slice(0, 2);
    out.push({ slot, spot: best.spot, match: best.match, because });
  }
  return out;
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
    // The city is part of a spot's character too: loving London artists counts towards London.
    if (spot.city) f.set(spot.city.toLowerCase(), 0.6);
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
