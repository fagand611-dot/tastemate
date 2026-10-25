import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';

// Shared visual pieces: the "Why?" streams on a pick, and a dialog.
//
// Side colours are categorical slots 1–3 (validated as a set against both
// themes' surfaces); text always stays in text colours.

export const CLUSTER_SLOTS = 3;
export const clusterVar = (i) => (i != null && i < CLUSTER_SLOTS ? `var(--series-${i + 1})` : 'var(--series-other)');

/** Width of an element, kept up to date. */
function useWidth(initial) {
  const ref = useRef(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/**
 * Why this pick, as streams: your apps on the left, the tastes they share
 * in the middle, pouring into the pick's match ring. Stream width is the
 * number of saves. Hints are dashed; friends, new openings and hidden gems
 * flow straight in, in grey.
 */
export function WhyFlow({ spot, match, reasons }) {
  // Narrow screens draw at their real width, and leave the title to the dialog.
  const [box, width] = useWidth(600);
  const small = width < 520;
  const W = small ? width : 600;
  const X = small ? [Math.round(W * 0.36), Math.round(W * 0.6), W - 40] : [150, 310, 430];
  const flow = useMemo(() => buildFlow(spot, reasons, X), [spot, reasons, X.join()]);
  const [hover, setHover] = useState(null);
  if (!flow.links.length) return <p className="muted small">Not enough to draw yet.</p>;
  const { cols, links, H } = flow;
  return (
    <div className="viz why-flow" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Why ${spot.title}: ${links.map((l) => `${l.from.label} to ${l.to.label}, ${l.value}`).join('; ')}`}>
        <defs>
          <linearGradient id="river" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" style={{ stopColor: 'var(--series-1)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--series-2)' }} />
          </linearGradient>
        </defs>
        {links.map((l, i) => (
          <path key={i} d={band(l)} className={`flow-band ${l.maybe ? 'maybe' : ''} ${l.extra ? 'extra' : ''} ${hover != null && hover !== i ? 'dim' : ''}`}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <title>{l.tip}</title>
          </path>
        ))}
        {cols.flat().map((n) => (
          <g key={n.key}>
            {n.col !== 2 && <rect x={n.x} y={n.y} width={12} height={Math.max(n.h, 4)} rx={6} className={`flow-node ${n.kind}`} />}
            {n.col === 2 && <MatchRing cx={n.x + 6} cy={n.y + n.h / 2} match={match} />}
            {n.col === 0 && <text x={n.x - 6} y={n.y + n.h / 2 + 4} textAnchor="end">{n.label}<tspan className="flow-num"> {n.value}</tspan></text>}
            {n.col === 1 && <text x={n.x + 16} y={n.y + n.h / 2 + 4}>{n.label}</text>}
            {n.col === 2 && !small && (
              <text x={n.x + 44} y={n.y + n.h / 2 - 12}>
                {wrap(n.label, 16).map((line, k) => (
                  <tspan key={k} x={n.x + 44} dy={k ? 18 : 0} className="flow-title">{line}</tspan>
                ))}
                <tspan x={n.x + 44} dy={18} className="flow-num">your match</tspan>
              </text>
            )}
          </g>
        ))}
      </svg>
      <ul className="viz-legend small">
        <li><span className="viz-swatch firm" />From your saves</li>
        <li><span className="viz-swatch maybe" />Hints</li>
        <li><span className="viz-swatch extra" />Friends and extras</li>
      </ul>
      <p className="muted small">{hover != null ? links[hover].tip : 'Tap a stream to see what it carries.'}</p>
    </div>
  );
}

function buildFlow(spot, reasons, X) {
  const evidence = reasons.find((r) => r.type === 'saves')?.evidence || [];
  const left = new Map();
  const mid = new Map();
  const raw = [];
  const L = (key, label, kind) => left.get(key) || left.set(key, { key: `l:${key}`, label, kind, value: 0, col: 0 }).get(key);
  const M = (tag) => mid.get(tag) || mid.set(tag, { key: `m:${tag}`, label: tag, kind: 'tag', value: 0, col: 1 }).get(tag);
  const right = { key: 'r', label: spot.title, kind: 'spot', value: 0, col: 2 };
  for (const e of evidence) {
    for (const s of e.sources) {
      raw.push({ from: L(s.source, s.label, 'app'), to: M(e.tag), value: s.n, tip: `${s.n} of your ${s.label} saves say ${e.tag}` });
    }
    if (e.maybe) raw.push({ from: L('maybe', 'Could be', 'maybe'), to: M(e.tag), value: e.maybe, maybe: true, tip: `${e.maybe} more saves could be ${e.tag}` });
  }
  for (const m of mid.values()) {
    const v = raw.filter((l) => l.to === m).reduce((a, l) => a + l.value, 0);
    raw.push({ from: m, to: right, value: v, tip: `${m.label} leads to ${spot.title}` });
  }
  for (const r of reasons) {
    if (r.type === 'friends') raw.push({ from: L('friends', r.n > 1 ? `${r.n} friends` : r.names[0], 'extra'), to: right, value: 2 * r.n, extra: true, tip: `${r.names.join(', ')} saved it` });
    if (r.type === 'creator') raw.push({ from: L('creator', r.name, 'extra'), to: right, value: 2, extra: true, tip: `It features ${r.name}, who you saved` });
    if (r.type === 'new') raw.push({ from: L('new', 'Just opened', 'extra'), to: right, value: 1, extra: true, tip: 'It opened recently' });
    if (r.type === 'gem') raw.push({ from: L('gem', 'Under the radar', 'extra'), to: right, value: 1, extra: true, tip: 'Few people know it yet' });
  }
  for (const l of raw) {
    l.from.value += l.from.col === 0 ? l.value : 0;
    if (l.to === right) right.value += l.value;
  }
  for (const m of mid.values()) m.value = raw.filter((l) => l.to === m).reduce((a, l) => a + l.value, 0);

  // Lay the three columns out top to bottom, sized by value.
  const cols = [[...left.values()].sort((a, b) => b.value - a.value), [...mid.values()].sort((a, b) => b.value - a.value), [right]];
  const GAP = 14;
  const rows = Math.max(...cols.map((c) => c.length));
  const H = Math.max(200, rows * 46 + 20);
  const unit = Math.min(...cols.map((c) => (H - 20 - GAP * (c.length - 1)) / Math.max(c.reduce((a, n) => a + n.value, 0), 1)));
  cols.forEach((c, ci) => {
    const total = c.reduce((a, n) => a + n.value, 0) * unit + GAP * (c.length - 1);
    let y = (H - total) / 2;
    for (const n of c) {
      n.x = X[ci];
      n.h = n.value * unit;
      n.y = y;
      n.outY = y;
      n.inY = y;
      y += n.h + GAP;
    }
  });
  // Stack bands within each node in the order of the column they connect to.
  const order = (n) => (n.col === 1 ? cols[1].indexOf(n) : n.col === 0 ? cols[0].indexOf(n) : 0);
  raw.sort((a, b) => order(a.from) - order(b.from) || order(a.to) - order(b.to));
  for (const l of raw) {
    const h = l.value * unit;
    l.y0 = l.from.outY;
    l.from.outY += h;
    l.y1 = l.to.inY;
    l.to.inY += h;
    l.h = h;
    l.x0 = l.from.x + 12;
    l.x1 = l.to.col === 2 ? l.to.x - 14 : l.to.x;
    l.h1 = h;
  }
  // Streams narrow as they pour into the match ring.
  const ring = 34;
  for (const l of raw.filter((x) => x.to === right)) {
    const k = ring / Math.max(right.h, 1);
    l.y1 = right.y + right.h / 2 - ring / 2 + (l.y1 - right.y) * k;
    l.h1 = l.h * k;
  }
  return { cols, links: raw, H };
}

/** The match as a ring that fills up. */
function MatchRing({ cx, cy, match }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <g className="match-ring" transform={`translate(${cx},${cy})`}>
      <circle r={r} className="ring-bg" />
      <circle r={r} className="ring-fg" strokeDasharray={`${(c * match) / 100} ${c}`} transform="rotate(-90)" />
      <text y={5} textAnchor="middle">{match}%</text>
    </g>
  );
}

/** Split a title into at most two lines of about n characters. */
function wrap(text, n) {
  const words = text.split(' ');
  const lines = [''];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if (cur && (cur + ' ' + w).length > n && lines.length < 2) lines.push(w);
    else lines[lines.length - 1] = cur ? `${cur} ${w}` : w;
  }
  return lines.map((l) => (l.length > n + 6 ? `${l.slice(0, n + 5)}…` : l));
}

/** A filled band between two nodes, curved in the middle; it can narrow at the far end. */
function band(l) {
  const mx = (l.x0 + l.x1) / 2;
  const h0 = Math.max(l.h, 1.5);
  const h1 = Math.max(l.h1 ?? l.h, 1);
  return `M${l.x0},${l.y0} C${mx},${l.y0} ${mx},${l.y1} ${l.x1},${l.y1} L${l.x1},${l.y1 + h1} C${mx},${l.y1 + h1} ${mx},${l.y0 + h0} ${l.x0},${l.y0 + h0} Z`;
}

/** A small accessible dialog, rendered at the page level so no card can clip it. */
export function Dialog({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose} autoFocus><Icon name="x" size={18} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

