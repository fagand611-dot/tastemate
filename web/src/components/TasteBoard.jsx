import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Mascot from './Mascot.jsx';
import { hash, threadPath } from './Retro.jsx';

// The taste board: you in the middle, your strongest tastes around you as
// crossword-style letter blocks (bigger blocks = stronger taste, colour =
// what kind of taste it is), tied to you with red thread. Tastes that turn
// up in the same saves are tied to each other with a dashed thread.
// "Everything is connected."

export const FACET_COLOR = {
  food: '#f6d77a', sound: '#a9d3e8', vibe: '#f6b8c6', place: '#bfe6dc', time: '#cfc6f2', price: '#ffcdb8', era: '#fbf1dc', thing: '#fbe89a',
};
const FACET_LABEL = { food: 'food', sound: 'sound', vibe: 'vibe', place: 'place', time: 'time', price: 'price', era: 'era', thing: 'things' };

export default function TasteBoard({ board, character, avatarUrl, name }) {
  const box = useRef(null);
  const [width, setWidth] = useState(900);
  const [sel, setSel] = useState(null);
  const [lines, setLines] = useState({ center: null, words: {} });
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  const wide = width >= 680;
  const H = wide ? Math.round(Math.min(640, Math.max(500, width * 0.62))) : null;

  // Where each word sits on a wide board: around an ellipse, nudged apart.
  const placed = useMemo(() => {
    if (!wide) return null;
    const n = board.tastes.length;
    const out = board.tastes.map((t, i) => {
      const cell = Math.round(16 + 14 * t.weight);
      const w = t.tag.length * cell;
      const a = -Math.PI / 2 + (i / n) * 2 * Math.PI + ((hash(t.tag) % 10) - 5) * 0.02;
      const k = i % 2 ? 0.74 : 0.96;
      let x = width / 2 + Math.cos(a) * (width / 2 - 40) * k;
      let y = H / 2 + Math.sin(a) * (H / 2 - 40) * k;
      x = Math.min(Math.max(x, w / 2 + 14), width - w / 2 - 14);
      y = Math.min(Math.max(y, cell / 2 + 14), H - cell / 2 - 14);
      return { ...t, cell, w, h: cell, x, y };
    });
    // Keep clear of the character in the middle, and of each other.
    const cx = width / 2;
    const cy = H / 2;
    for (let it = 0; it < 40; it++) {
      for (const p of out) {
        if (Math.abs(p.x - cx) < p.w / 2 + 95 && Math.abs(p.y - cy) < p.h / 2 + 100) p.y += p.y < cy ? -6 : 6;
      }
      for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
        const a = out[i];
        const b = out[j];
        if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 10 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + 10) {
          const s = a.y <= b.y ? -1 : 1;
          a.y += 4 * s;
          b.y -= 4 * s;
        }
      }
      for (const p of out) p.y = Math.min(Math.max(p.y, p.h / 2 + 10), H - p.h / 2 - 10);
    }
    return out;
  }, [board, width, H, wide]);

  // Threads are drawn between the real positions of things on screen.
  const measure = () => {
    const el = box.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    const mid = (r) => [r.left + r.width / 2 - b.left, r.top + r.height / 2 - b.top];
    const c = el.querySelector('.board-me');
    const words = {};
    for (const w of el.querySelectorAll('.board-word')) words[w.dataset.tag] = mid(w.getBoundingClientRect());
    setLines({ center: c ? mid(c.getBoundingClientRect()) : null, words });
  };
  useLayoutEffect(measure, [placed, width]);

  const related = useMemo(() => {
    if (!sel) return null;
    const s = new Set([sel]);
    for (const t of board.threads) {
      if (t.a === sel) s.add(t.b);
      if (t.b === sel) s.add(t.a);
    }
    return s;
  }, [sel, board]);
  const active = board.tastes.find((t) => t.tag === sel);

  return (
    <div className="board-wrap">
      <div ref={box} className={`board ${wide ? 'wide' : 'narrow'}`} style={wide ? { height: H } : undefined} onClick={() => setSel(null)}>
        {lines.center && (
          <svg className="board-threads" aria-hidden>
            {board.threads.map((t) => {
              const a = lines.words[t.a];
              const b = lines.words[t.b];
              if (!a || !b) return null;
              const on = !related || (related.has(t.a) && related.has(t.b) && (t.a === sel || t.b === sel));
              return <path key={`${t.a}|${t.b}`} className={`thread-between ${on ? '' : 'dim'}`} d={threadPath(a[0], a[1], b[0], b[1], hash(t.a + t.b))} />;
            })}
            {board.tastes.map((t) => {
              const p = lines.words[t.tag];
              if (!p) return null;
              const on = !related || related.has(t.tag);
              return <path key={t.tag} className={`thread ${on ? '' : 'dim'}`} style={{ strokeWidth: 1.5 + 2 * t.weight }} d={threadPath(lines.center[0], lines.center[1], p[0], p[1], hash(t.tag))} />;
            })}
          </svg>
        )}

        <div className="board-me" style={wide ? { left: width / 2, top: H / 2 } : undefined}>
          <Mascot size={wide ? 150 : 120} prop={character?.key} color="pink" />
          {avatarUrl && <img className="board-photo" src={avatarUrl} alt="" />}
          <span className="board-name">{name}</span>
        </div>

        <div className="board-words">
          {(placed || board.tastes.map((t) => ({ ...t, cell: Math.round(14 + 10 * t.weight) }))).map((t, i) => (
            <button
              key={t.tag}
              data-tag={t.tag}
              className={`board-word ${related && !related.has(t.tag) ? 'dim' : ''} ${sel === t.tag ? 'sel' : ''}`}
              style={{ '--cell': `${t.cell}px`, '--fill': FACET_COLOR[t.facet] || FACET_COLOR.thing, '--d': `${(hash(t.tag) % 40) / 10}s`, ...(placed ? { left: t.x, top: t.y } : {}) }}
              onClick={(e) => (e.stopPropagation(), setSel(sel === t.tag ? null : t.tag))}
              aria-pressed={sel === t.tag}
              aria-label={`${t.tag}: ${FACET_LABEL[t.facet]}, ${t.saves} saves`}
            >
              {[...t.tag.toUpperCase()].map((ch, k) => (
                <span key={k} className={ch === ' ' ? 'gap' : ''}>
                  {k === 0 && <sup>{i + 1}</sup>}
                  {ch === ' ' ? '' : ch}
                </span>
              ))}
            </button>
          ))}
        </div>
      </div>

      <div className="board-foot">
        <p className="board-note" aria-live="polite">
          {active
            ? <><b>{active.tag}</b> · {active.saves} of your saves{active.examples.length ? <>, like “{active.examples.join('”, “')}”</> : null}</>
            : 'Tap a word to see what it’s tied to. Bigger blocks are bigger loves.'}
        </p>
        <ul className="board-key" aria-label="Kinds of taste">
          {[...new Set(board.tastes.map((t) => t.facet))].map((f) => (
            <li key={f}><span style={{ background: FACET_COLOR[f] }} />{FACET_LABEL[f]}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
