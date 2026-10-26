import { useState } from 'react';
import { Link } from 'react-router-dom';
import { qs } from '../api.js';
import Icon, { SPOT_ICON } from '../components/Icon.jsx';
import Mascot from '../components/Mascot.jsx';
import SpotPhoto from '../components/SpotPhoto.jsx';
import TasteArt, { hasArt } from '../components/TasteArt.jsx';
import { PinBoard, Vinyl, WES } from '../components/Retro.jsx';
import { Empty, Loading, PageHead, useApi } from '../components/ui.jsx';
import { Dialog } from '../components/viz.jsx';
import { InviteCard, SendInvite } from '../components/InviteCard.jsx';
import { MascotFace } from '../components/Mascot.jsx';
import { useAuth } from '../App.jsx';

// Host: "I'm having people over" → one theme from your taste clusters, and
// everything to match it, sealed in an envelope: open it and the invitation,
// a ticket, the menu, a record and the rest spill out; tap one for the detail.
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
                <p className="label themes-label">Pick a theme</p>
                <div className="themes" role="radiogroup" aria-label="Theme">
                  {d.themes.map((t) => (
                    <button key={t.index} role="radio" aria-checked={d.theme.index === t.index} className={`theme-pick ${d.theme.index === t.index ? 'on' : ''}`} style={{ '--a': t.palette[0], '--b': t.palette[1] || t.palette[0] }} onClick={() => setTheme(t.index)}>
                      <span className="theme-dots" aria-hidden>{t.palette.map((c) => <i key={c} style={{ background: c }} />)}</span>
                      <b>{t.name}</b>
                      <small>because of {t.examples.slice(0, 2).map((x) => `“${x.length > 28 ? `${x.slice(0, 26)}…` : x}”`).join(', ')}{t.from > 2 ? ` and ${t.from - 2} more` : ''}</small>
                    </button>
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
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [when, setWhen] = useState('Saturday, 8pm');
  const [where, setWhere] = useState(d.venue ? d.venue.spot.title : 'at mine');
  const records = [...d.playlist.fromSaves.map((x) => ({ ...x, mine: true })), ...d.playlist.more];
  const ink = d.invite.colors;
  // What the invite link shows guests.
  const payload = {
    occasion: d.occasion.label, headline: d.invite.headline, line: d.invite.line, when, where, dress: d.invite.dress,
    type: d.invite.type, motif: d.invite.motif, colors: d.invite.colors, palette: d.theme.palette,
    records: records.slice(0, 3).map((x) => `${x.title}${x.creator ? ` · ${x.creator}` : ''}`),
    menu: [...d.food.snacks, ...d.food.main, ...d.food.sweet].map((x) => x.name),
  };

  // Everything in the envelope, and what each one opens.
  const items = [
    { key: 'invite', label: 'The invitation', node: (
      <div className={`obj-invite invite type-${d.invite.type}`} style={{ '--bg': ink.bg, '--ink': ink.ink, '--accent': ink.accent }}>
        <small>{d.invite.line}</small><b>{d.invite.headline}</b><span>{when}</span>
      </div>
    ) },
    { key: 'ticket', label: 'Your ticket', node: (
      <div className="obj-ticket"><small>Admit one</small><b>{d.theme.name}</b><span>{when} · {where}</span></div>
    ) },
    { key: 'menu', label: 'The menu', node: (
      <div className="obj-menu">
        <small>Menu</small>
        {[...d.food.snacks, ...d.food.main, ...d.food.sweet].slice(0, 4).map((x) => <span key={x.name}>{x.name}</span>)}
        <i>{d.drinks.wine[0]?.name.split(' (')[0]}</i>
      </div>
    ) },
    { key: 'records', label: `${records.length} records`, node: (
      <div className="obj-record" style={{ '--sleeve': d.theme.palette[1] || '#ff7a1a' }}>
        <Vinyl title={records[0]?.title || ''} size={96} spinning={open} />
        <span className="sleeve"><b>{records[0]?.title}</b><small>{records[0]?.creator}</small></span>
      </div>
    ) },
    d.venue && { key: 'venue', label: 'Throw it at', node: (
      <div className="obj-matchbook"><span className="sticks" aria-hidden /><b>{d.venue.spot.title}</b><small>{d.venue.spot.venue}</small></div>
    ) },
    { key: 'dress', label: 'What to wear', node: (
      <div className="obj-swatch"><small>Dress code</small><b>{d.invite.dress || 'Come as you are'}</b><span className="chips-row">{d.theme.palette.map((c) => <i key={c} style={{ background: c }} />)}</span></div>
    ) },
    d.guests.length > 0 && { key: 'guests', label: `${d.guests.length} guests`, node: (
      <div className="obj-tag"><span className="hole" aria-hidden /><small>Guest list</small>{d.guests.slice(0, 4).map((g) => <span key={g.name}>{g.name}</span>)}</div>
    ) },
    { key: 'run', label: 'Hour by hour', node: (
      <div className="obj-card"><small>The running order</small>{d.run.slice(0, 4).map((r) => <span key={r.time}><b>{r.time}</b> {r.step}</span>)}</div>
    ) },
    { key: 'scene', label: 'Set the scene', node: (
      <div className="obj-scene"><TasteArt name={d.theme.tags.find(hasArt) || 'moody'} size={64} fill="#3a3633" /><b>{d.scene[0]?.name}</b></div>
    ) },
    d.games.length > 0 && { key: 'games', label: 'Break the ice', node: (
      <div className="obj-play"><span>♥</span><b>{d.games[0].name}</b><span className="flip">♥</span></div>
    ) },
    { key: 'todo', label: 'The countdown', node: (
      <div className="obj-notepad"><small>To do</small>{d.prep.slice(0, 3).map((p) => <span key={p.when}>☐ {p.tasks[0]}</span>)}</div>
    ) },
    d.moodboard.length > 0 && { key: 'vibe', label: 'The vibe', node: (
      <div className="obj-polaroids">{d.moodboard.slice(0, 2).map((m, i) => <span key={m.id} style={{ '--t': `${i ? 6 : -5}deg`, background: d.theme.palette[i] }}><TasteArt name={m.tags.find(hasArt) || 'explorer'} size={40} fill="#fff" /></span>)}</div>
    ) },
    d.shop.length > 0 && { key: 'shop', label: 'On the way', node: (
      <div className="obj-receipt"><small>{d.city || 'Shop'}</small>{d.shop.slice(0, 3).map((x) => <span key={x.id}>{x.title.split(',')[0]}<i>{x.price || ''}</i></span>)}</div>
    ) },
  ].filter(Boolean);

  const views = {
    invite: ['Send the invite', <Invite invite={d.invite} when={when} where={where} setWhen={setWhen} setWhere={setWhere} payload={payload} />],
    ticket: ['Your ticket', <Ticket d={d} when={when} where={where} />],
    menu: ['The menu', (
      <div className="host-grid two">
        <section className="panel"><h2><Icon name="sparkle" /> Serve this</h2><IdeaList title="As people arrive" items={d.food.snacks} /><IdeaList title="Main" items={d.food.main} /><IdeaList title="Sweet" items={d.food.sweet} /></section>
        <section className="panel"><h2><Icon name="cup" /> Pour this</h2><IdeaList title="Wine" items={d.drinks.wine} /><IdeaList title="Cocktails" items={d.drinks.cocktails} /><IdeaList title="Without alcohol" items={d.drinks.zero} /></section>
      </div>
    )],
    records: ['Press play', (
      <ul className="records">
        {records.map((x) => (
          <li key={x.title} className="record">
            <Vinyl title={x.title} size={48} />
            <span><b>{x.url ? <a href={x.url} target="_blank" rel="noreferrer">{x.title}</a> : x.title}</b><small className="muted">{x.creator}{x.mine ? ' · from your saves' : ''}</small></span>
          </li>
        ))}
      </ul>
    )],
    venue: d.venue && ['Throw it at', (
      <article className="venue-card">
        <SpotPhoto spot={d.venue.spot} size={70} className="venue-photo" />
        <div>
          <h3>{d.venue.spot.title}</h3>
          <p className="sub">{[d.venue.spot.venue, d.venue.spot.city].filter(Boolean).join(' · ')}{d.venue.spot.is_demo && <span className="badge demo">demo</span>}</p>
          {d.venue.because.length > 0 && <p className="because">for your love of {d.venue.because.join(', ')}</p>}
          <button className="btn btn-sm btn-outline" onClick={() => setWhere(d.venue.spot.title)}>Put it on the invite</button>
        </div>
      </article>
    )],
    dress: ['What to wear', (
      <article className="style-card">
        <h3>{d.invite.dress || 'Come as you are'}</h3>
        <div className="swatches big" aria-label="Wear these colours">{d.theme.palette.map((c) => <span key={c} style={{ background: c }} title={c} />)}</div>
        <p className="muted small">Wear these colours, light candles, and put {records[0]?.title || 'a record'} on first.</p>
      </article>
    )],
    guests: ['Who’s coming', <Guests guests={d.guests} />],
    run: ['The night, hour by hour', <><Numbers numbers={d.numbers} /><RunOfShow run={d.run} /></>],
    scene: ['Set the scene', <Scene scene={d.scene} />],
    games: ['Break the ice', <Games games={d.games} />],
    todo: ['The countdown', <Countdown prep={d.prep} />],
    vibe: ['The vibe', (
      <PinBoard className="collage">
        {d.moodboard.map((m, i) => (
          <figure key={m.id} className="collage-snap" style={{ '--tilt': `${((i * 37) % 9) - 4}deg` }}>
            <span className="pin" aria-hidden />
            <span className="collage-photo" style={{ background: d.theme.palette[i % d.theme.palette.length] }}>
              {m.kind === 'song' ? <Vinyl title={m.title} size={64} /> : <TasteArt name={m.tags.find(hasArt) || 'explorer'} size={60} fill="#fff" />}
            </span>
            <figcaption><b>{m.url ? <a href={m.url} target="_blank" rel="noreferrer">{m.title}</a> : m.title}</b><span>{m.tags.slice(0, 2).join(' · ')}</span></figcaption>
          </figure>
        ))}
      </PinBoard>
    )],
    shop: ['Grab on the way', (
      <ul className="plan">
        {d.shop.map((x) => (
          <li key={x.id}>
            <Icon name={SPOT_ICON[x.kind]} size={16} />
            <span><b>{x.title}</b> <span className="muted">{[x.venue, x.price].filter(Boolean).join(' · ')}</span></span>
            {x.is_demo && <span className="badge demo">demo</span>}
          </li>
        ))}
      </ul>
    )],
  };
  const view = detail && views[detail];

  return (
    <>
      <section className={`envelope-stage ${open ? 'open' : ''}`}>
        <button className="envelope" onClick={() => setOpen(true)} aria-expanded={open} aria-label={open ? 'Envelope, open' : 'Open the envelope'}>
          <span className="env-back" />
          <span className="env-card" style={{ background: ink.bg, color: ink.ink }}>
            <small style={{ color: ink.accent }}>{d.occasion.label}</small>
            <b>{d.theme.name}</b>
          </span>
          <span className="env-pocket" />
          <span className="env-flap" />
          <span className="env-seal"><MascotFace /></span>
          <span className="env-address">
            <span>For {user.display_name.split(' ')[0]} &amp; {Math.max(1, d.guests.length)} more</span>
            <span>{where}{d.city ? `, ${d.city}` : ''}</span>
          </span>
          <span className="env-stamp">{d.theme.from}<small>saves</small></span>
        </button>
        {!open && <p className="env-hint">Tap to open</p>}
      </section>

      {open && (
        <section className="spread" aria-label="What’s inside">
          <p className="spread-head"><span>Inside</span> a {d.theme.name.toLowerCase()}, from {d.theme.from} of your saves</p>
          <div className="spread-cta"><button className="btn btn-primary" onClick={() => setDetail('invite')}><Icon name="note" size={16} /> Send the invite</button></div>
          <div className="spread-grid">
            {items.map((it, i) => (
              <button key={it.key} className={`spread-item it-${it.key}`} style={{ '--d': `${i * 70}ms`, '--t': `${((i * 37) % 7) - 3}deg` }} onClick={() => setDetail(it.key)}>
                {it.node}
                <span className="spread-label">{it.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {view && <Dialog title={view[0]} onClose={() => setDetail(null)} wide={['menu', 'vibe', 'run', 'records', 'guests', 'scene'].includes(detail)}>{view[1]}</Dialog>}
    </>
  );
}

/** The ticket for the night itself. */
function Ticket({ d, when, where }) {
  return (
    <div className="ticket big-ticket" style={{ '--tk': d.theme.palette[d.theme.palette.length - 1] || '#f3e3d8' }}>
      <div className="ticket-main">
        <span className="ticket-kicker">Admit one · {d.occasion.label}</span>
        <h3>{d.theme.name}</h3>
        <p className="sub">{when} · {where}</p>
        <p className="muted small">Dress: {d.invite.dress || 'come as you are'}. First record: {d.playlist.fromSaves[0]?.title || d.playlist.more[0]?.title}.</p>
      </div>
      <div className="ticket-stub"><span className="barcode" aria-hidden /><span className="serial">No. {String(d.theme.from * 7919).padStart(6, '0')}</span></div>
    </div>
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

/** The invitation: a live preview, the details, and the ways to send it. */
function Invite({ invite, when, where, setWhen, setWhere, payload }) {
  return (
    <section className="panel invite-panel">
      <h2><Icon name="note" /> Send the invite</h2>
      <InviteCard invite={invite} when={when} where={where} />
      <div className="form-row">
        <input value={when} onChange={(e) => setWhen(e.target.value)} aria-label="When" />
        <input value={where} onChange={(e) => setWhere(e.target.value)} aria-label="Where" />
      </div>
      <SendInvite payload={payload} />
    </section>
  );
}
