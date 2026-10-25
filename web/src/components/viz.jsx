import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon, { SAVE_ICON } from './Icon.jsx';

// Visual views of the taste graph:
//   TasteWeb  tags as a web: size = strength, colour = cluster, lines = saved together
//   TagCloud  the same tags as a cloud
//   TagTable  the same data as a list (the accessible view)
//   WhyFlow   for one pick, the flow from your apps through shared tags into it
//
// Colour follows the cluster: the top three clusters get categorical slots 1–3
// (validated as a set against both surfaces); everything else is "other tastes"
// in a neutral. Text always stays in text colours; the coloured mark beside it
// carries the identity.

export const CLUSTER_SLOTS = 3;
const SOURCE_LABEL = { spotify: 'Spotify', instagram: 'Instagram', google_maps: 'Google Maps', pinterest: 'Pinterest', manual: 'added here', tastemate: 'your plan' };
const TIER_LABEL = { obvious: 'Obvious', translated: 'Translated', possible: 'Could be' };

export const clusterVar = (i) => (i != null && i < CLUSTER_SLOTS ? `var(--series-${i + 1})` : 'var(--series-other)');
const clusterName = (c) => c.tags.join(' · ');

/** A soft glow behind each side: centred on its bubbles, big enough to hold them. */
function auras(ps) {
  const by = new Map();
  for (const p of ps) if (p.cluster != null && p.cluster < CLUSTER_SLOTS) by.set(p.cluster, [...(by.get(p.cluster) || []), p]);
  return [...by.entries()].map(([cluster, list]) => {
    const x = list.reduce((a, p) => a + p.x, 0) / list.length;
    const y = list.reduce((a, p) => a + p.y, 0) / list.length;
    const r = Math.max(50, ...list.map((p) => Math.hypot(p.x - x, p.y - y) + p.r + 18));
    return { cluster, x, y, r };
  });
}

/** A gently curved line between two bubbles. */
function curve(a, b) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return `M${a.x},${a.y} Q${mx - dy * 0.12},${my + dx * 0.12} ${b.x},${b.y}`;
}

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

/** Small deterministic hash, so the layout is the same on every load. */
function hash(s) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 2 ** 32;
}

/**
 * Force layout, run to rest before drawing: tags repel, edges pull, each
 * cluster gathers around its own anchor, and nodes keep room for their labels.
 */
