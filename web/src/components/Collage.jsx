import { useLayoutEffect, useRef, useState } from 'react';
import { saveCollage } from './snapshot.js';

// "Your world, in one picture": what's in your bag and what your room looks
// like, drawn from your saves, the way people ask a chatbot to picture them.
// Drawn like a Wes Anderson set: flat colour, no outlines, everything centred
// and symmetrical, with a title card. Every object fits a 120×120 box.

const P = {
  pink: '#f2b8c3', rose: '#e88a9a', red: '#c8372d', mustard: '#e3a92a', yellow: '#f2cf5b', teal: '#00877a', tealDark: '#00665c',
  sky: '#9cc9d9', navy: '#24324a', maroon: '#6b1f2a', cream: '#f6ead2', paper: '#fffaf0', plum: '#5d3f6a', ink: '#2b1d22',
  peach: '#f4c09c', green: '#4f7f52', leaf: '#6f9e5f', camel: '#c08a52', brown: '#8a5a3b', grey: '#c9c3bd', silver: '#dcdad6',
};
const CAPS = { fontFamily: 'Jost, Futura, sans-serif', fontWeight: 600, letterSpacing: '0.14em' };

const OBJ = {
  tote: () => (
    <>
      <path d="M40 46c0-28 40-28 40 0" fill="none" stroke={P.maroon} strokeWidth="6" strokeLinecap="round" />
      <path d="M18 44h84l-6 70H24z" fill={P.cream} />
      <rect x="18" y="44" width="84" height="12" fill={P.red} />
      <rect x="18" y="98" width="84" height="5" fill={P.red} />
      <text x="60" y="82" textAnchor="middle" fontSize="9.5" fill={P.maroon} {...CAPS}>TASTEMATE</text>
    </>
  ),
  headphones: () => (
    <>
      <path d="M28 72V58a32 32 0 0 1 64 0v14" fill="none" stroke={P.maroon} strokeWidth="8" strokeLinecap="round" />
      <rect x="14" y="60" width="24" height="40" rx="10" fill={P.mustard} />
      <rect x="82" y="60" width="24" height="40" rx="10" fill={P.mustard} />
      <rect x="32" y="66" width="7" height="28" rx="3" fill={P.maroon} />
      <rect x="81" y="66" width="7" height="28" rx="3" fill={P.maroon} />
    </>
  ),
  turntable: () => (
    <>
      <rect x="8" y="30" width="104" height="70" rx="6" fill={P.teal} />
      <rect x="8" y="92" width="104" height="8" rx="3" fill={P.tealDark} />
      <circle cx="50" cy="63" r="28" fill={P.ink} />
      <circle cx="50" cy="63" r="20" fill="none" stroke="#4a3a40" strokeWidth="1.5" />
      <circle cx="50" cy="63" r="9" fill={P.red} />
      <circle cx="50" cy="63" r="2" fill={P.cream} />
      <path d="M96 40v30l-18 10" fill="none" stroke={P.cream} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="96" cy="40" r="5" fill={P.cream} />
      <rect x="88" y="82" width="14" height="5" rx="2" fill={P.mustard} />
    </>
  ),
  poster: (label = '') => (
    <>
      <rect x="18" y="6" width="84" height="108" fill={P.cream} />
      <rect x="25" y="13" width="70" height="64" fill={P.red} />
      <circle cx="60" cy="45" r="19" fill={P.mustard} />
      <rect x="25" y="62" width="70" height="15" fill={P.maroon} />
      <text x="60" y="94" textAnchor="middle" fontSize="8.5" fill={P.ink} {...CAPS}>{label.slice(0, 13).toUpperCase()}</text>
      <rect x="40" y="101" width="40" height="3" fill={P.red} />
    </>
  ),
  book: () => (
    <>
      <rect x="24" y="12" width="74" height="96" rx="2" fill={P.teal} />
      <rect x="24" y="12" width="11" height="96" fill={P.tealDark} />
      <rect x="44" y="32" width="44" height="28" fill={P.cream} />
      <rect x="50" y="40" width="32" height="3" fill={P.ink} />
      <rect x="54" y="48" width="24" height="2.5" fill={P.ink} opacity="0.6" />
      <path d="M80 108v12l5-4 5 4v-12z" fill={P.red} />
    </>
  ),
  coffee: () => (
    <>
      <path d="M34 36h52l-7 76H41z" fill={P.paper} />
      <path d="M36 58h48l-2 24H38z" fill={P.red} />
      <rect x="28" y="26" width="64" height="12" rx="4" fill={P.maroon} />
      <rect x="42" y="18" width="36" height="10" rx="3" fill={P.maroon} />
    </>
  ),
  mug: () => (
    <>
      <path d="M86 54h4a13 13 0 0 1 0 26h-4" fill="none" stroke={P.pink} strokeWidth="7" />
      <rect x="28" y="38" width="58" height="66" rx="8" fill={P.pink} />
      <rect x="28" y="56" width="58" height="8" fill={P.red} />
      <path d="M46 28q-6-8 0-16M60 28q-6-8 0-16M74 28q-6-8 0-16" fill="none" stroke={P.grey} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  croissant: () => (
    <>
      {[[22, 82, 9, 14, -58], [98, 82, 9, 14, 58], [38, 66, 13, 20, -34], [82, 66, 13, 20, 34], [60, 58, 16, 26, 0]].map(([x, y, rx, ry, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${r} ${x} ${y})`} fill={i % 2 ? P.mustard : i === 4 ? P.yellow : '#d39522'} />
      ))}
    </>
  ),
  wine: () => (
    <>
      <path d="M51 10h18v24c0 6 15 12 15 26v50a5 5 0 0 1-5 5H41a5 5 0 0 1-5-5V60c0-14 15-20 15-26z" fill={P.maroon} />
      <rect x="51" y="4" width="18" height="16" rx="2" fill={P.mustard} />
      <rect x="40" y="66" width="40" height="30" fill={P.cream} />
      <circle cx="60" cy="78" r="6" fill={P.red} />
      <rect x="48" y="88" width="24" height="2.5" fill={P.ink} />
    </>
  ),
  candle: () => (
    <>
      {[[31, 52, P.cream], [60, 34, P.pink], [89, 52, P.sky]].map(([x, y, c]) => (
        <g key={x}>
          <rect x={x - 7} y={y} width="14" height={104 - y} fill={c} />
          <path className="flame" d={`M${x} ${y - 4}c7-8 2-16 0-22-2 6-7 14 0 22z`} fill={P.yellow} />
          <path d={`M${x} ${y - 5}c3-4 1-8 0-10-1 3-3 6 0 10z`} fill={P.red} />
          <rect x={x - 12} y="104" width="24" height="8" rx="2" fill={P.mustard} />
        </g>
      ))}
    </>
  ),
  matches: () => (
    <>
      {[36, 48, 60, 72, 84].map((x) => <g key={x}><rect x={x - 2} y="16" width="4" height="22" fill={P.cream} /><circle cx={x} cy="16" r="4" fill={P.maroon} /></g>)}
      <rect x="20" y="34" width="80" height="62" rx="3" fill={P.red} />
      <rect x="20" y="34" width="80" height="16" fill={P.cream} />
      <text x="60" y="80" textAnchor="middle" fontSize="9" fill={P.cream} {...CAPS}>BAR</text>
    </>
  ),
  ticket: () => (
    <>
      <path d="M8 34h104v18a8 8 0 0 0 0 16v18H8V68a8 8 0 0 0 0-16z" fill={P.pink} />
      <path d="M84 36v48" stroke={P.maroon} strokeWidth="2" strokeDasharray="4 4" />
      <text x="46" y="58" textAnchor="middle" fontSize="10" fill={P.maroon} {...CAPS}>ADMIT</text>
      <text x="46" y="72" textAnchor="middle" fontSize="10" fill={P.maroon} {...CAPS}>ONE</text>
    </>
  ),
  camera: () => (
    <>
      <rect x="24" y="26" width="20" height="12" rx="2" fill={P.mustard} />
      <rect x="10" y="36" width="100" height="62" rx="8" fill={P.ink} />
      <rect x="10" y="36" width="100" height="16" rx="6" fill={P.cream} />
      <circle cx="60" cy="70" r="23" fill={P.silver} />
      <circle cx="60" cy="70" r="14" fill={P.navy} />
      <circle cx="55" cy="65" r="4" fill={P.paper} opacity="0.8" />
      <circle cx="94" cy="62" r="5" fill={P.red} />
    </>
  ),
  frame: () => (
    <>
      <rect x="12" y="12" width="96" height="96" fill={P.mustard} />
      <rect x="22" y="22" width="76" height="76" fill={P.cream} />
      <circle cx="50" cy="52" r="15" fill={P.plum} />
      <rect x="56" y="58" width="30" height="30" fill={P.teal} />
    </>
  ),
  coat: () => (
    <>
      <path d="M60 6v8a6 6 0 1 1-6 6" fill="none" stroke={P.ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M60 20 32 32l-12 72h26l4-34 4 44h12l4-44 4 34h26L88 32z" fill={P.camel} />
      <path d="M60 20 50 30l10 24 10-24z" fill={P.brown} />
      <circle cx="66" cy="66" r="2.5" fill={P.ink} /><circle cx="66" cy="80" r="2.5" fill={P.ink} />
    </>
  ),
  sunglasses: () => (
    <>
      <path d="M50 56q10-8 20 0" fill="none" stroke={P.ink} strokeWidth="4" />
      <circle cx="32" cy="62" r="20" fill={P.ink} />
      <circle cx="88" cy="62" r="20" fill={P.ink} />
      <path d="M22 54q6-6 12-4M78 54q6-6 12-4" stroke={P.rose} strokeWidth="3" strokeLinecap="round" fill="none" />
    </>
  ),
  chopsticks: () => (
    <>
      <path d="M26 54h68l-8 56H34z" fill={P.paper} />
      <path d="M40 54c0-16 40-16 40 0" fill="none" stroke={P.grey} strokeWidth="3" />
      <circle cx="60" cy="82" r="11" fill={P.red} />
      <path d="M70 6 50 58M86 8 58 58" stroke={P.brown} strokeWidth="5" strokeLinecap="round" />
    </>
  ),
  cocktail: () => (
    <>
      <path d="M20 34h80c-4 22-20 34-40 34S24 56 20 34z" fill={P.pink} />
      <rect x="58" y="66" width="4" height="36" fill={P.silver} />
      <ellipse cx="60" cy="104" rx="22" ry="5" fill={P.silver} />
      <path d="M84 34 94 16" stroke={P.green} strokeWidth="2.5" />
      <circle cx="95" cy="14" r="6" fill={P.red} />
    </>
  ),
  plant: () => (
    <>
      {[[-28, 44, 36], [0, 60, 28], [28, 76, 36], [-12, 52, 18], [12, 68, 18]].map(([r, x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="11" ry="24" fill={i % 2 ? P.leaf : P.green} transform={`rotate(${r} ${x} ${y})`} />
      ))}
      <path d="M34 70h52l-6 42H40z" fill={P.red} />
      <rect x="30" y="64" width="60" height="10" fill={P.maroon} />
    </>
  ),
  lamp: () => (
    <>
      <path d="M36 16h48l14 38H22z" fill={P.cream} />
      <path d="M22 54h76l-3 6H25z" fill={P.red} />
      <rect x="58" y="60" width="4" height="44" fill={P.mustard} />
      <ellipse cx="60" cy="108" rx="22" ry="6" fill={P.mustard} />
    </>
  ),
  disco: () => (
    <>
      <rect x="59" y="0" width="2" height="22" fill={P.ink} />
      <circle cx="60" cy="62" r="40" fill={P.silver} />
      <path d="M24 46h72M20 62h80M24 78h72M60 22v80M40 26q-10 36 0 72M80 26q10 36 0 72" stroke="#a9a49e" strokeWidth="1.5" fill="none" />
      <path d="M42 40l8 4-6 6z" fill={P.paper} />
    </>
  ),
  notebook: () => (
    <>
      <rect x="26" y="12" width="72" height="96" rx="4" fill={P.mustard} />
      {[24, 40, 56, 72, 88].map((y) => <circle key={y} cx="26" cy={y} r="3.5" fill={P.silver} />)}
      <rect x="84" y="12" width="5" height="96" fill={P.red} />
      <rect x="40" y="30" width="36" height="16" fill={P.cream} />
    </>
  ),
  vase: () => (
    <>
      {[[44, 24, P.pink], [62, 14, P.yellow], [80, 26, P.red], [54, 36, P.peach]].map(([x, y, c]) => (
        <g key={x}><path d={`M${x} ${y}L60 70`} stroke={P.green} strokeWidth="3" /><circle cx={x} cy={y} r="9" fill={c} /><circle cx={x} cy={y} r="3" fill={P.maroon} /></g>
      ))}
      <path d="M46 62h28c0 10 12 16 12 30 0 12-10 20-26 20s-26-8-26-20c0-14 12-20 12-30z" fill={P.teal} />
    </>
  ),
  keys: () => (
    <>
      <circle cx="44" cy="40" r="16" fill="none" stroke={P.silver} strokeWidth="5" />
      <path d="M52 52l34 34-6 6-4-4-4 4-4-4-4 4-18-18z" fill={P.mustard} />
      <path d="M34 54 26 96l8 4 2-8 6 2 2-8-4-2 4-30z" fill={P.silver} />
      <rect x="62" y="16" width="42" height="24" rx="4" fill={P.red} transform="rotate(10 83 28)" />
    </>
  ),
};

export const hasObj = (k) => !!OBJ[k];

/** One object as a small flat drawing. */
export function Thing({ obj, size = 100, label }) {
  const draw = OBJ[obj];
  if (!draw) return null;
  return <svg className={`thing thing-${obj}`} viewBox="0 0 120 120" width={size} height={size} aria-hidden>{draw(label)}</svg>;
}

/** The bag, knolled: a title card, an open tote in the middle, everything laid square around it. */
function Bag({ items, name }) {
  return (
    <div className="knoll" role="img" aria-label={`What's in ${name}'s bag: ${items.map((x) => x.caption).join('; ')}`}>
      <div className="set-card">
        <span>The contents of</span>
        <b>{name}’s bag</b>
      </div>
      <div className="knoll-grid">
        <div className="knoll-tote"><Thing obj="tote" size={150} /></div>
        {items.map((x, i) => (
          <figure key={x.obj} className="knoll-item" style={{ '--d': `${i * 50}ms` }}>
            <Thing obj={x.obj} size={96} label={x.caption} />
            <figcaption><span>No. {i + 1}</span>{x.caption}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

// The room is drawn straight on and symmetrical. Groups of places, each a
// centre spot or a mirrored pair: [x, y, size] in an 800×520 set.
const SPOTS = {
  ceiling: { centre: [370, 0, 60] },
  wall: { pair: [[118, 74, 104], [578, 74, 104]] },
  topCentre: { centre: [345, 152, 110] },
  topPair: { pair: [[250, 180, 84], [466, 180, 84]] },
  floor: { pair: [[18, 196, 170], [612, 196, 170]] },
};
const GROUPS = {
  disco: ['ceiling'], poster: ['wall'], frame: ['wall'],
  turntable: ['topCentre'], wine: ['topPair', 'topCentre'], vase: ['topCentre', 'topPair'], candle: ['topPair'], cocktail: ['topPair'],
  mug: ['topPair'], book: ['topPair'], plant: ['floor'], lamp: ['floor'], coat: ['floor'],
};

/** Place things symmetrically: one thing in a pair of spots is mirrored on both sides. */
function placeRoom(items) {
  const byGroup = {};
  const placed = [];
  for (const x of items) {
    const g = (GROUPS[x.obj] || []).find((k) => (byGroup[k]?.length || 0) < (SPOTS[k].pair ? 2 : 1));
    if (!g) continue;
    (byGroup[g] ||= []).push(x);
    placed.push(x);
  }
  const draws = [];
  // Nothing to hang? A pair of plain frames, so the wall stays symmetrical.
  if (!byGroup.wall) draws.push({ obj: 'frame', at: SPOTS.wall.pair[0], echo: true }, { obj: 'frame', at: SPOTS.wall.pair[1], mirror: true, echo: true });
  for (const [g, list] of Object.entries(byGroup)) {
    const spot = SPOTS[g];
    if (spot.centre) draws.push({ ...list[0], at: spot.centre });
    else if (list.length === 1) {
      draws.push({ ...list[0], at: spot.pair[0] });
      draws.push({ ...list[0], at: spot.pair[1], mirror: true, echo: true });
    } else {
      draws.push({ ...list[0], at: spot.pair[0] });
      draws.push({ ...list[1], at: spot.pair[1], mirror: true });
    }
  }
  return { placed, draws };
}

function Room({ items, win, name }) {
  const { placed, draws } = placeRoom(items);
  const num = new Map(placed.map((x, i) => [x.obj, i + 1]));
  const [hover, setHover] = useState(null);
  const frame = useRef(null);
  // On a phone the set scrolls sideways; start in the middle, like the camera would.
  useLayoutEffect(() => {
    const el = frame.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);
  const sky = win.night ? P.navy : P.sky;
  return (
    <div className="room">
      <div className="room-frame" ref={frame}>
        <svg viewBox="0 0 800 520" className="room-scene" role="img" aria-label={`${name}'s room: ${placed.map((x) => x.caption).join('; ')}`}>
          <defs>
            <pattern id="tiles" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="40" height="40" fill={P.cream} />
              <rect width="20" height="20" fill={P.mustard} />
              <rect x="20" y="20" width="20" height="20" fill={P.mustard} />
            </pattern>
          </defs>
          {/* wall, panelling, floor */}
          <rect width="800" height="360" fill={P.pink} />
          <rect y="258" width="800" height="102" fill={P.rose} />
          {[40, 140, 240, 560, 660, 760].map((x) => <rect key={x} x={x - 30} y="272" width="60" height="74" fill="none" stroke={P.pink} strokeWidth="3" />)}
          <rect y="252" width="800" height="8" fill={P.cream} />
          <rect y="360" width="800" height="160" fill="url(#tiles)" />
          <rect y="356" width="800" height="6" fill={P.maroon} />
          <rect x="230" y="404" width="340" height="84" fill={P.teal} />
          <rect x="242" y="414" width="316" height="64" fill="none" stroke={P.cream} strokeWidth="3" />

          {/* window onto the city, with curtains */}
          <path d="M330 236V120a70 70 0 0 1 140 0v116z" fill={sky} />
          {win.night
            ? <><circle cx="440" cy="100" r="12" fill={P.cream} /><circle cx="446" cy="96" r="10" fill={sky} />{[[352, 120], [380, 92], [410, 130]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.8" fill={P.cream} />)}</>
            : <circle cx="440" cy="104" r="13" fill={P.yellow} />}
          <path d="M330 236v-36h18v-22h16v30h14v-44h24v52h12v-26h20v18h18v-12h18v40z" fill={win.night ? '#3b4a66' : '#6f8fa8'} />
          {win.night && [[338, 216], [356, 196], [388, 186], [392, 214], [430, 226], [452, 222]].map(([x, y]) => <rect key={x} x={x} y={y} width="4" height="5" fill={P.yellow} />)}
          <path d="M330 236V120a70 70 0 0 1 140 0v116" fill="none" stroke={P.cream} strokeWidth="8" />
          <path d="M400 50v186M330 160h140" stroke={P.cream} strokeWidth="5" />
          <path d="M296 40h208v14H296z" fill={P.maroon} />
          <path d="M300 54h34c-4 60 6 130 10 186h-44z" fill={P.mustard} />
          <path d="M500 54h-34c4 60-6 130-10 186h44z" fill={P.mustard} />
          {win.city && <text x="400" y="51" textAnchor="middle" fontSize="10" fill={P.cream} {...CAPS}>{win.city.toUpperCase()}</text>}

          {/* sideboard */}
          <rect x="240" y="262" width="320" height="76" fill={P.maroon} />
          <rect x="252" y="272" width="142" height="56" fill="none" stroke={P.mustard} strokeWidth="2.5" />
          <rect x="406" y="272" width="142" height="56" fill="none" stroke={P.mustard} strokeWidth="2.5" />
          <circle cx="386" cy="300" r="3.5" fill={P.mustard} /><circle cx="414" cy="300" r="3.5" fill={P.mustard} />
          <path d="M254 338v20M546 338v20" stroke={P.maroon} strokeWidth="6" />

          {draws.map((x, i) => {
            const [px, py, size] = x.at;
            const n = num.get(x.obj);
            const k = size / 120;
            return (
              <g key={i} className={`room-thing ${hover === n ? 'on' : ''}`} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)}>
                <g transform={x.mirror ? `translate(${px + size} ${py}) scale(${-k} ${k})` : `translate(${px} ${py}) scale(${k})`}>{OBJ[x.obj](x.caption)}</g>
                {!x.echo && (
                  <g transform={`translate(${px + size / 2} ${py + 4})`}>
                    <circle r="12" fill={P.paper} />
                    <text y="4.5" textAnchor="middle" fontSize="12" fill={P.ink} {...CAPS} letterSpacing="0">{n}</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* the title card */}
          <rect x="300" y="8" width="200" height="30" fill={P.paper} />
          <rect x="304" y="12" width="192" height="22" fill="none" stroke={P.maroon} strokeWidth="1.5" />
          <text x="400" y="28" textAnchor="middle" fontSize="10.5" fill={P.maroon} {...CAPS}>{`THE ROOM OF ${name.toUpperCase()}`}</text>
        </svg>
      </div>
      <ol className="room-key">
        {placed.map((x) => (
          <li key={x.obj} className={hover === num.get(x.obj) ? 'on' : ''} onMouseEnter={() => setHover(num.get(x.obj))} onMouseLeave={() => setHover(null)}>
            <span>{num.get(x.obj)}</span>{x.caption}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The two pictures, with a toggle and a line that reflects them back. */
export default function Collage({ collage, name, title }) {
  const [view, setView] = useState('bag');
  const [saving, setSaving] = useState(false);
  const box = useRef(null);
  if (!collage) return null;
  const save = async () => {
    setSaving(true);
    try {
      await saveCollage(box.current, view, { items: collage[view], name, title, reflection: collage.reflection[view] });
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="collage-wrap" ref={box}>
      <div className="collage-bar">
        <div className="seg" role="radiogroup" aria-label="Picture">
          {[['bag', 'In your bag'], ['room', 'Your room']].map(([k, l]) => (
            <button key={k} role="radio" aria-checked={view === k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{l}</button>
          ))}
        </div>
        <button className="btn btn-sm btn-outline" onClick={save} disabled={saving}>{saving ? 'Making it…' : 'Save as image'}</button>
      </div>
      {view === 'bag' ? <Bag items={collage.bag} name={name} /> : <Room items={collage.room} win={collage.window} name={name} />}
      {collage.reflection[view] && (
        <p className="reflection">{title && <b>{title}.</b>} {collage.reflection[view]}</p>
      )}
    </div>
  );
}
