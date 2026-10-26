import { useState } from 'react';
import { Link } from 'react-router-dom';
import { qs } from '../api.js';
import Icon, { SPOT_ICON } from '../components/Icon.jsx';
import { useActions } from '../components/actions.jsx';
import Mascot from '../components/Mascot.jsx';
import SpotPhoto from '../components/SpotPhoto.jsx';
import TasteArt, { hasArt } from '../components/TasteArt.jsx';
import { PinBoard, Vinyl, WES, wesFor } from '../components/Retro.jsx';
import { Empty, Loading, PageHead, useApi } from '../components/ui.jsx';

// Host: "I'm having people over" → one theme from your taste clusters, and
// everything to match it: drinks, food, music, an invitation and a moodboard.
export default function Host() {
  const [type, setType] = useState('dinner');
  const [theme, setTheme] = useState(null);
  const [city, setCity] = useState(null);
  const state = useApi(`/occasion${qs({ type, theme, city })}`);

  return (
    <>
      <PageHead title="Set the mood" intro="Having people over? Pick the occasion and we’ll pull a whole evening out of your taste: what to pour, serve and play, and how to invite them." />
      <Loading state={state}>
        {(d) => (
          <>
            <div className="host-controls">
              <div className="seg" role="radiogroup" aria-label="Occasion">
                {d.occasions.map((o) => (
                  <button key={o.type} role="radio" aria-checked={type === o.type} className={type === o.type ? 'on' : ''} onClick={() => (setType(o.type), setTheme(null))}>{o.label}</button>
                ))}
              </div>
              <label className="field-inline">
                <span className="label">In</span>
                <select value={d.city || ''} onChange={(e) => setCity(e.target.value)} aria-label="City">
                  {d.cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>

            {d.themes.length === 0 ? (
              <Empty>Bring in a few more saves first: the mood comes from your taste. <Link to="/you">Feed your Tastemate</Link></Empty>
            ) : (
              <>
                <div className="chips" aria-label="Themes">
                  <span className="label">Moods from your saves</span>
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
      <section className="theme-banner">
        <Mascot size={120} color="butter" prop={d.theme.tags.find(hasArt) || 'wine bar'} />
        <div className="theme-text">
          <p className="eyebrow">{d.occasion.label} · from {d.theme.from} of your saves</p>
          <h2>{d.theme.name}</h2>
          <div className="tags">{d.theme.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
        </div>
        <div className="swatches" aria-label="The evening’s colours">
          {d.theme.palette.map((c) => <span key={c} style={{ background: c }} title={c} />)}
        </div>
      </section>

      <div className="venue-row">
        {d.venue && (
          <article className="venue-card" style={{ '--tape': wesFor(d.venue.spot.title) }}>
            <SpotPhoto spot={d.venue.spot} size={70} className="venue-photo" />
            <div>
              <p className="eyebrow">Throw it at</p>
              <h3>{d.venue.spot.title}</h3>
              <p className="sub">{[d.venue.spot.venue, d.venue.spot.city].filter(Boolean).join(' · ')}{d.venue.spot.is_demo && <span className="badge demo">demo</span>}</p>
              {d.venue.because.length > 0 && <p className="because">for your love of {d.venue.because.join(', ')}</p>}
            </div>
          </article>
        )}
        <article className="style-card">
          <p className="eyebrow">Your style of the night</p>
          <h3>{d.invite.dress || 'Come as you are'}</h3>
          <div className="swatches big" aria-label="Wear these colours">
            {d.theme.palette.map((c) => <span key={c} style={{ background: c }} title={c} />)}
          </div>
          <p className="muted small">Wear these colours, light candles, and put {d.playlist.fromSaves[0]?.title || d.playlist.more[0]?.title || 'a record'} on first.</p>
        </article>
      </div>

      <Numbers numbers={d.numbers} />
      <RunOfShow run={d.run} palette={d.theme.palette} />
      <Guests guests={d.guests} />

      <div className="host-grid">
        <Invite invite={d.invite} />
        <section className="panel">
          <h2><Icon name="cup" /> Pour this</h2>
          <IdeaList title="Wine" items={d.drinks.wine} />
          <IdeaList title="Cocktails" items={d.drinks.cocktails} />
          <IdeaList title="Without alcohol" items={d.drinks.zero} />
        </section>
        <section className="panel">
          <h2><Icon name="sparkle" /> Serve this</h2>
          <IdeaList title="As people arrive" items={d.food.snacks} />
          <IdeaList title="Main" items={d.food.main} />
          <IdeaList title="Sweet" items={d.food.sweet} />
        </section>
        <section className="panel span-all">
          <h2><Icon name="music" /> Press play</h2>
          <ul className="records">
            {[...d.playlist.fromSaves.map((x) => ({ ...x, mine: true })), ...d.playlist.more].map((x) => (
              <li key={x.title} className="record">
                <Vinyl title={x.title} size={48} />
                <span>
                  <b>{x.url ? <a href={x.url} target="_blank" rel="noreferrer">{x.title}</a> : x.title}</b>
                  <small className="muted">{x.creator}{x.mine ? ' · from your saves' : ''}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Scene scene={d.scene} />
      <Games games={d.games} />
      <Countdown prep={d.prep} />

      {d.moodboard.length > 0 && (
        <section className="shelf-section">
          <div className="shelf-head">
            <div>
              <h2><Icon name="image" /> The vibe</h2>
              <p className="shelf-sub">Your own saves, from every app, that set this mood.</p>
            </div>
          </div>
          <PinBoard className="collage">
            {d.moodboard.map((m, i) => (
              <figure key={m.id} className="collage-snap" style={{ '--tilt': `${((i * 37) % 9) - 4}deg` }}>
                <span className="pin" aria-hidden />
                <span className="collage-photo" style={{ background: d.theme.palette[i % d.theme.palette.length] }}>
                  {m.kind === 'song' ? <Vinyl title={m.title} size={64} /> : <TasteArt name={m.tags.find(hasArt) || 'explorer'} size={60} fill="#fff" />}
                </span>
                <figcaption>
                  <b>{m.url ? <a href={m.url} target="_blank" rel="noreferrer">{m.title}</a> : m.title}</b>
                  <span>{m.tags.slice(0, 2).join(' · ')}</span>
                </figcaption>
              </figure>
            ))}
          </PinBoard>
        </section>
      )}

      {d.shop.length > 0 && (
        <section className="shelf-section">
          <div className="shelf-head"><h2><Icon name="bag" /> Grab on the way{d.city ? ` in ${d.city}` : ''}</h2></div>
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

/** The night in numbers: a strip of big, friendly figures. */
function Numbers({ numbers }) {
  return (
    <ul className="numbers" aria-label="The night in numbers">
      {numbers.map((x, i) => (
        <li key={x.label} style={{ '--c': WES[i % WES.length] }}><b>{x.n}</b><span>{x.label}</span></li>
      ))}
    </ul>
  );
}

const STEP_ICON = { arrive: 'bell', snacks: 'sparkle', main: 'cup', game: 'star', sweet: 'heart', late: 'moon' };

/** The night, hour by hour: a strip of clock stubs tied with string. */
function RunOfShow({ run }) {
  return (
    <section className="shelf-section">
      <div className="shelf-head"><div><h2><Icon name="clock" /> The night, hour by hour</h2><p className="shelf-sub">Built from everything below, so it runs itself.</p></div></div>
      <ol className="run">
        {run.map((r, i) => (
          <li key={r.time + r.step} style={{ '--c': WES[i % WES.length], '--tilt': `${((i * 37) % 5) - 2}deg` }}>
            <span className="run-time"><Icon name={STEP_ICON[r.step] || 'clock'} size={14} /> {r.time}</span>
            <b>{r.what}</b>
            {r.detail && <small>{r.detail}</small>}
          </li>
        ))}
      </ol>
    </section>
  );
}

const GUEST_COLOR = ['sky', 'mint', 'lilac', 'peach', 'butter', 'pink'];

/** Who's coming, as little characters, with their taste title and what to bring. */
function Guests({ guests }) {
  if (!guests.length) return null;
  return (
    <section className="shelf-section">
      <div className="shelf-head">
        <div><h2><Icon name="users" /> Who’s coming</h2><p className="shelf-sub">Everyone brings something that suits their taste.</p></div>
        <Link to="/friends" className="btn btn-sm btn-outline">Add friends</Link>
      </div>
      <ul className="guests">
        {guests.map((g, i) => (
          <li key={g.name} className="guest">
            <span className="guest-art">
              <Mascot size={78} color={GUEST_COLOR[i % GUEST_COLOR.length]} prop={g.emblem || undefined} tear={false} />
              {g.avatar_url && <img src={g.avatar_url} alt="" />}
            </span>
            <b>{g.name}{g.sample && <span className="badge demo">sample</span>}</b>
            {g.title && <span className="guest-title">{g.title}</span>}
            <span className="guest-bring"><Icon name="bag" size={13} /> brings {g.bring}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const SCENE_ICON = { light: 'sun', scent: 'sparkle', table: 'cup', sound: 'music' };
const SCENE_LABEL = { light: 'Light', scent: 'Scent', table: 'Table', sound: 'Sound' };

/** Set the scene: light, scent, table and sound, one card each. */
function Scene({ scene }) {
  return (
    <section className="shelf-section">
      <div className="shelf-head"><h2><Icon name="sun" /> Set the scene</h2></div>
      <div className="scene">
        {scene.filter((x) => x.name).map((x, i) => (
          <article key={x.area} className="scene-card" style={{ '--c': WES[(i + 2) % WES.length] }}>
            <span className="scene-icon"><Icon name={SCENE_ICON[x.area]} size={20} /></span>
            <p className="eyebrow">{SCENE_LABEL[x.area]}</p>
            <h3>{x.name}</h3>
            <p className="muted small">{x.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const SUITS = ['♠', '♥', '♣', '♦'];

/** Break the ice: games as a fanned hand of playing cards. */
function Games({ games }) {
  if (!games.length) return null;
  return (
    <section className="shelf-section">
      <div className="shelf-head"><h2><Icon name="star" /> Break the ice</h2></div>
      <div className="cards-hand">
        {games.map((g, i) => (
          <article key={g.name} className="play-card" style={{ '--tilt': `${(i - (games.length - 1) / 2) * 5}deg` }}>
            <span className="suit">{SUITS[i % 4]}</span>
            <h3>{g.name}</h3>
            <p>{g.note}</p>
            {g.because.length > 0 && <span className="because">for your {g.because.slice(0, 2).join(', ')}</span>}
            <span className="suit flip">{SUITS[i % 4]}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

/** The countdown: a to-do list on a notepad, ticked off as you go. */
function Countdown({ prep }) {
  const [done, setDone] = useState({});
  return (
    <section className="shelf-section">
      <div className="shelf-head"><h2><Icon name="check" /> The countdown</h2></div>
      <div className="notepad">
        {prep.map((p) => (
          <div key={p.when} className="notepad-block">
            <span className="label">{p.when}</span>
            <ul>
              {p.tasks.filter(Boolean).map((t) => {
                const k = `${p.when}|${t}`;
                return (
                  <li key={k}>
                    <label className={done[k] ? 'done' : ''}>
                      <input type="checkbox" checked={!!done[k]} onChange={() => setDone({ ...done, [k]: !done[k] })} />
                      <span>{t}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
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
      <h2><Icon name="note" /> Send the invite</h2>
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
