// The note on the back of a "Why?" postcard, in plain words. Every line has
// several ways of saying it; which one a card uses is picked from the spot,
// so each card reads differently but the same card always says the same.

const and = (l) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}` : l[0] || '');
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function hash(s) {
  let h = 2166136261;
  for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  // Mix the bits (MurmurHash3's finaliser), so near-identical names still spread across the versions.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// A night out, a place, a thing: how the note talks about the spot.
const NOUN = { event: 'night out', place: 'place', product: 'thing' };

const SAY = {
  greeting: [(n) => `Dear ${n},`, (n) => `Hi ${n},`, (n) => `${n}!`, (n) => `Psst, ${n},`, (n) => `Hello ${n},`],
  tags: [
    (t) => `It’s ${t}, which is very you.`,
    (t) => `${cap(t)}? That has your name all over it.`,
    (t) => `All ${t}, just how you like it.`,
    (t, k) => `If ${t} were a ${NOUN[k] || 'place'}, it’d be this one.`,
    (t) => `Your saves keep circling ${t}, and this is exactly that.`,
    (t) => `${cap(t)}: basically your whole personality, in one go.`,
    (t) => `It has ${t} written all over it. So do you.`,
    (t) => `Picked for the ${t} in you.`,
  ],
  examples: [
    (e, a) => `Think “${e.join('” and “')}”${a ? `, from your ${a}` : ''}.`,
    (e) => `Remember “${e[0]}”? This is its cousin.`,
    (e, a) => `Same family as “${e.join('” and “')}”${a ? ` on your ${a}` : ''}.`,
    (e, a) => `You saved “${e[0]}”${a ? ` on ${a}` : ''}. This is the real-life version.`,
    (e) => `It sits right next to “${e[0]}” in your world.`,
  ],
  creator: [(c) => `And it’s ${c}, who you already love.`, (c) => `Plus, ${c}. Need we say more?`, (c) => `${c} is involved, so that’s settled.`],
  friends: [(f) => `${f} saved it too.`, (f) => `${f} got there first.`, (f) => `${f} has it saved, so you’re in good company.`],
  fresh: ['It only just opened.', 'Brand new, so you’ll be early.', 'Freshly opened: go before everyone else does.'],
  gem: ['Hardly anyone knows about it yet.', 'A proper under-the-radar find.', 'Not on the usual lists, which is rather the point.'],
  stretch: [
    (t, w) => `This one’s a little stretch: ${t}${w ? `, ${w}` : ''}. Go on.`,
    (t, w) => `A small detour: ${t}${w ? ` (${w})` : ''}. Your saves have been hinting.`,
    (t) => `Something different: ${t}. Trust me on this one.`,
  ],
  nudge: {
    event: ['Tickets won’t hang around.', 'Bring someone who’d love it.', 'Clear the evening.'],
    place: ['Pop in next time you’re passing.', 'Perfect for a slow afternoon.', 'Go hungry. Or curious. Ideally both.'],
    product: ['Consider it a little treat.', 'Future you will thank you.', 'It would look good with your things.'],
  },
  fallback: ['It just felt like you.', 'Call it a hunch.', 'Something told me you’d like this.'],
  signoff: ['x, your Tastemate', 'Love, your Tastemate', 'Go on, then. x Tastemate', 'Yours in good taste, Tastemate'],
};

/**
 * @param {{ spot: object, reasons: Array, name: string }} p
 * @returns {{ greeting: string, lines: string[], signoff: string }}
 */
export function postcardNote({ spot, reasons = [], name = 'you' }) {
  const seed = `${spot.id ?? ''}|${spot.title ?? ''}`;
  const pick = (list, part) => list[hash(`${seed}|${part}`) % list.length];
  const get = (t) => reasons.find((r) => r.type === t);

  const ev = get('saves')?.evidence || [];
  const tags = (ev.length ? ev.map((e) => e.tag) : get('tags')?.tags || []).slice(0, 3);
  const examples = [...new Set(ev.flatMap((e) => e.examples || []))].slice(0, 2);
  const apps = and([...new Set(ev.flatMap((e) => (e.sources || []).map((x) => x.label)))].slice(0, 2));

  const lines = [];
  const st = get('stretch');
  if (st) lines.push(pick(SAY.stretch, 'stretch')(and(st.tags) || 'something new', st.why));
  if (tags.length) lines.push(pick(SAY.tags, 'tags')(and(tags), spot.kind));
  if (examples.length) lines.push(pick(SAY.examples, 'examples')(examples, apps));
  const cr = get('creator');
  if (cr?.name) lines.push(pick(SAY.creator, 'creator')(cr.name));
  const fr = get('friends');
  if (fr?.names?.length) lines.push(pick(SAY.friends, 'friends')(and(fr.names)));
  if (get('new')) lines.push(pick(SAY.fresh, 'fresh'));
  if (get('gem')) lines.push(pick(SAY.gem, 'gem'));
  if (!lines.length) lines.push(pick(SAY.fallback, 'fallback'));
  const nudges = SAY.nudge[spot.kind];
  if (nudges) lines.push(pick(nudges, 'nudge'));

  return { greeting: pick(SAY.greeting, 'greeting')(name), lines, signoff: pick(SAY.signoff, 'signoff') };
}
