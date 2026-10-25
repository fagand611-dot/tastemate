import { useState } from 'react';
import { Link } from 'react-router-dom';
import { qs } from '../api.js';
import Icon, { SAVE_ICON, SPOT_ICON } from '../components/Icon.jsx';
import { useActions } from '../components/actions.jsx';
import { Empty, Loading, PageHead, useApi } from '../components/ui.jsx';

// Host: "I'm having people over" → one theme from your taste clusters, and
// everything to match it: drinks, food, music, an invitation and a moodboard.
export default function Host() {
  const [type, setType] = useState('dinner');
  const [theme, setTheme] = useState(null);
  const state = useApi(`/occasion${qs({ type, theme })}`);

  return (
    <>
      <PageHead title="Host" intro="Having people over? Pick the occasion. We’ll pull one theme from your saves and match the wine, food, music and invitation to it." />
      <Loading state={state}>
        {(d) => (
          <>
            <div className="seg" role="radiogroup" aria-label="Occasion">
              {d.occasions.map((o) => (
                <button key={o.type} role="radio" aria-checked={type === o.type} className={type === o.type ? 'on' : ''} onClick={() => (setType(o.type), setTheme(null))}>{o.label}</button>
              ))}
            </div>

            {d.themes.length === 0 ? (
              <Empty>Save a few more things first. Themes come from your taste clusters. <Link to="/saves">Import your saves</Link></Empty>
            ) : (
              <>
                <div className="chips" aria-label="Themes">
                  <span className="label">Themes from your saves</span>
                  {d.themes.map((t) => (
                    <button key={t.index} className={`chip ${d.theme.index === t.index ? 'on' : ''}`} onClick={() => setTheme(t.index)}>{t.name}</button>
                  ))}
                </div>
                <Plan d={d} />
              </>
            )}
          </>
        )}
      </Loading>
    </>
  );
}

