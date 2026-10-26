// Live places from OpenStreetMap, with no key: cafés, bakeries, bars, pubs,
// restaurants by cuisine, record and book shops, vintage stores, wine shops,
// galleries, museums, and things to do (cinemas, theatres, clubs), around
// a city's centre. Nominatim finds the city, Overpass finds the places; both
// are free to use gently (Tastemate asks once per city every two weeks, and
// says who it is). No photos, so cards show their illustration. Google
// Places, when it has a key, takes over (it has ratings and photos).
//
// Env: OSM=off to switch it off; OSM_CONTACT (an email or URL, sent in the
// User-Agent as OpenStreetMap's usage policy asks).
import { autoTag, cleanTags } from '../taxonomy.js';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OVERPASS = 'https://overpass-api.de/api/interpreter';

// [Overpass filter, tags it means, how many to keep]
export const OSM_KINDS = [
  ['["amenity"="cafe"]', ['coffee', 'cozy'], 14],
  ['["shop"~"^(bakery|pastry)$"]', ['pastry', 'food'], 10],
  ['["amenity"="bar"]', ['night out', 'cocktails@0.5'], 12],
  ['["amenity"="pub"]', ['night out', 'casual'], 8],
  ['["amenity"="restaurant"]["cuisine"]', ['food'], 18],
  ['["amenity"="nightclub"]', ['night out', 'lively', 'house@0.6'], 6],
  ['["shop"="books"]', ['books', 'cerebral'], 8],
  ['["shop"="music"]', ['vinyl'], 6],
  ['["shop"~"^(second_hand|vintage)$"]', ['vintage'], 8],
  ['["shop"="clothes"]["second_hand"~"yes|only"]', ['vintage', 'fashion'], 6],
  ['["shop"="wine"]', ['wine bar'], 6],
  ['["tourism"="gallery"]', ['art', 'gallery'], 10],
  ['["amenity"="arts_centre"]', ['art', 'gallery', 'craft@0.5'], 6],
  ['["tourism"="museum"]', ['art@0.6', 'cerebral'], 8],
  ['["amenity"="cinema"]', ['film', 'cinema'], 6],
  ['["amenity"="theatre"]', ['theatre', 'live music@0.4'], 6],
];
// What a restaurant's cuisine says, in Tastemate's words.
const CUISINE = { japanese: ['japanese'], sushi: ['japanese', 'sushi'], ramen: ['noodles', 'japanese'], thai: ['thai', 'street food@0.5'], noodle: ['noodles'], italian: ['pizza@0.6'], pizza: ['pizza'], vegan: ['vegan'], vegetarian: ['vegan@0.6'], french: ['pastry@0.4', 'wine bar@0.4'], wine: ['wine bar'], tapas: ['wine bar@0.5'], coffee_shop: ['coffee'], brunch: ['brunch'], breakfast: ['brunch'] };
const weighted = (tags) => tags.map((t) => t.split('@')[0]);

export function createOsm({
  enabled = process.env.OSM !== 'off',
  contact = process.env.OSM_CONTACT || 'https://github.com/fagand611-dot/tastemate',
  fetchImpl = fetch,
  radius = 4000,
  kinds = OSM_KINDS,
} = {}) {
  if (!enabled) return null;
  const headers = { 'User-Agent': `Tastemate/1.0 (${contact})`, Accept: 'application/json' };
  return {
    provider: 'osm',
    label: 'OpenStreetMap',
    kinds: ['place'],
    ttl: 14 * 864e5,
    async fetchCity(city) {
      const geo = await fetchImpl(`${NOMINATIM}?${new URLSearchParams({ q: city, format: 'json', limit: '1' })}`, { headers });
      if (!geo.ok) throw new Error(`OpenStreetMap couldn’t find ${city} (${geo.status})`);
      const [hit] = await geo.json();
      if (!hit) throw new Error(`OpenStreetMap doesn’t know ${city}`);
      const at = `around:${radius},${Number(hit.lat)},${Number(hit.lon)}`;
      const query = `[out:json][timeout:25];(${kinds.map(([f]) => `nwr${f}["name"](${at});`).join('')});out center tags 1500;`;
      const res = await fetchImpl(OVERPASS, { method: 'POST', headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ data: query }).toString() });
      if (!res.ok) throw new Error(`OpenStreetMap answered ${res.status}`);
      const elements = (await res.json()).elements || [];
      const out = [];
      const seen = new Set();
      for (const [filter, base, keep] of kinds) {
        // The places that match this kind, best documented first (a website, hours, a Wikidata entry).
        const match = elements.filter((e) => e.tags?.name && matches(e.tags, filter) && !seen.has(`${e.type}/${e.id}`));
        match.sort((a, b) => score(b.tags) - score(a.tags));
        for (const e of match.slice(0, keep)) {
          seen.add(`${e.type}/${e.id}`);
          const t = e.tags;
          const cuisine = String(t.cuisine || '').toLowerCase().split(/[;,]/).map((x) => x.trim());
          const tags = cleanTags([...weighted(base), ...cuisine.flatMap((c) => weighted(CUISINE[c] || [])), ...autoTag(t.name, null, null, t.description || '')]);
          out.push({
            kind: 'place',
            title: t.name,
            city,
            venue: t['addr:suburb'] || t['addr:neighbourhood'] || t['addr:street'] || null,
            tags,
            description: t.description?.slice(0, 300) || (cuisine[0] ? `${cuisine[0][0].toUpperCase()}${cuisine[0].slice(1).replace(/_/g, ' ')} kitchen` : null),
            url: t.website || t['contact:website'] || `https://www.openstreetmap.org/${e.type}/${e.id}`,
            // Known well enough to have a Wikidata entry: a landmark, not a find.
            popularity: t.wikidata ? 0.8 : 0.4,
            lat: e.lat ?? e.center?.lat ?? null,
            lng: e.lon ?? e.center?.lon ?? null,
            image: null,
            credit: 'Map data © OpenStreetMap contributors',
            source: 'osm',
            external_id: `${e.type}/${e.id}`,
          });
        }
      }
      return out;
    },
  };
}

const score = (t = {}) => (t.website || t['contact:website'] ? 2 : 0) + (t.opening_hours ? 1 : 0) + (t.wikidata ? 1 : 0);

/** Whether an element's tags fit an Overpass filter like ["shop"~"^(a|b)$"]["second_hand"~"yes|only"]. */
export function matches(tags, filter) {
  for (const [, k, op, v] of filter.matchAll(/\["([^"]+)"(=|~)"([^"]*)"\]/g)) {
    const have = tags[k];
    if (have == null) return false;
    if (op === '=' ? have !== v : !new RegExp(v).test(have)) return false;
  }
  // Bare ["key"]: the key just has to be there.
  for (const [, k] of filter.matchAll(/\["([^"]+)"\]/g)) if (tags[k] == null) return false;
  return true;
}
