// "Make a picture of my bag / my room from what you know about me": the
// things your saves say you'd carry and live with, each labelled from a real
// save where there is one ("The Secret History", "Kind of Blue on the
// turntable"), plus a line that reflects it back to you.
//
// Pure. The page draws the objects (web/src/components/Collage.jsx).

// [object, where it goes, tags that call for it, fallback caption]
// "where": bag, room or both. Order breaks ties.
const OBJECTS = [
  ['headphones', 'bag', ['jazz', 'soul', 'neo-soul', 'folk', 'house', 'techno', 'classical', 'electronic', 'pop', 'live music'], 'always on'],
  ['turntable', 'room', ['vinyl', 'jazz', 'soul', 'folk', 'classical'], 'a record always on'],
  ['poster', 'room', ['live music', 'jazz', 'film', 'cinema', 'soul', 'house'], 'a poster from a night out'],
  ['book', 'both', ['books', 'dark academia', 'cerebral'], 'a paperback, dog-eared'],
  ['coffee', 'bag', ['coffee'], 'flat white, oat'],
  ['mug', 'room', ['coffee', 'cozy'], 'the good mug'],
  ['croissant', 'bag', ['pastry', 'viennoiserie'], 'from the bakery that sells out'],
  ['wine', 'room', ['wine bar'], 'something skin-contact, already open'],
  ['candle', 'room', ['moody', 'intimate', 'romantic', 'atmospheric'], 'lit, always'],
  ['matches', 'bag', ['moody', 'intimate', 'speakeasy', 'cocktails'], 'matches from a bar you love'],
  ['ticket', 'bag', ['film', 'cinema', 'comedy', 'live music', 'gallery', 'exhibition'], 'a ticket stub you kept'],
  ['camera', 'bag', ['photography', 'vintage', 'art'], 'a film camera, half a roll left'],
  ['frame', 'room', ['art', 'gallery', 'photography', 'contemporary art', 'design'], 'a print from a gallery shop'],
  ['coat', 'room', ['tailoring', 'outerwear', 'classic', 'dark academia'], 'the coat that goes with everything'],
  ['sunglasses', 'bag', ['rooftop', 'outdoors', 'lively', 'summer'], 'for the rooftop'],
  ['chopsticks', 'bag', ['noodles', 'street food', 'thai', 'sushi'], 'for the late-night noodles'],
  ['cocktail', 'room', ['cocktails', 'speakeasy'], 'a coupe glass, ready'],
  ['plant', 'room', ['chill', 'minimal', 'outdoors', 'craft'], 'a plant that is somehow thriving'],
  ['lamp', 'room', ['cozy', 'warm', 'intimate'], 'low and golden'],
  ['disco', 'room', ['house', 'techno', 'high-energy', 'lively'], 'for when the dinner turns into a party'],
  ['notebook', 'bag', ['craft', 'design', 'cerebral', 'architecture', 'minimal'], 'lists, sketches, a café name'],
  ['vase', 'room', ['romantic', 'minimal', 'pastry'], 'market flowers'],
];

// Objects that take their label from a real save: which kinds of save, and
// how the label reads. Everything else keeps its own caption.
const FROM_SAVE = {
  book: [['book'], (x) => x.title],
  ticket: [['event'], (x) => `${x.title}, the stub`],
  headphones: [['song'], (x) => `${x.title}${x.creator ? `, ${x.creator}` : ''} on repeat`],
  turntable: [['song'], (x) => `${x.creator ? `${x.creator}, ` : ''}${x.title} on the turntable`],
  poster: [['song', 'event'], (x) => x.creator || x.title],
  coffee: [['place'], (x) => `a flat white from ${x.title}`],
  croissant: [['place', 'food'], (x) => `a croissant from ${x.title}`],
  matches: [['place'], (x) => `matches from ${x.title}`],
  wine: [['place', 'product'], (x) => `a bottle from ${x.title}`],
  frame: [['place', 'event', 'art'], (x) => `a print from ${x.title}`],
};

/**
 * @param {Array} saves    interpreted saves (with signals)
 * @param {Map}   profile  from tasteProfile()
 * @param {object} [opts]  { city: home city, nightOwl: 0..1 }
 * @returns {{ bag: Item[], room: Item[], window: {city, night}, reflection: {bag, room} } | null}
 *   Item = { obj, caption, tag, from? }
 */
export function tasteCollage(saves, profile, { city = null, nightOwl = 0.5 } = {}) {
  if (!saves.length) return null;
  const firm = (s) => s.signals.filter((x) => x.tier !== 'possible').map((x) => x.tag);
  const used = new Set();
  const scored = OBJECTS.map(([obj, where, tags, fallback], order) => {
    const hits = tags.filter((t) => (profile.get(t) || 0) > 0);
    const score = hits.reduce((a, t) => a + profile.get(t), 0) / Math.sqrt(tags.length);
    return { obj, where, tags, fallback, hits, score, order };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.order - b.order);

  // A caption from a real save of the right kind that carries its tags
  // (not an @handle, which reads oddly in a sentence).
  const caption = (o) => {
    const rule = FROM_SAVE[o.obj];
    if (!rule) return { caption: o.fallback };
    const best = saves
      .filter((s) => !used.has(s.id) && rule[0].includes(s.kind) && !s.title.startsWith('@'))
      .map((s) => ({ s, n: firm(s).filter((t) => o.tags.includes(t)).length }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)[0]?.s;
    if (!best) return { caption: o.fallback };
    used.add(best.id);
    return { caption: rule[1](best), from: best.id };
  };

  const take = (where, n) => scored
    .filter((o) => o.where === where || o.where === 'both')
    .slice(0, n)
    .map((o) => ({ obj: o.obj, tag: o.hits[0], ...caption(o) }));

  const bag = take('bag', 7);
  if (city) bag.push({ obj: 'keys', tag: 'home', caption: `keys, with a ${city} keyring` });
  const room = take('room', 8);

  const names = (list) => list.slice(0, 3).map((x) => SAY[x.obj]).filter(Boolean);
  const join = (l) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}` : l[0] || '');
  const night = nightOwl >= 0.55;
  return {
    bag,
    room,
    window: { city, night },
    reflection: {
      bag: bag.length ? `Never leaves the house without ${join(names(bag))}.` : null,
      room: room.length ? `${night ? 'A room for late nights' : 'A room for slow mornings'}: ${join(names(room))}.` : null,
    },
  };
}

// How each object reads in a sentence.
const SAY = {
  headphones: 'headphones', turntable: 'a record playing', poster: 'a gig poster', book: 'a book', coffee: 'a coffee', mug: 'the good mug',
  croissant: 'something from a bakery', wine: 'a bottle open', candle: 'candles lit', matches: 'a matchbook from a bar', ticket: 'a ticket stub',
  camera: 'a film camera', frame: 'art on the wall', coat: 'a good coat', sunglasses: 'sunglasses', chopsticks: 'chopsticks for later',
  cocktail: 'a coupe glass', plant: 'a plant', lamp: 'a low lamp', disco: 'a disco ball', notebook: 'a notebook', vase: 'fresh flowers',
};
