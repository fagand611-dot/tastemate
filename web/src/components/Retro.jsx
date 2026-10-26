import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Retro objects for the things people save: records for music, polaroids for
// places, and a pin board that ties pinned things together with red string.

// Flat Wes Anderson colour blocks, picked by name so each thing keeps its colour.
export const WES = ['#f3e3d8', '#e4e0dc', '#f6dcc0', '#e9e4d9', '#f7d2b4', '#e2dcd6'];

export function hash(s) {
  let h = 2166136261;
  for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export const wesFor = (s) => WES[hash(s) % WES.length];

/** A vinyl record with a coloured label. Spins on hover. */
export function Vinyl({ title = '', size = 56, spinning = false }) {
  const label = wesFor(title);
  return (
    <svg className={`vinyl ${spinning ? 'spin' : ''}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="30" fill="#1d1b19" />
      {[25, 21, 17].map((r) => <circle key={r} cx="32" cy="32" r={r} fill="none" stroke="#3a4157" strokeWidth="1" />)}
      <path d="M12 22a22 22 0 0 1 10-10" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="32" r="11" fill={label} />
      <circle cx="32" cy="32" r="2.2" fill="#1d1b19" />
    </svg>
  );
}

/** A polaroid frame with a strip of washi tape on top. */
export function Polaroid({ children, caption, tilt = 0, color, className = '' }) {
  return (
    <figure className={`polaroid ${className}`} style={{ '--tilt': `${tilt}deg`, '--tape': color || '#f6dcc0' }}>
      <div className="polaroid-photo">{children}</div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/**
 * Pins its children to a board and ties the pins together with red string,
 * in order. Children need an element with class "pin" somewhere inside.
 */
export function PinBoard({ children, className = '' }) {
  const box = useRef(null);
  const [pts, setPts] = useState([]);
  const measure = () => {
    const el = box.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    setPts([...el.querySelectorAll('.pin')].map((p) => {
      const r = p.getBoundingClientRect();
      return [r.left + r.width / 2 - b.left, r.top + r.height / 2 - b.top];
    }));
  };
  useLayoutEffect(measure, [children]);
  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  // A string sags a little between pins, and runs along each row (a new
  // row starts a new string rather than cutting across the photos).
  const d = pts.map(([x, y], i) => {
    if (!i) return `M${x},${y}`;
    const [px, py] = pts[i - 1];
    if (Math.abs(y - py) > 40) return `M${x},${y}`;
    return `Q${(px + x) / 2},${Math.max(py, y) + 26} ${x},${y}`;
  }).join(' ');
  return (
    <div ref={box} className={`pinboard ${className}`}>
      {children}
      {pts.length > 1 && (
        <svg className="pinboard-string" aria-hidden>
          <path d={d} />
        </svg>
      )}
    </div>
  );
}

/** A wobbly hand-drawn line between two points, like a thread pulled by hand. */
export function threadPath(x1, y1, x2, y2, seed = 0) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const bend = ((seed % 7) - 3) * 0.06;
  return `M${x1},${y1} Q${mx - dy * bend},${my + dx * bend} ${x2},${y2}`;
}
