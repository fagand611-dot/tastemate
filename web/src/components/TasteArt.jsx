// Chunky cartoon illustrations for tastes: the character emblem, each side,
// and the parts of a perfect day. 64×64, thick ink outlines over a fill
// colour (--art-fill), with a white highlight, like a sticker.

const O = { fill: 'none', stroke: 'var(--art-ink)', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' };
const F = { fill: 'var(--art-fill)', stroke: 'var(--art-ink)', strokeWidth: 3, strokeLinejoin: 'round' };
const W = { fill: '#fff', opacity: 0.75 };

const ART = {
  // A saxophone: mouthpiece, body with keys, curved bell
  jazz: (
    <>
      <path {...O} d="M30 6l8 4" strokeWidth="4" />
      <path {...F} d="M34 9l6 3-4 30c-1 8-6 14-14 14-7 0-12-5-12-11 0-3 1-5 3-7l8 4c-1 1-1 2-1 3 0 2 1 3 3 3 3 0 4-3 5-6z" />
      <path {...F} d="M10 42c0-4 2-7 4-9l10 5c-2 2-3 4-3 6z" />
      <circle cx="35" cy="20" r="2.4" fill="#fff" stroke="var(--art-ink)" strokeWidth="2" />
      <circle cx="34" cy="27" r="2.4" fill="#fff" stroke="var(--art-ink)" strokeWidth="2" />
      <circle cx="33" cy="34" r="2.4" fill="#fff" stroke="var(--art-ink)" strokeWidth="2" />
      <path d="M50 14l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" fill="#ffd166" stroke="var(--art-ink)" strokeWidth="1.5" />
      <path d="M52 32c2 2 2 5 0 7" fill="none" stroke="var(--art-ink)" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  // A record
  vinyl: (
    <>
      <circle {...F} cx="32" cy="32" r="24" />
      <circle {...O} cx="32" cy="32" r="16" strokeWidth="2" />
      <circle cx="32" cy="32" r="7" fill="var(--art-ink)" />
      <circle cx="32" cy="32" r="2" fill="#fff" />
      <path {...W} d="M14 24a20 20 0 0 1 10-10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  // A candle
  moody: (
    <>
      <rect {...F} x="24" y="28" width="16" height="28" rx="3" />
      <path {...O} d="M32 28v-5" />
      <path d="M32 6c6 7 7 12 0 17-7-5-6-10 0-17z" fill="#ffb347" stroke="var(--art-ink)" strokeWidth="3" strokeLinejoin="round" />
      <path {...O} d="M20 56h24" />
      <rect {...W} x="27" y="32" width="3" height="16" rx="1.5" />
    </>
  ),
  // A croissant
  pastry: (
    <>
      <path {...F} d="M8 40c4-14 14-22 24-22s20 8 24 22c-6 2-10-1-12-4-3 4-7 6-12 6s-9-2-12-6c-2 3-6 6-12 4z" />
      <path {...O} d="M24 24l4 14M40 24l-4 14M32 20v18" strokeWidth="2.5" />
      <ellipse {...W} cx="20" cy="30" rx="3" ry="2" />
    </>
  ),
  // A coffee cup
  coffee: (
    <>
      <path {...F} d="M12 26h32v14c0 8-6 14-14 14h-4c-8 0-14-6-14-14z" />
      <path {...O} d="M44 30h4a6 6 0 0 1 0 12h-4" />
      <path {...O} d="M22 8c-3 4 3 6 0 10M32 8c-3 4 3 6 0 10" strokeWidth="2.5" />
      <rect {...W} x="16" y="30" width="3" height="12" rx="1.5" />
    </>
  ),
  // A wine glass
  'wine bar': (
    <>
      <path {...F} d="M20 8h24c0 14-4 24-12 24S20 22 20 8z" />
      <path {...O} d="M32 32v16M22 56h20M32 48v8" />
      <path d="M21 16h22c-1 9-5 14-11 14s-10-5-11-14z" fill="#9c2f45" opacity="0.85" />
      <ellipse {...W} cx="26" cy="14" rx="2" ry="4" />
    </>
  ),
  // A cocktail glass
  cocktails: (
    <>
      <path {...F} d="M10 12h44L32 36z" />
      <path {...O} d="M32 36v16M22 56h20" />
      <circle cx="44" cy="12" r="6" fill="#9ed36a" stroke="var(--art-ink)" strokeWidth="3" />
      <path {...O} d="M26 18l14-6" strokeWidth="2.5" />
    </>
  ),
  // A painter's palette
  art: (
    <>
      <path {...F} d="M32 8C17 8 8 18 8 30c0 12 10 20 20 20 4 0 4-4 2-6s-2-6 2-6h8c10 0 16-6 16-14C56 14 46 8 32 8z" />
      <circle cx="20" cy="26" r="4" fill="#ef5b5b" stroke="var(--art-ink)" strokeWidth="2" />
      <circle cx="30" cy="18" r="4" fill="#ffd166" stroke="var(--art-ink)" strokeWidth="2" />
      <circle cx="42" cy="20" r="4" fill="#4cc9a0" stroke="var(--art-ink)" strokeWidth="2" />
      <circle cx="44" cy="31" r="4" fill="#4d8ee8" stroke="var(--art-ink)" strokeWidth="2" />
    </>
  ),
  // A building
  architecture: (
    <>
      <path {...F} d="M14 56V18l18-10 18 10v38z" />
      <path {...O} d="M22 26h6M36 26h6M22 36h6M36 36h6M28 56V46h8v10M8 56h48" />
    </>
  ),
  // A vase
  craft: (
    <>
      <path {...F} d="M24 8h16v6c0 4 10 10 10 22 0 12-8 20-18 20S14 48 14 36c0-12 10-18 10-22z" />
      <path {...O} d="M18 32c8 4 20 4 28 0" strokeWidth="2.5" />
      <ellipse {...W} cx="22" cy="40" rx="2" ry="5" />
    </>
  ),
  // A cube
  minimal: (
    <>
      <path {...F} d="M32 8l20 11v24L32 54 12 43V19z" />
      <path {...O} d="M12 19l20 11 20-11M32 30v24" />
      <path d="M14 22l18 10v20L14 42z" fill="#fff" opacity="0.4" />
    </>
  ),
  // A coat on a hanger
  tailoring: (
    <>
      <path {...O} d="M32 8a4 4 0 1 1 4 4l-4 4" />
      <path {...F} d="M32 16L14 28v28h12V38l6-8 6 8v18h12V28z" />
      <path {...O} d="M32 30v26" strokeWidth="2.5" />
    </>
  ),
  // An old camera
  vintage: (
    <>
      <rect {...F} x="8" y="18" width="48" height="32" rx="6" />
      <path {...O} d="M20 18l4-6h16l4 6" />
      <circle cx="32" cy="34" r="10" fill="#fff" stroke="var(--art-ink)" strokeWidth="3" />
      <circle cx="32" cy="34" r="4" fill="var(--art-ink)" />
    </>
  ),
  // An open book
  books: (
    <>
      <path {...F} d="M32 16c-6-4-14-6-24-6v38c10 0 18 2 24 6 6-4 14-6 24-6V10c-10 0-18 2-24 6z" />
      <path {...O} d="M32 16v38" />
      <path {...O} d="M14 20h10M14 28h10M40 20h10M40 28h10" strokeWidth="2" />
    </>
  ),
  // A disco ball
  house: (
    <>
      <path {...O} d="M32 4v8" />
      <circle {...F} cx="32" cy="34" r="22" />
      <path {...O} d="M10 34h44M32 12v44M16 20c10 6 22 6 32 0M16 48c10-6 22-6 32 0" strokeWidth="2" />
      <path d="M50 10l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="#ffd166" stroke="var(--art-ink)" strokeWidth="2" />
    </>
  ),
  // A speaker
  techno: (
    <>
      <rect {...F} x="14" y="6" width="36" height="52" rx="6" />
      <circle cx="32" cy="38" r="11" fill="#fff" stroke="var(--art-ink)" strokeWidth="3" />
      <circle cx="32" cy="38" r="4" fill="var(--art-ink)" />
      <circle cx="32" cy="17" r="5" fill="#fff" stroke="var(--art-ink)" strokeWidth="3" />
    </>
  ),
  // A microphone
  'live music': (
    <>
      <rect {...F} x="22" y="6" width="20" height="30" rx="10" />
      <path {...O} d="M14 30a18 18 0 0 0 36 0M32 48v8M22 58h20" />
      <path {...O} d="M24 18h16M24 24h16" strokeWidth="2" />
    </>
  ),
  // A guitar
  folk: (
    <>
      <path {...F} d="M24 30c-8 0-14 6-14 13s6 13 14 13c5 0 8-3 10-6 6 0 10-4 10-9s-4-8-8-8c0-3-6-3-12-3z" />
      <path {...O} d="M34 34L52 10M48 8l6 6" />
      <circle cx="26" cy="43" r="4" fill="var(--art-ink)" />
    </>
  ),
  // A noodle bowl
  'street food': (
    <>
      <path {...F} d="M8 30h48c0 14-10 24-24 24S8 44 8 30z" />
      <path {...O} d="M18 30c0-6 4-10 4-16M28 30c0-6 4-10 4-16M40 8L28 28M48 10L32 28" strokeWidth="2.5" />
      <path {...O} d="M22 54h20" />
    </>
  ),
  // Mountains
  outdoors: (
    <>
      <path {...F} d="M4 54l18-30 10 14 8-10 20 26z" />
      <path d="M22 24l6 10-6-3-5 3z" fill="#fff" />
      <circle cx="48" cy="14" r="6" fill="#ffd166" stroke="var(--art-ink)" strokeWidth="3" />
    </>
  ),
  // An armchair
  cozy: (
    <>
      <path {...F} d="M14 34V20c0-6 4-10 10-10h16c6 0 10 4 10 10v14" />
      <path {...F} d="M8 30c0-3 2-5 5-5s5 2 5 5v8h28v-8c0-3 2-5 5-5s5 2 5 5v18H8z" />
      <path {...O} d="M14 48v6M50 48v6" />
    </>
  ),
  // Headphones
  electronic: (
    <>
      <path {...O} d="M12 38v-6a20 20 0 0 1 40 0v6" strokeWidth="4" />
      <rect {...F} x="8" y="34" width="12" height="20" rx="5" />
      <rect {...F} x="44" y="34" width="12" height="20" rx="5" />
    </>
  ),
  // Two notes
  classical: (
    <>
      <path {...O} d="M24 46V14l26-6v32" />
      <ellipse {...F} cx="18" cy="46" rx="8" ry="6" />
      <ellipse {...F} cx="44" cy="40" rx="8" ry="6" />
      <path {...O} d="M24 22l26-6" />
    </>
  ),
  // A moon and a star
  dark: (
    <>
      <path {...F} d="M40 8a22 22 0 1 0 16 30A18 18 0 0 1 40 8z" />
      <path d="M18 12l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="#ffd166" stroke="var(--art-ink)" strokeWidth="2" />
    </>
  ),
  // A wave
  chill: (
    <>
      <path {...F} d="M4 40c6-6 12-6 18 0s12 6 18 0 12-6 18 0v16H4z" />
      <path {...O} d="M4 28c6-6 12-6 18 0s12 6 18 0 12-6 18 0" />
    </>
  ),
  // A light bulb
  cerebral: (
    <>
      <path {...F} d="M32 6a18 18 0 0 0-10 33c2 2 3 4 3 7h14c0-3 1-5 3-7A18 18 0 0 0 32 6z" />
      <path {...O} d="M25 52h14M27 58h10" />
      <path {...W} d="M24 18a10 10 0 0 1 6-5" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  // A cloud
  atmospheric: (
    <>
      <path {...F} d="M18 48a10 10 0 0 1 0-20 14 14 0 0 1 27-4 12 12 0 0 1 3 24z" />
      <ellipse {...W} cx="24" cy="36" rx="4" ry="2" />
    </>
  ),
  // A heart
  emotional: (
    <>
      <path {...F} d="M32 54S8 40 8 24a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 16-24 30-24 30z" />
      <ellipse {...W} cx="20" cy="24" rx="3" ry="5" />
    </>
  ),
  // A sun
  warm: (
    <>
      <circle {...F} cx="32" cy="32" r="13" />
      <path {...O} d="M32 6v8M32 50v8M6 32h8M50 32h8M13 13l6 6M45 45l6 6M51 13l-6 6M19 45l-6 6" />
    </>
  ),
  // A lightning bolt
  'high-energy': <path {...F} d="M36 4L12 36h16l-4 24 26-34H34z" />,
  // A compass, for the curious
  explorer: (
    <>
      <circle {...F} cx="32" cy="32" r="24" />
      <path d="M40 22l-5 13-11 7 5-13z" fill="#fff" stroke="var(--art-ink)" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="2" fill="var(--art-ink)" />
    </>
  ),
  // Parts of the day
  Morning: (
    <>
      <path {...F} d="M14 44a18 18 0 0 1 36 0z" />
      <path {...O} d="M6 44h52M32 14v6M14 24l4 4M50 24l-4 4" />
    </>
  ),
  Afternoon: (
    <>
      <circle {...F} cx="32" cy="30" r="13" />
      <path {...O} d="M32 6v6M32 48v6M8 30h6M50 30h6M15 13l4 4M45 43l4 4M49 13l-4 4M19 43l-4 4" />
    </>
  ),
  Evening: (
    <>
      <path {...F} d="M38 10a20 20 0 1 0 16 28A16 16 0 0 1 38 10z" />
      <circle cx="18" cy="16" r="2" fill="var(--art-ink)" />
      <circle cx="12" cy="30" r="1.5" fill="var(--art-ink)" />
    </>
  ),
};

// Tastes that share a drawing.
const SAME = {
  romantic: 'moody', intimate: 'moody', soul: 'live music', 'neo-soul': 'live music', comedy: 'live music',
  'dark academia': 'books', photography: 'vintage', lively: 'house', uplifting: 'warm', gallery: 'art', design: 'minimal',
  food: 'street food', thai: 'street food', market: 'street food', outerwear: 'tailoring', rooftop: 'cocktails',
};

export const hasArt = (key) => !!(ART[key] || ART[SAME[key]]);

/** One illustration. `fill` is the sticker colour. */
export default function TasteArt({ name, fill = 'var(--series-1)', size = 64, className = '' }) {
  const art = ART[name] || ART[SAME[name]] || ART.explorer;
  return (
    <svg className={`taste-art ${className}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ '--art-fill': fill }}>
      {art}
    </svg>
  );
}
