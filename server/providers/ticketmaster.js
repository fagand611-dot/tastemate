// Live events from Ticketmaster's Discovery API: gigs, comedy, theatre and
// more, with dates, venue, map position, a photo and prices. A free key from
// https://developer.ticketmaster.com covers 5,000 calls a day; Tastemate
// asks once per city every few hours. Coverage is strongest in North
// America, Europe, Australia and New Zealand.
//
// Env: TICKETMASTER_API_KEY
import { autoTag, cleanTags } from '../taxonomy.js';

const API = 'https://app.ticketmaster.com/discovery/v2/events.json';
const SYMBOL = { EUR: '€', GBP: '£', USD: '$', AUD: 'A$', CAD: 'C$', NZD: 'NZ$', JPY: '¥', THB: '฿' };

// What a Ticketmaster category means in Tastemate's words.
const SEGMENT_TAGS = { Music: ['live music', 'night out'], 'Arts & Theatre': ['theatre', 'art'], Film: ['film', 'cinema'], Sports: ['sport'] };
const GENRE_TAGS = { Comedy: ['comedy', 'funny'], Jazz: ['jazz'], Classical: ['classical'], Opera: ['classical', 'romantic'], 'Dance/Electronic': ['electronic', 'house'], Folk: ['folk'], Theatre: ['theatre'], 'Fine Art': ['art', 'gallery'] };

const iso = (d) => `${d}T00:00:00Z`;

export function createTicketmaster({ apiKey = process.env.TICKETMASTER_API_KEY, fetchImpl = fetch } = {}) {
  if (!apiKey) return null;
  return {
    provider: 'ticketmaster',
    label: 'Ticketmaster',
    kinds: ['event'],
    ttl: 6 * 36e5,
    /** Events in a city between two dates (YYYY-MM-DD), as spot rows. */
    async fetchCity(city, { from, to }) {
      const out = new Map();
      for (let page = 0; page < 2; page++) {
        const q = new URLSearchParams({ apikey: apiKey, city, startDateTime: iso(from), endDateTime: iso(to), size: '100', page: String(page), sort: 'date,asc', locale: '*' });
        const res = await fetchImpl(`${API}?${q}`);
        if (!res.ok) throw new Error(`Ticketmaster answered ${res.status}`);
        const j = await res.json();
        for (const e of j._embedded?.events || []) {
          const venue = e._embedded?.venues?.[0];
          const start = e.dates?.start;
          if (!start?.localDate || e.dates?.status?.code === 'cancelled') continue;
          // A run of shows is one spot, on its first date.
          const key = `${e.name}|${venue?.name}`.toLowerCase();
          if (out.has(key)) continue;
          const c = e.classifications?.[0] || {};
          const words = [c.segment?.name, c.genre?.name, c.subGenre?.name].filter((x) => x && x !== 'Undefined' && x !== 'Other');
          const tags = cleanTags([...(SEGMENT_TAGS[c.segment?.name] || []), ...(GENRE_TAGS[c.genre?.name] || []), ...autoTag(e.name, null, words.join(' · '), e.info || '')]);
          const price = e.priceRanges?.[0];
          const image = (e.images || []).filter((i) => i.ratio === '16_9' && i.width >= 640).sort((a, b) => a.width - b.width)[0] || e.images?.[0];
          out.set(key, {
            kind: 'event',
            title: e.name,
            city,
            venue: venue?.name || null,
            tags,
            description: (e.info || e.pleaseNote || '').slice(0, 300) || null,
            starts_at: start.localTime ? `${start.localDate}T${start.localTime.slice(0, 5)}` : start.localDate,
            ends_at: e.dates?.end?.localDate || null,
            price: price ? `${SYMBOL[price.currency] || `${price.currency} `}${Math.round(price.min)}${price.max > price.min ? `–${Math.round(price.max)}` : ''}` : null,
            url: e.url || null,
            popularity: 0.5,
            lat: venue?.location ? Number(venue.location.latitude) : null,
            lng: venue?.location ? Number(venue.location.longitude) : null,
            image: image?.url || null,
            credit: 'Tickets via Ticketmaster',
            source: 'ticketmaster',
            external_id: e.id,
          });
        }
        if (page + 1 >= (j.page?.totalPages || 1)) break;
      }
      return [...out.values()];
    },
  };
}
