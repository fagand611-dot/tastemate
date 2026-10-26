import { useState } from 'react';
import { WES } from './Retro.jsx';

// "Your world in one picture": what's in your bag and what your room looks
// like, drawn from your saves, the way people ask a chatbot to picture them.
// Every object is a small outlined drawing in a 120×120 box.

const INK = '#1f2433';
const CREAM = '#fffdf8';
const s = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' };

const OBJ = {
  tote: (a, b) => (
    <>
      <path {...s} fill="none" strokeWidth="5" d="M38 44c0-26 44-26 44 0" />
      <path {...s} fill={CREAM} d="M16 44h88l-6 68H22z" />
      <path {...s} fill={a} d="M16 44h88l-2 14H18z" />
      <circle cx="60" cy="82" r="13" fill={b} {...s} />
      <circle cx="55" cy="79" r="2" fill={INK} /><circle cx="65" cy="79" r="2" fill={INK} />
      <path {...s} fill="none" strokeWidth="2" d="M55 87q5 4 10 0" />
    </>
  ),
  headphones: (a, b) => (
    <>
      <path d="M26 72V58a34 34 0 0 1 68 0v14" fill="none" stroke={INK} strokeWidth="11" strokeLinecap="round" />
      <path d="M26 72V58a34 34 0 0 1 68 0v14" fill="none" stroke={b} strokeWidth="5" strokeLinecap="round" />
      <rect x="12" y="62" width="26" height="40" rx="12" fill={a} {...s} />
      <rect x="82" y="62" width="26" height="40" rx="12" fill={a} {...s} />
    </>
  ),
  turntable: (a, b) => (
    <>
      <rect x="8" y="30" width="104" height="72" rx="8" fill={b} {...s} />
      <circle cx="52" cy="66" r="30" fill={INK} />
      <circle cx="52" cy="66" r="22" fill="none" stroke="#3a4157" strokeWidth="1.5" />
      <circle cx="52" cy="66" r="10" fill={a} />
      <circle cx="52" cy="66" r="2" fill={INK} />
      <path {...s} fill="none" strokeWidth="4" d="M98 38v34l-20 12" />
      <circle cx="98" cy="38" r="5" fill={CREAM} {...s} />
    </>
  ),
  poster: (a, b, label = '') => (
    <>
      <rect x="18" y="8" width="84" height="106" fill={a} {...s} />
      <circle cx="60" cy="48" r="24" fill={b} {...s} />
      <path {...s} fill="none" d="M28 98h64M36 106h48" strokeWidth="2.5" />
      <text x="60" y="88" textAnchor="middle" fontFamily="Jost, sans-serif" fontWeight="700" fontSize="11" fill={INK}>{label.slice(0, 12).toUpperCase()}</text>
      <rect x="48" y="2" width="24" height="10" fill="#f6d77a" opacity="0.85" transform="rotate(-6 60 7)" />
    </>
  ),
  book: (a, b) => (
    <>
      <rect x="22" y="12" width="78" height="98" rx="4" fill={a} {...s} />
      <rect x="22" y="12" width="13" height="98" fill={b} {...s} />
      <rect x="46" y="32" width="42" height="24" fill={CREAM} {...s} strokeWidth="2.5" />
      <path {...s} strokeWidth="2.5" d="M52 40h30M52 48h20" />
      <path d="M78 110v10l6-5 6 5v-10" fill="#e5533c" {...s} strokeWidth="2" />
    </>
  ),
  coffee: (a, b) => (
    <>
      <path {...s} fill={CREAM} d="M34 36h52l-7 76H41z" />
      <path {...s} fill={a} d="M36 58h48l-2 22H38z" />
      <rect x="28" y="26" width="64" height="12" rx="5" fill={b} {...s} />
      <rect x="40" y="18" width="40" height="10" rx="4" fill={b} {...s} />
    </>
  ),
  mug: (a) => (
    <>
      <path {...s} fill="none" strokeWidth="6" d="M84 54h6a13 13 0 0 1 0 26h-6" />
      <rect x="28" y="38" width="58" height="66" rx="10" fill={a} {...s} />
      <path {...s} fill="none" strokeWidth="2.5" d="M46 28q-6-8 0-16M60 28q-6-8 0-16M74 28q-6-8 0-16" />
      <path {...s} fill="none" strokeWidth="2.5" d="M48 70q9 8 18 0" />
    </>
  ),
  croissant: () => (
    <>
      {[[22, 82, 9, 14, -58], [98, 82, 9, 14, 58], [38, 66, 13, 20, -34], [82, 66, 13, 20, 34], [60, 58, 16, 26, 0]].map(([x, y, rx, ry, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${r} ${x} ${y})`} fill={i === 4 ? '#f0b85e' : '#e9a94e'} {...s} />
      ))}
      <path d="M54 44q6 4 12 0M34 58q4 4 9 2M77 60q5 2 9-2" stroke="#fbe3b0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  ),
  wine: (a) => (
    <>
      <path {...s} fill="#6e2b3a" d="M51 6h18v26c0 6 15 12 15 26v52a6 6 0 0 1-6 6H42a6 6 0 0 1-6-6V58c0-14 15-20 15-26z" />
      <rect x="51" y="2" width="18" height="10" fill={INK} />
      <rect x="40" y="66" width="40" height="28" fill={CREAM} {...s} strokeWidth="2.5" />
      <circle cx="60" cy="80" r="6" fill={a} />
    </>
  ),
  candle: (a, b) => (
    <>
      <rect x="22" y="58" width="18" height="54" rx="3" fill={a} {...s} />
      <rect x="51" y="40" width="18" height="72" rx="3" fill={CREAM} {...s} />
      <rect x="80" y="66" width="18" height="46" rx="3" fill={b} {...s} />
      {[[31, 58], [60, 40], [89, 66]].map(([x, y]) => (
        <path key={x} className="flame" d={`M${x} ${y - 4}c7-8 2-16 0-22-2 6-7 14 0 22z`} fill="#f6a23a" stroke={INK} strokeWidth="2" />
      ))}
    </>
  ),
  matches: (a, b) => (
    <>
      {[34, 46, 58, 70, 82].map((x) => <g key={x}><path d={`M${x} 34V18`} stroke={INK} strokeWidth="5" /><circle cx={x} cy="16" r="4.5" fill="#e5533c" {...s} strokeWidth="2" /></g>)}
      <rect x="20" y="32" width="80" height="62" rx="6" fill={a} {...s} />
      <rect x="20" y="32" width="80" height="18" rx="4" fill={b} {...s} />
      <path d="M34 72h52" {...s} strokeWidth="2.5" />
    </>
  ),
  ticket: (a) => (
    <>
      <path {...s} fill={a} d="M8 34h104v18a8 8 0 0 0 0 16v18H8V68a8 8 0 0 0 0-16z" />
      <path d="M84 36v48" stroke={INK} strokeWidth="2" strokeDasharray="4 4" />
      <text x="46" y="58" textAnchor="middle" fontFamily="Jost, sans-serif" fontWeight="800" fontSize="11" letterSpacing="1.5" fill={INK}>ADMIT</text>
      <text x="46" y="72" textAnchor="middle" fontFamily="Jost, sans-serif" fontWeight="800" fontSize="11" letterSpacing="1.5" fill={INK}>ONE</text>
    </>
  ),
  camera: (a) => (
    <>
      <rect x="24" y="26" width="20" height="12" rx="3" fill={CREAM} {...s} />
      <rect x="10" y="36" width="100" height="62" rx="10" fill="#2c3245" {...s} />
      <rect x="10" y="36" width="100" height="16" rx="6" fill={a} {...s} />
      <circle cx="60" cy="70" r="22" fill={CREAM} {...s} />
      <circle cx="60" cy="70" r="12" fill={INK} />
      <circle cx="55" cy="65" r="3.5" fill="#fff" />
      <circle cx="94" cy="60" r="5" fill="#e5533c" {...s} strokeWidth="2" />
    </>
  ),
  frame: (a, b) => (
    <>
      <rect x="12" y="12" width="96" height="96" fill="#c8a24a" {...s} />
      <rect x="24" y="24" width="72" height="72" fill={CREAM} {...s} strokeWidth="2.5" />
      <circle cx="50" cy="52" r="15" fill={a} />
      <rect x="56" y="58" width="28" height="28" fill={b} />
      <path d="M30 88q16-14 34-4" fill="none" stroke={INK} strokeWidth="2.5" />
    </>
  ),
  coat: (a) => (
    <>
      <path {...s} fill="none" d="M60 6v8a6 6 0 1 1-6 6" />
      <path {...s} fill={a} d="M60 22 34 34l-14 70h26l4-34 4 44h12l4-44 4 34h26L86 34z" />
      <path {...s} fill="none" strokeWidth="2.5" d="M60 22v92M50 30l10 22 10-22" />
      <circle cx="66" cy="66" r="2.5" fill={INK} /><circle cx="66" cy="80" r="2.5" fill={INK} />
    </>
  ),
  sunglasses: () => (
    <>
      <path {...s} fill="none" d="M50 56q10-8 20 0M12 50l-6-10M108 50l6-10" />
      <circle cx="32" cy="62" r="20" fill={INK} />
      <circle cx="88" cy="62" r="20" fill={INK} />
      <path d="M22 54q6-6 12-4M78 54q6-6 12-4" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.7" fill="none" />
    </>
  ),
  chopsticks: (a) => (
    <>
      <path {...s} fill={CREAM} d="M26 54h68l-8 54H34z" />
      <path {...s} fill="none" d="M40 54c0-16 40-16 40 0" />
      <circle cx="60" cy="82" r="10" fill={a} {...s} strokeWidth="2.5" />
      <path d="M70 6 50 58M86 8 58 58" stroke="#c98b4b" strokeWidth="6" strokeLinecap="round" />
      <path d="M70 6 50 58M86 8 58 58" stroke={INK} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </>
  ),
  cocktail: (a) => (
    <>
      <path {...s} fill={a} d="M20 34h80c-4 22-20 34-40 34S24 56 20 34z" />
      <path {...s} d="M60 68v34" />
      <ellipse cx="60" cy="106" rx="22" ry="5" fill={CREAM} {...s} />
      <path {...s} fill="none" strokeWidth="2.5" d="M84 34 96 14" />
      <circle cx="96" cy="12" r="6" fill="#d8342c" {...s} strokeWidth="2" />
    </>
  ),
  plant: () => (
    <>
      {[[-30, 46, 38], [0, 60, 30], [30, 74, 38], [-12, 52, 18], [16, 68, 20]].map(([r, x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="11" ry="24" fill={i % 2 ? '#6fb38a' : '#4f9d69'} {...s} strokeWidth="2.5" transform={`rotate(${r} ${x} ${y})`} />
      ))}
      <path {...s} fill="#e5533c" d="M34 70h52l-6 42H40z" />
      <rect x="30" y="64" width="60" height="12" rx="3" fill="#e5533c" {...s} />
    </>
  ),
  lamp: () => (
    <>
      <circle cx="60" cy="56" r="40" fill="#f6d77a" opacity="0.35" />
      <path {...s} fill="#f6b8c6" d="M36 16h48l14 38H22z" />
      <path {...s} d="M60 54v50" />
      <ellipse cx="60" cy="108" rx="24" ry="6" fill="#c98b4b" {...s} />
    </>
  ),
  disco: () => (
    <>
      <path d="M60 0v20" stroke={INK} strokeWidth="3" />
      <circle cx="60" cy="62" r="40" fill="#cfd6e0" {...s} />
      <path d="M24 46h72M20 62h80M24 78h72M60 22v80M40 26q-10 36 0 72M80 26q10 36 0 72" stroke={INK} strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M42 40l8 4-6 6z" fill="#fff" />
    </>
  ),
  notebook: (a, b) => (
    <>
      <rect x="26" y="12" width="72" height="96" rx="6" fill={a} {...s} />
      {[24, 40, 56, 72, 88].map((y) => <circle key={y} cx="26" cy={y} r="4" fill={CREAM} {...s} strokeWidth="2" />)}
      <path d="M86 12v96" stroke={b} strokeWidth="6" />
      <rect x="40" y="30" width="36" height="16" fill={CREAM} {...s} strokeWidth="2" />
    </>
  ),
  vase: (a) => (
    <>
      {[[44, 24, '#f6b8c6'], [62, 14, '#f6d77a'], [80, 26, '#a9d3e8'], [54, 34, '#ffcdb8']].map(([x, y, c]) => (
        <g key={x}><path d={`M${x} ${y}L60 70`} stroke="#4f9d69" strokeWidth="3" /><circle cx={x} cy={y} r="9" fill={c} {...s} strokeWidth="2.5" /><circle cx={x} cy={y} r="3" fill={INK} /></g>
      ))}
      <path {...s} fill={a} d="M46 62h28c0 10 12 16 12 30 0 12-10 20-26 20s-26-8-26-20c0-14 12-20 12-30z" />
    </>
  ),
  keys: (a) => (
    <>
      <circle cx="44" cy="40" r="16" fill="none" {...s} strokeWidth="4" />
      <path {...s} fill="#d9c27a" d="M52 52l34 34-6 6-4-4-4 4-4-4-4 4-18-18z" />
      <path {...s} fill="#cfd6e0" d="M34 54 26 96l8 4 2-8 6 2 2-8-4-2 4-30z" />
      <rect x="62" y="16" width="42" height="26" rx="6" fill={a} {...s} transform="rotate(12 83 29)" />
    </>
  ),
};

export const hasObj = (k) => !!OBJ[k];

/** One object as a little SVG drawing. */
export function Thing({ obj, size = 100, a, b, label }) {
  const draw = OBJ[obj];
  if (!draw) return null;
  return <svg className={`thing thing-${obj}`} viewBox="0 0 120 120" width={size} height={size} aria-hidden>{draw(a, b, label)}</svg>;
}

const colours = (i) => [WES[i % WES.length], WES[(i + 3) % WES.length]];

/** The flat-lay: an open tote in the middle, everything else laid out around it. */
function Bag({ items, name }) {
  return (
    <div className="flatlay" role="img" aria-label={`What's in ${name}'s bag: ${items.map((x) => x.caption).join('; ')}`}>
      <div className="flatlay-tote"><Thing obj="tote" size={170} a="#e5533c" b="#f6b8c6" /><span className="flatlay-name">{name}’s bag</span></div>
      {items.map((x, i) => {
        const [a, b] = colours(i);
        return (
          <figure key={x.obj} className="flatlay-item" style={{ '--tilt': `${((i * 47) % 13) - 6}deg`, '--d': `${i * 60}ms` }}>
            <Thing obj={x.obj} size={108} a={a} b={b} label={x.caption} />
            <figcaption>{x.caption}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

// Where things go in the room: [x, y, size] in an 800×480 scene, by group.
const SLOTS = {
  wall: [[440, 36, 120], [60, 8, 84]],
  ceiling: [[470, -4, 80]],
  shelf: [[150, 80, 72], [228, 80, 72], [306, 80, 72]],
  top: [[96, 166, 92], [192, 166, 92], [288, 166, 92]],
  floor: [[600, 296, 136], [424, 286, 140], [470, 170, 104]],
};
const PREFER = {
  poster: ['wall'], frame: ['wall'], disco: ['ceiling'],
  turntable: ['top'], wine: ['top', 'shelf'], cocktail: ['top', 'shelf'], candle: ['top', 'shelf'], vase: ['shelf', 'top'],
  mug: ['shelf', 'top'], book: ['shelf', 'top'], plant: ['floor', 'shelf'], lamp: ['floor', 'top'], coat: ['floor'],
};

function placeRoom(items) {
  const free = Object.fromEntries(Object.entries(SLOTS).map(([k, v]) => [k, [...v]]));
  const out = [];
  for (const x of items) {
    const group = (PREFER[x.obj] || ['shelf', 'top', 'floor']).find((g) => free[g].length);
    if (!group) continue;
    out.push({ ...x, at: free[group].shift() });
  }
  return out;
}

/** The room: a wall, a shelf, a sideboard, a window onto your city, and your things in it. */
function Room({ items, win, name }) {
  const placed = placeRoom(items);
  const [hover, setHover] = useState(null);
  return (
    <div className="room">
      <div className="room-frame"><svg viewBox="0 0 800 480" className="room-scene" role="img" aria-label={`${name}'s room: ${placed.map((x) => x.caption).join('; ')}`}>
        <defs>
          <pattern id="wallpaper" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="#bfe6dc" />
            <rect width="20" height="40" fill="#a9dccd" />
          </pattern>
        </defs>
        <rect width="800" height="350" fill="url(#wallpaper)" />
        <rect y="330" width="800" height="20" fill="#fffdf8" stroke={INK} strokeWidth="3" />
        <rect y="350" width="800" height="130" fill="#e9b98b" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <path key={i} d={`M${i * 110 + 40} 350l-30 130`} stroke="#c98b4b" strokeWidth="2" />)}
        <ellipse cx="420" cy="430" rx="250" ry="36" fill="#e5533c" stroke={INK} strokeWidth="3" />
        <ellipse cx="420" cy="430" rx="200" ry="24" fill="none" stroke="#f6d77a" strokeWidth="4" strokeDasharray="10 8" />

        {/* window onto your city */}
        <g>
          <rect x="590" y="40" width="170" height="160" fill={win.night ? '#1f2a44' : '#a9d3e8'} stroke={INK} strokeWidth="4" />
          {win.night
            ? <><circle cx="720" cy="74" r="14" fill="#fbf1dc" /><circle cx="726" cy="70" r="12" fill="#1f2a44" />{[[620, 66], [660, 90], [700, 110], [640, 120]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="2" fill="#fbf1dc" />)}</>
            : <circle cx="716" cy="78" r="16" fill="#f6d77a" stroke={INK} strokeWidth="3" />}
          <path d="M590 200v-40h22v-24h18v34h16v-50h26v60h14v-30h22v20h20v-14h32v44z" fill={win.night ? '#3a4157' : '#7b8aa8'} />
          {win.night && [[598, 176], [618, 150], [656, 140], [662, 168], [700, 184], [744, 180]].map(([x, y]) => <rect key={x} x={x} y={y} width="5" height="6" fill="#f6d77a" />)}
          <path d="M675 40v160M590 120h170" stroke={INK} strokeWidth="4" />
          <rect x="580" y="196" width="190" height="12" fill="#fffdf8" stroke={INK} strokeWidth="3" />
          {win.city && <g transform="rotate(-3 675 232)"><rect x="625" y="216" width="100" height="30" rx="6" fill="#f6d77a" stroke={INK} strokeWidth="3" /><text x="675" y="237" textAnchor="middle" fontFamily="Jost, sans-serif" fontWeight="700" fontSize="15" fill={INK}>{win.city}</text></g>}
        </g>

        {/* shelf and sideboard */}
        <rect x="140" y="152" width="250" height="10" fill="#c98b4b" stroke={INK} strokeWidth="3" />
        <rect x="80" y="256" width="310" height="80" rx="6" fill="#c98b4b" stroke={INK} strokeWidth="3" />
        <path d="M235 256v80" stroke={INK} strokeWidth="3" />
        <circle cx="225" cy="296" r="4" fill={INK} /><circle cx="245" cy="296" r="4" fill={INK} />
        <path d="M96 336v20M374 336v20" stroke={INK} strokeWidth="5" />

        {placed.map((x, i) => {
          const [a, b] = colours(i);
          const [px, py, size] = x.at;
          return (
            <g key={x.obj} className={`room-thing ${hover === i ? 'on' : ''}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <g transform={`translate(${px} ${py}) scale(${size / 120})`}>{OBJ[x.obj](a, b, x.caption)}</g>
              <g transform={`translate(${px + size - 6} ${py + 6})`}>
                <circle r="13" fill="#fff" stroke={INK} strokeWidth="2.5" />
                <text y="5" textAnchor="middle" fontFamily="Jost, sans-serif" fontWeight="800" fontSize="14" fill={INK}>{i + 1}</text>
              </g>
            </g>
          );
        })}
      </svg></div>
      <ol className="room-key">
        {placed.map((x, i) => (
          <li key={x.obj} className={hover === i ? 'on' : ''} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span>{i + 1}</span>{x.caption}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The two pictures, with a toggle and a line that reflects them back. */
export default function Collage({ collage, name, title }) {
  const [view, setView] = useState('bag');
  if (!collage) return null;
  return (
    <div className="collage-wrap">
      <div className="seg" role="radiogroup" aria-label="Picture">
        {[['bag', 'In your bag'], ['room', 'Your room']].map(([k, l]) => (
          <button key={k} role="radio" aria-checked={view === k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{l}</button>
        ))}
      </div>
      {view === 'bag' ? <Bag items={collage.bag} name={name} /> : <Room items={collage.room} win={collage.window} name={name} />}
      {collage.reflection[view] && (
        <p className="reflection"><b>{title}.</b> {collage.reflection[view]}</p>
      )}
    </div>
  );
}