function Plan({ d }) {
  return (
    <>
      <section className="theme-banner" style={{ '--c0': d.theme.palette[0], '--c1': d.theme.palette[1] || d.theme.palette[0] }}>
        <div>
          <p className="eyebrow">{d.occasion.label} · from {d.theme.from} of your saves</p>
          <h2>{d.theme.name}</h2>
          <div className="tags">{d.theme.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
        </div>
        <div className="swatches" aria-label="Palette">
          {d.theme.palette.map((c) => <span key={c} style={{ background: c }} title={c} />)}
        </div>
      </section>

      <div className="host-grid">
        <Invite invite={d.invite} />
        <section className="panel">
          <h2><Icon name="cup" /> To drink</h2>
          <IdeaList title="Wine" items={d.drinks.wine} />
          <IdeaList title="Cocktails" items={d.drinks.cocktails} />
          <IdeaList title="Without alcohol" items={d.drinks.zero} />
        </section>
        <section className="panel">
          <h2><Icon name="sparkle" /> To eat</h2>
          <IdeaList title="As people arrive" items={d.food.snacks} />
          <IdeaList title="Main" items={d.food.main} />
          <IdeaList title="Sweet" items={d.food.sweet} />
        </section>
        <section className="panel">
          <h2><Icon name="music" /> Playlist</h2>
          {d.playlist.fromSaves.length > 0 && (
            <>
              <span className="label">From your saves</span>
              <ol className="playlist">
                {d.playlist.fromSaves.map((s) => (
                  <li key={s.id}>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}{s.creator && <span className="muted"> · {s.creator}</span>}</li>
                ))}
              </ol>
            </>
          )}
          {d.playlist.more.length > 0 && (
            <>
              <span className="label">Records that fit</span>
              <ul className="playlist">
                {d.playlist.more.map((s) => <li key={s.title}>{s.title}<span className="muted"> · {s.creator}</span></li>)}
              </ul>
            </>
          )}
        </section>
      </div>

      {d.moodboard.length > 0 && (
        <section className="shelf-section">
          <div className="shelf-head">
            <div>
              <h2><Icon name="image" /> Moodboard</h2>
              <p className="shelf-sub">Your own saves, from every app, that carry this theme.</p>
            </div>
          </div>
          <div className="moodboard">
            {d.moodboard.map((m, i) => {
              const bg = d.theme.palette[i % d.theme.palette.length];
              const dark = isDark(bg);
              return (
              <figure key={m.id} className={`mood-tile t${i % 5} ${dark ? 'dark' : ''}`} style={{ '--bg': bg, '--fg': dark ? '#fff' : '#1a1a1a' }}>
                <Icon name={SAVE_ICON[m.kind]} size={20} />
                <figcaption>
                  <b>{m.url ? <a href={m.url} target="_blank" rel="noreferrer">{m.title}</a> : m.title}</b>
                  <span>{m.tags.slice(0, 3).join(' · ')}</span>
                </figcaption>
              </figure>
              );
            })}
          </div>
        </section>
      )}

      {d.shop.length > 0 && (
        <section className="shelf-section">
          <div className="shelf-head"><h2><Icon name="bag" /> Pick up{d.city ? ` in ${d.city}` : ''}</h2></div>
          <ul className="plan">
            {d.shop.map((s) => (
              <li key={s.id}>
                <Icon name={SPOT_ICON[s.kind]} size={16} />
                <span><b>{s.title}</b> <span className="muted">{[s.venue, s.price].filter(Boolean).join(' · ')}</span></span>
                {s.is_demo && <span className="badge demo">demo</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** Is this #rrggbb colour dark enough to need light text? */
function isDark(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

function IdeaList({ title, items }) {
  if (!items.length) return null;
  return (
    <div className="ideas">
      <span className="label">{title}</span>
      <ul>
        {items.map((x) => (
          <li key={x.name}>
            <b>{x.name}</b>
            <span className="muted small">{x.note}</span>
            {x.because.length > 0 && <span className="because">for your {x.because.slice(0, 3).join(', ')}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

const MOTIFS = {
  record: <><circle cx="50" cy="50" r="40" /><circle cx="50" cy="50" r="28" /><circle cx="50" cy="50" r="6" /></>,
  candle: <><path d="M44 40h12v50H44z" /><path d="M50 14c6 8 6 14 0 20-6-6-6-12 0-20z" /></>,
  grid: <><path d="M10 10h80v80H10zM36 10v80M64 10v80M10 36h80M10 64h80" /></>,
  sun: <><circle cx="50" cy="50" r="18" /><path d="M50 10v14M50 76v14M10 50h14M76 50h14M22 22l10 10M68 68l10 10M78 22 68 32M32 68 22 78" /></>,
  arc: <><path d="M10 90a40 40 0 0 1 80 0" /><path d="M24 90a26 26 0 0 1 52 0" /></>,
};

/** A live preview of the invitation in the theme's type, colours and motif. */
function Invite({ invite }) {
  const [when, setWhen] = useState('Saturday, 8pm');
  const [where, setWhere] = useState('at mine');
  const { toast } = useActions();
  const text = [invite.headline, invite.line, `${when}, ${where}`, invite.dress && `Dress: ${invite.dress}`].filter(Boolean).join('\n');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Invitation text copied');
    } catch {
      toast('Couldn’t copy. Select the text instead.');
    }
  };
  return (
    <section className="panel invite-panel">
      <h2><Icon name="note" /> Invitation</h2>
      <div className={`invite type-${invite.type}`} style={{ '--bg': invite.colors.bg, '--ink': invite.colors.ink, '--accent': invite.colors.accent }}>
        <svg className="invite-motif" viewBox="0 0 100 100" aria-hidden>{MOTIFS[invite.motif]}</svg>
        <p className="invite-line">{invite.line}</p>
        <h3>{invite.headline}</h3>
        <p className="invite-when">{when}<br />{where}</p>
        {invite.dress && <p className="invite-dress">Dress: {invite.dress}</p>}
      </div>
      <div className="form-row">
        <input value={when} onChange={(e) => setWhen(e.target.value)} aria-label="When" />
        <input value={where} onChange={(e) => setWhere(e.target.value)} aria-label="Where" />
      </div>
      <button className="btn btn-sm btn-outline" onClick={copy}>Copy invitation text</button>
    </section>
  );
}
