// Live things to buy, from eBay's Browse API: one search per kind of thing
// people's tastes point to (jazz on vinyl, a tweed blazer, a stoneware
// pour-over...), new and secondhand, with price, photo and a link to buy.
// They ship, so they're not tied to a city; fetched once for everyone, daily.
// Needs an app at https://developer.ebay.com (production keyset). eBay may
// ask you to apply for Buy API access before production use.
//
// Env: EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_MARKETPLACE (default EBAY_GB)
import { autoTag, cleanTags } from '../taxonomy.js';

const TOKEN = 'https://api.ebay.com/identity/v1/oauth2/token';
const SEARCH = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const SYMBOL = { EUR: '€', GBP: '£', USD: '$', AUD: 'A$', CAD: 'C$' };

// What to look for, and what each search means in Tastemate's words.
export const PRODUCT_SEARCHES = [
  ['jazz vinyl record', ['jazz', 'vinyl']],
  ['soul vinyl LP', ['soul', 'vinyl']],
  ['folk vinyl LP', ['folk', 'vinyl']],
  ['tweed blazer vintage', ['dark academia', 'tailoring', 'vintage']],
  ['linen shirt', ['minimal', 'linen', 'chill']],
  ['wool overcoat', ['tailoring', 'outerwear', 'classic']],
  ['beeswax candles', ['moody', 'intimate', 'cozy']],
  ['stoneware pour over coffee', ['coffee', 'craft', 'minimal']],
  ['handmade ceramic mug', ['craft', 'coffee', 'cozy']],
  ['35mm film camera', ['photography', 'vintage']],
  ['art print poster', ['art', 'design']],
  ['baking cookbook', ['pastry', 'cooking']],
  ['natural wine glasses', ['wine bar', 'intimate']],
  ['golf polo shirt', ['golf', 'sport', 'fashion']],
  ['yoga mat cork', ['wellness']],
  ['silk slip dress', ['fashion', 'romantic', 'luxe']],
];

export function createEbay({
  clientId = process.env.EBAY_CLIENT_ID,
  clientSecret = process.env.EBAY_CLIENT_SECRET,
  marketplace = process.env.EBAY_MARKETPLACE || 'EBAY_GB',
  fetchImpl = fetch,
  searches = PRODUCT_SEARCHES,
  perSearch = 5,
} = {}) {
  if (!clientId || !clientSecret) return null;
  let token = null;

  // An application token (no user involved), kept until shortly before it lapses.
  const auth = async () => {
    if (token && token.until > Date.now()) return token.value;
    const res = await fetchImpl(TOKEN, {
      method: 'POST',
      headers: { authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'https://api.ebay.com/oauth/api_scope' }).toString(),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`eBay sign-in failed: ${j.error_description || res.status}`);
    token = { value: j.access_token, until: Date.now() + ((j.expires_in || 7200) - 120) * 1000 };
    return token.value;
  };

  return {
    provider: 'ebay',
    label: 'eBay',
    kinds: ['product'],
    scope: 'global',
    ttl: 864e5,
    /** Things to buy, as spot rows with no city (they ship). */
    async fetchCity() {
      const access = await auth();
      const out = new Map();
      for (const [query, base] of searches) {
        const q = new URLSearchParams({ q: query, limit: '20', filter: 'buyingOptions:{FIXED_PRICE}' });
        const res = await fetchImpl(`${SEARCH}?${q}`, { headers: { authorization: `Bearer ${access}`, 'X-EBAY-C-MARKETPLACE-ID': marketplace } });
        if (!res.ok) throw new Error(`eBay answered ${res.status}`);
        let kept = 0;
        for (const it of (await res.json()).itemSummaries || []) {
          if (kept >= perSearch) break;
          if (!it.image?.imageUrl || !it.price?.value || out.has(it.itemId)) continue;
          kept++;
          const used = /used|pre-owned/i.test(it.condition || '');
          out.set(it.itemId, {
            kind: 'product',
            title: it.title.slice(0, 120),
            city: null,
            venue: used ? 'Secondhand on eBay' : 'On eBay',
            tags: cleanTags([...base, ...autoTag(it.title), ...(used ? ['vintage'] : [])]),
            description: it.condition || null,
            price: `${SYMBOL[it.price.currency] || `${it.price.currency} `}${Number(it.price.value).toFixed(0)}`,
            url: it.itemWebUrl || null,
            popularity: 0.5,
            image: it.image.imageUrl,
            credit: 'Listed on eBay',
            source: 'ebay',
            external_id: it.itemId,
          });
        }
      }
      return [...out.values()];
    },
  };
}
