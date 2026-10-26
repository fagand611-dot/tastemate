// Live places from Google Places (the "Places API (New)"): cafés, bakeries,
// bars, restaurants, record and book shops, vintage stores, galleries, each
// with its rating, price level, neighbourhood, map position and a photo.
// One text search per kind of place per city, about once a week. Billed per
// request after Google's monthly free credit. Photos are fetched through
// Tastemate (/api/photos/google) so the key never reaches the browser; their
// authors are credited on the card, as Google's terms ask.
//
// Env: GOOGLE_PLACES_API_KEY (with "Places API (New)" enabled)
import { autoTag, cleanTags } from '../taxonomy.js';

const SEARCH = 'https://places.googleapis.com/v1/places:searchText';
const FIELDS = [
  'id', 'displayName', 'shortFormattedAddress', 'location', 'types', 'rating', 'userRatingCount',
  'priceLevel', 'photos', 'googleMapsUri', 'editorialSummary', 'businessStatus',
].map((f) => `places.${f}`).join(',');

// What to look for in each city, and what each search means in Tastemate's words.
export const PLACE_SEARCHES = [
  ['specialty coffee', ['coffee', 'cozy']],
  ['bakery', ['pastry', 'food']],
  ['natural wine bar', ['wine bar', 'intimate']],
  ['cocktail bar', ['cocktails', 'night out']],
  ['jazz bar', ['jazz', 'live music', 'night out']],
  ['record store', ['vinyl']],
  ['independent bookshop', ['books', 'cerebral']],
  ['art gallery', ['art', 'gallery']],
  ['vintage clothing store', ['vintage']],
  ['design concept store', ['design', 'minimal']],
  ['noodle restaurant', ['noodles', 'food']],
  ['street food market', ['street food', 'market', 'food']],
  ['brunch', ['brunch', 'coffee']],
];
const PRICE = { PRICE_LEVEL_INEXPENSIVE: 'Cheap', PRICE_LEVEL_MODERATE: 'Mid-range', PRICE_LEVEL_EXPENSIVE: 'Pricey', PRICE_LEVEL_VERY_EXPENSIVE: 'Splurge' };
const PHOTO_REF = /^places\/[\w-]+\/photos\/[\w-]+$/;

export function createGooglePlaces({ apiKey = process.env.GOOGLE_PLACES_API_KEY, fetchImpl = fetch, searches = PLACE_SEARCHES } = {}) {
  if (!apiKey) return null;
  const photoCache = new Map();
  return {
    provider: 'google_places',
    label: 'Google Maps',
    kinds: ['place'],
    ttl: 7 * 864e5,
    /** Well-rated places in a city, one search per kind, as spot rows (a place found twice keeps both sets of tags). */
    async fetchCity(city) {
      const byId = new Map();
      for (const [query, base] of searches) {
        const res = await fetchImpl(SEARCH, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': FIELDS },
          body: JSON.stringify({ textQuery: `${query} in ${city}`, maxResultCount: 20, languageCode: 'en' }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(`Google Places answered ${res.status}${j.error?.message ? `: ${j.error.message}` : ''}`);
        }
        for (const p of (await res.json()).places || []) {
          // Open, and loved by enough people to trust the rating.
          if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue;
          if ((p.rating || 0) < 4.2 || (p.userRatingCount || 0) < 20) continue;
          const seen = byId.get(p.id);
          if (seen) {
            seen.tags = cleanTags([...seen.tags, ...base]);
            continue;
          }
          const name = p.displayName?.text || 'A place';
          const summary = p.editorialSummary?.text || null;
          const photo = p.photos?.[0];
          const author = photo?.authorAttributions?.[0]?.displayName;
          byId.set(p.id, {
            kind: 'place',
            title: name,
            city,
            venue: p.shortFormattedAddress || null,
            tags: cleanTags([...base, ...autoTag(name, null, null, summary || ''), ...(p.priceLevel === 'PRICE_LEVEL_INEXPENSIVE' ? ['budget'] : [])]),
            description: summary,
            price: PRICE[p.priceLevel] || null,
            url: p.googleMapsUri || null,
            // Fewer reviews, more of a find: 100 reviews is middling, 10,000 is famous.
            popularity: Math.min(1, Math.log10(1 + p.userRatingCount) / 4),
            lat: p.location?.latitude ?? null,
            lng: p.location?.longitude ?? null,
            image: photo?.name && PHOTO_REF.test(photo.name) ? `/api/photos/google?ref=${encodeURIComponent(photo.name)}` : null,
            credit: `${p.rating.toFixed(1)}★ on Google Maps${author ? ` · Photo: ${author}` : ''}`,
            source: 'google_places',
            external_id: p.id,
          });
        }
      }
      return [...byId.values()];
    },
    /** A short-lived image address for a photo reference (no key in it), cached for a few hours. */
    async photoUrl(ref) {
      if (!PHOTO_REF.test(ref)) return null;
      const hit = photoCache.get(ref);
      if (hit && hit.until > Date.now()) return hit.url;
      const q = new URLSearchParams({ maxWidthPx: '800', skipHttpRedirect: 'true', key: apiKey });
      const res = await fetchImpl(`https://places.googleapis.com/v1/${ref}/media?${q}`);
      if (!res.ok) return null;
      const url = (await res.json()).photoUri || null;
      if (photoCache.size > 5000) photoCache.clear();
      if (url) photoCache.set(ref, { url, until: Date.now() + 6 * 36e5 });
      return url;
    },
  };
}