function layoutWeb(nodes, edges, W, H) {
  const maxW = Math.max(...nodes.map((n) => n.weight), 1);
  const groups = [...new Set(nodes.map((n) => n.cluster ?? -1))].sort((a, b) => a - b);
  const ring = groups.filter((g) => g >= 0);
  const anchor = new Map(ring.map((g, i) => {
    const a = (2 * Math.PI * i) / Math.max(ring.length, 1) - Math.PI / 2;
    return [g, [W / 2 + Math.cos(a) * W * 0.27, H / 2 + Math.sin(a) * H * 0.27]];
  }));
  anchor.set(-1, [W / 2, H / 2]);
  const ps = nodes.map((n) => {
    const [ax, ay] = anchor.get(n.cluster ?? -1);
    const small = W < 600;
    const r = (small ? 5 : 7) + (small ? 10 : 15) * Math.sqrt(n.weight / maxW);
    return { ...n, r, x: ax + (hash(n.id) - 0.5) * 80, y: ay + (hash(`${n.id}y`) - 0.5) * 80, label: n.id.length * 6.6 + 10 };
  });
  const idx = new Map(ps.map((p, i) => [p.id, i]));
  const links = edges.filter((e) => idx.has(e.a) && idx.has(e.b)).map((e) => [idx.get(e.a), idx.get(e.b), e.w]);
  const STEPS = 360;
  for (let t = 0; t < STEPS; t++) {
    const alpha = 1 - t / STEPS;
    const f = ps.map(() => [0, 0]);
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const dx = ps[j].x - ps[i].x;
        const dy = ps[j].y - ps[i].y;
        const d2 = Math.max(dx * dx + dy * dy, 1);
        const d = Math.sqrt(d2);
        const rep = (W < 600 ? 1400 : 2600) / d2;
        f[i][0] -= (dx / d) * rep; f[i][1] -= (dy / d) * rep;
        f[j][0] += (dx / d) * rep; f[j][1] += (dy / d) * rep;
      }
    }
    for (const [i, j, w] of links) {
      const dx = ps[j].x - ps[i].x;
      const dy = ps[j].y - ps[i].y;
      const d = Math.max(Math.hypot(dx, dy), 1);
      const pull = (d - (Math.min(W, 760) / 12 + ps[i].r + ps[j].r)) * 0.012 * Math.min(1.5, w / 2);
      f[i][0] += (dx / d) * pull; f[i][1] += (dy / d) * pull;
      f[j][0] -= (dx / d) * pull; f[j][1] -= (dy / d) * pull;
    }
    ps.forEach((p, i) => {
      const [ax, ay] = anchor.get(p.cluster ?? -1);
      f[i][0] += (ax - p.x) * 0.02;
      f[i][1] += (ay - p.y) * 0.02;
      const step = Math.min(18, Math.hypot(f[i][0], f[i][1]) || 0);
      const len = Math.hypot(f[i][0], f[i][1]) || 1;
      p.x += (f[i][0] / len) * step * alpha;
      p.y += (f[i][1] / len) * step * alpha;
    });
    // Collisions, counting the label to the side of each node.
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i];
        const b = ps[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minX = (a.label + b.label) / 2 + a.r + b.r;
        const minY = a.r + b.r + 12;
        if (Math.abs(dx) < minX && Math.abs(dy) < minY) {
          const push = (minY - Math.abs(dy)) / 2;
          const s = dy >= 0 ? 1 : -1;
          a.y -= push * s * 0.5;
          b.y += push * s * 0.5;
        }
      }
    }
  }
  // Fit to the frame, leaving room for labels on the right.
  const pad = 16;
  const minX = Math.min(...ps.map((p) => p.x - p.r));
  const maxX = Math.max(...ps.map((p) => p.x + p.r + p.label));
  const minY = Math.min(...ps.map((p) => p.y - p.r));
  const maxY = Math.max(...ps.map((p) => p.y + p.r));
  // Scale positions only (labels and nodes keep their size), then centre.
  const kx = (W - 2 * pad - 90) / Math.max(maxX - minX - 90, 1);
  const ky = (H - 2 * pad) / Math.max(maxY - minY, 1);
  const k = Math.min(kx, ky, 2);
  const ox = (W - ((maxX - minX - 90) * k + 90)) / 2;
  const oy = (H - (maxY - minY) * k) / 2;
  for (const p of ps) {
    p.x = ox + (p.x - minX) * k;
    p.y = oy + (p.y - minY) * k;
  }
  return { ps, links };
}

export const sideName = (c) => `Your ${c.tags[0]} side`;

function Legend({ clusters }) {
  const shown = clusters.slice(0, CLUSTER_SLOTS);
  return (
    <ul className="viz-legend" aria-label="Your sides">
      {shown.map((c) => (
        <li key={c.index} title={clusterName(c)}><span className="viz-dot" style={{ background: clusterVar(c.index) }} />{sideName(c)}</li>
      ))}
      <li><span className="viz-dot" style={{ background: clusterVar(null) }} />Everything else</li>
    </ul>
  );
}

