import TasteArt from './TasteArt.jsx';

// The Tastemate mascot: a round, big-eyed little character with blush
// cheeks and a single tear (a nod to Crybaby art), tinted by your top side
// and holding a sticker of your taste. It blinks and bobs gently.

// Fixed pastels, so the mascot stays sweet in dark mode too.
const PASTEL = { pink: '#ffc4dc', sky: '#c6e6ff', lilac: '#dccfff', mint: '#c4f2de', butter: '#ffeaa6', peach: '#ffd2c0' };

/**
 * @param {string} color  a pastel name (pink, sky, lilac, mint, butter, peach) or any CSS colour
 * @param {string} prop   a taste key for TasteArt ("jazz", "pastry"…); none if empty
 * @param {boolean} tear  show the little tear
 */
export default function Mascot({ color = 'pink', prop, tear = true, size = 160, className = '' }) {
  return (
    <span className={`mascot ${className}`} style={{ width: size, height: size, '--body': PASTEL[color] || color }} aria-hidden>
      <svg viewBox="0 0 160 160" width={size} height={size}>
        <ellipse cx="80" cy="150" rx="44" ry="6" className="m-shadow" />
        <g className="m-bob">
          {/* little ears/bun bumps */}
          <circle cx="38" cy="40" r="16" className="m-body" />
          <circle cx="122" cy="40" r="16" className="m-body" />
          {/* head */}
          <path className="m-body" d="M80 22c36 0 58 26 58 60s-24 58-58 58-58-24-58-58 22-60 58-60z" />
          {/* bangs */}
          <path className="m-hair" d="M30 66c4-26 24-42 50-42s46 16 50 42c-10-8-20-11-30-10 2-6 2-11 0-16-6 8-16 14-28 15 2-5 2-9 0-13-10 10-24 18-42 24z" />
          {/* eyes */}
          <g className="m-eyes">
            <ellipse cx="57" cy="86" rx="11" ry="14" className="m-eye" />
            <ellipse cx="103" cy="86" rx="11" ry="14" className="m-eye" />
            <circle cx="61" cy="80" r="4.5" fill="#fff" />
            <circle cx="107" cy="80" r="4.5" fill="#fff" />
            <circle cx="54" cy="92" r="2" fill="#fff" opacity="0.9" />
            <circle cx="100" cy="92" r="2" fill="#fff" opacity="0.9" />
          </g>
          {/* blush */}
          <ellipse cx="42" cy="106" rx="10" ry="6" className="m-blush" />
          <ellipse cx="118" cy="106" rx="10" ry="6" className="m-blush" />
          {/* mouth */}
          <path d="M72 108q8 7 16 0" className="m-line" />
          {/* the tear */}
          {tear && <path className="m-tear" d="M110 104c4 6 6 10 6 13a6 6 0 0 1-12 0c0-3 2-7 6-13z" />}
        </g>
      </svg>
      {prop && (
        <span className="m-prop">
          <TasteArt name={prop} size={Math.round(size * 0.42)} fill="var(--series-1, #b9a5ff)" />
        </span>
      )}
    </span>
  );
}

/** A tiny mascot face, for the logo. */
export function MascotFace({ size = 28 }) {
  return (
    <svg className="brand-face" viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <rect width="32" height="32" rx="11" fill="#f0739f" />
      <circle cx="11.5" cy="15" r="3.2" fill="#3a2a48" />
      <circle cx="20.5" cy="15" r="3.2" fill="#3a2a48" />
      <circle cx="12.6" cy="13.8" r="1.1" fill="#fff" />
      <circle cx="21.6" cy="13.8" r="1.1" fill="#fff" />
      <ellipse cx="8" cy="20" rx="2.4" ry="1.4" fill="#ff9cc5" />
      <ellipse cx="24" cy="20" rx="2.4" ry="1.4" fill="#ff9cc5" />
      <path d="M13.5 20.5q2.5 2.2 5 0" stroke="#3a2a48" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}