/** The taste web. Tap or focus a tag to light up what it's connected to, and see the saves behind it. */
export function TasteWeb({ web }) {
  // Lay out at the real size, so labels stay readable on a phone.
  const [box, width] = useWidth(760);
  const W = Math.round(width);
  const H = Math.round(W < 600 ? W * 1.3 : Math.min(520, W * 0.62));
  const { ps, links } = useMemo(() => layoutWeb(web.nodes, web.edges, W, H), [web, W, H]);
  const [sel, setSel] = useState(null);
  const neighbours = useMemo(() => {
    if (sel == null) return null;
    const set = new Set([sel]);
    for (const [i, j] of links) {
      if (i === sel) set.add(j);
      if (j === sel) set.add(i);
    }
    return set;
  }, [sel, links]);
  const maxW = Math.max(...links.map((l) => l[2]), 1);
  const node = sel != null ? ps[sel] : null;
  const cluster = node?.cluster != null ? web.clusters[node.cluster] : null;

  if (!ps.length) return null;
  return (
    <div className="viz taste-web">
      <Legend clusters={web.clusters} />
      <div className="web-wrap">
        <div ref={box} className="web-box">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Your taste universe: bubbles sized by how much you love them, coloured by side, joined when they show up together in your saves" onClick={() => setSel(null)}>
          <defs>
            {[0, 1, 2, null].map((c) => (
              <radialGradient key={String(c)} id={`bubble-${c}`} cx="35%" cy="30%" r="75%">
                <stop offset="0%" style={{ stopColor: `color-mix(in srgb, ${clusterVar(c)} 45%, white)` }} />
                <stop offset="100%" style={{ stopColor: clusterVar(c) }} />
              </radialGradient>
            ))}
            <filter id="aura" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28" /></filter>
          </defs>
          <g className="web-auras" filter="url(#aura)">
            {auras(ps).map((a) => <circle key={a.cluster} cx={a.x} cy={a.y} r={a.r} style={{ fill: clusterVar(a.cluster) }} />)}
          </g>
          <g className="web-edges">
            {links.map(([i, j, w]) => {
              const on = !neighbours || (neighbours.has(i) && neighbours.has(j) && (i === sel || j === sel));
              return <path key={`${i}-${j}`} d={curve(ps[i], ps[j])} strokeWidth={1.2 + 3.5 * (w / maxW)} className={on ? (sel != null ? 'lit' : '') : 'dim'} />;
            })}
          </g>
          {ps.map((p, i) => {
            const on = !neighbours || neighbours.has(i);
            return (
              <g key={p.id} className={`web-node ${on ? '' : 'dim'} ${sel === i ? 'sel' : ''}`} transform={`translate(${p.x},${p.y})`}
                tabIndex={0} role="button" aria-label={`${p.id}: ${p.firm} saves${p.maybe ? `, ${p.maybe} could be` : ''}`} aria-pressed={sel === i}
                onClick={(e) => (e.stopPropagation(), setSel(sel === i ? null : i))}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSel(sel === i ? null : i))}>
                <g className="float" style={{ animationDelay: `${-hash(p.id) * 6}s` }}>
                  <circle r={p.r + 8} className="hit" />
                  <circle r={p.r} className="bubble" style={{ fill: `url(#bubble-${p.cluster != null && p.cluster < CLUSTER_SLOTS ? p.cluster : null})` }} />
                  <text x={p.r + 6} y={4}>{p.id}</text>
                </g>
                <title>{`${p.id}: ${p.firm} saves${p.maybe ? `, ${p.maybe} more could be` : ''}`}</title>
              </g>
            );
          })}
        </svg>
        </div>
        <aside className="web-detail" aria-live="polite">
          {node ? (
            <>
              <p className="eyebrow">{cluster ? sideName(cluster) : 'Everything else'}</p>
              <h3><span className="viz-dot" style={{ background: clusterVar(node.cluster) }} />Why {node.id} is you</h3>
              <p className="muted small">{node.firm} saves say so{node.maybe ? `, ${node.maybe} more hint at it` : ''}. It goes with {neighbours.size - 1} other things you love.</p>
              <ul className="web-saves">
                {node.saves.map((s, k) => (
                  <li key={`${s.id}-${k}`}>
                    <span className={`tier-label tier-${s.tier}`}>{TIER_LABEL[s.tier]}</span>
                    <span><Icon name={SAVE_ICON[s.kind]} size={13} /> <b>{s.title}</b> <span className="muted">· {SOURCE_LABEL[s.source]}</span></span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted small">Every bubble is something you love. The bigger it is, the more you save it; the lines show what goes together. Tap one to see why.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

/** The same tags as a cloud. Size is strength; the dot is the cluster. */
export function TagCloud({ web, active, onTag }) {
  const max = Math.max(...web.nodes.map((n) => n.weight), 1);
  const order = [...web.nodes].sort((a, b) => (a.cluster ?? 99) - (b.cluster ?? 99) || b.weight - a.weight);
  return (
    <div className="viz">
      <Legend clusters={web.clusters} />
      <div className="cloud" aria-label="Your strongest tags">
        {order.map((n) => (
          <button key={n.id} className={`cloud-tag ${active === n.id ? 'on' : ''}`} style={{ '--w': 0.8 + (n.weight / max) * 1.1, '--c': clusterVar(n.cluster), '--r': `${(hash(n.id) - 0.5) * 6}deg` }} onClick={() => onTag(n.id)}
            title={`${n.firm} saves${n.maybe ? `, ${n.maybe} could be` : ''}`}>
            <span className="viz-dot" style={{ background: clusterVar(n.cluster) }} />{n.id}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The same data as a list. */
export function TagTable({ web }) {
  const links = new Map(web.nodes.map((n) => [n.id, []]));
  for (const e of web.edges) {
    links.get(e.a)?.push(e.b);
    links.get(e.b)?.push(e.a);
  }
  return (
    <div className="viz table-wrap">
      <table className="viz-table">
        <thead><tr><th>Taste</th><th>Side</th><th className="num">Saves</th><th className="num">Hints</th><th>Goes with</th></tr></thead>
        <tbody>
          {web.nodes.map((n) => (
            <tr key={n.id}>
              <td><b>{n.id}</b></td>
              <td><span className="viz-dot" style={{ background: clusterVar(n.cluster) }} />{n.cluster != null ? sideName(web.clusters[n.cluster]) : 'Everything else'}</td>
              <td className="num">{n.firm}</td>
              <td className="num">{n.maybe}</td>
              <td className="muted">{links.get(n.id).slice(0, 5).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Why this pick, as a flow: your apps on the left, the tags they share in
 * the middle, the pick on the right. Band width is the number of saves.
 * Could-be signals are dashed; friends, new openings and hidden gems feed
 * straight in.
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

const APP_ICON = { spotify: 'music', instagram: 'image', google_maps: 'pin', pinterest: 'bookmark', manual: 'note' };

/** Your Tastemate character: who your saves say you are, and where to stretch next. */
export function CharacterCard({ character, onStretch }) {
  if (!character) return null;
  return (
    <section className="viz character" aria-label="Your Tastemate character">
      <div className="character-blobs" aria-hidden>
        {character.sides.map((sd) => <span key={sd.index} className={`blob b${sd.index}`} style={{ background: clusterVar(sd.index) }} />)}
      </div>
      <div className="character-body">
        <p className="eyebrow">Your Tastemate character</p>
        <h2>{character.name}</h2>
        {character.tagline && <p className="character-tagline">{character.tagline}</p>}
        {character.sides.length > 0 && (
          <ul className="character-sides">
            {character.sides.map((sd) => (
              <li key={sd.index} style={{ '--c': clusterVar(sd.index) }}>
                <b>{sd.share}%</b> {sideName(sd).replace('Your ', '')}
                <small>{sd.tags.slice(1).join(' · ')}</small>
              </li>
            ))}
          </ul>
        )}
        <p className="character-apps">
          Read from {character.saves} saves across{' '}
          {character.apps.map((a, i) => (
            <span key={a.source} className="app-chip"><Icon name={APP_ICON[a.source] || 'bookmark'} size={13} /> {a.label} {a.n}{i < character.apps.length - 1 ? '' : ''}</span>
          ))}
        </p>
        {character.stretch.length > 0 && (
          <div className="character-stretch">
            <span>Stretch your taste:</span>
            {character.stretch.map((t) => <span key={t} className="stretch-chip">{t}</span>)}
            {onStretch && <button className="btn btn-sm btn-primary" onClick={onStretch}>Find some <Icon name="arrow" size={15} /></button>}
          </div>
        )}
      </div>
    </section>
  );
}
