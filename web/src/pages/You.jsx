import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import Icon, { SAVE_ICON } from '../components/Icon.jsx';
import TasteArt from '../components/TasteArt.jsx';
import Mascot from '../components/Mascot.jsx';
import Collage, { Thing } from '../components/Collage.jsx';
import TasteBoard from '../components/TasteBoard.jsx';
import { Vinyl } from '../components/Retro.jsx';
import { uploadPhoto } from '../components/photo.js';
import { isZip, readFromZip } from '../components/unzip.js';
import { useAuth } from '../App.jsx';
import { useActions } from '../components/actions.jsx';
import { clusterVar } from '../components/viz.jsx';
import { Empty, Loading, useApi } from '../components/ui.jsx';

export const SOURCE_LABEL = { spotify: 'Spotify', instagram: 'Instagram', google_maps: 'Google Maps', pinterest: 'Pinterest', manual: 'Added here', tastemate: 'Saved in Next' };
const KIND_LABEL = { song: 'Songs', place: 'Places', look: 'Looks', product: 'Products', art: 'Art', food: 'Food', event: 'Events', other: 'Other' };

// How to get each export. None of these apps let another app read your saves
// directly, but all of them let you download your own data.
// `zip`: the files to pull out of the app's whole download, if that's what's uploaded.
const IMPORTS = [
  { source: 'spotify', icon: 'music', zip: [/YourLibrary\.json$/], how: 'Spotify → Account → Privacy → Download your data. Upload the ZIP or YourLibrary.json, a CSV of liked songs or playlists, or paste “Artist - Song” lines.' },
  { source: 'instagram', icon: 'image', zip: [/saved_collections\.json$/, /saved_posts\.json$/, /saved_music\.json$/], how: 'This is how your saved posts come in. Accounts Centre → Your information and permissions → Download your information → choose Saved, format JSON. Upload the ZIP as it comes.' },
  { source: 'google_maps', icon: 'pin', zip: [/Saved Places\.json$/, /Saved\/[^/]+\.csv$/], how: 'Google Takeout → Saved and Maps (your places). Upload the ZIP, “Saved Places.json” or a list’s CSV.' },
  { source: 'pinterest', icon: 'bookmark', zip: [], how: 'Paste pin titles or board names, one per line.' },
];

// Your saves from every app in one place, the patterns that run across
// them, and the tools to import, add and retag.

// You: your Tastemate character, the way a personality test reads you.
// Who you are, how you roll, the sides of you (with proof), your perfect day,
// where to stretch, and your taste twin. Your raw saves stay tucked away.
export default function You() {
  const { section } = useParams();
  const you = useApi('/you');
  const saves = useApi('/saves');
  const [filter, setFilter] = useState({ kind: null, source: null });
  const reload = () => {
    you.reload();
    saves.reload();
  };
  // While artists are being looked up, check back so the character sharpens.
  useEffect(() => {
    if (!you.data?.lookingUp) return undefined;
    const t = setTimeout(reload, 4000);
    return () => clearTimeout(t);
  }, [you.data]);

  return (
    <Loading state={you}>
      {(d) => {
        if (!section) return <Home d={d} saves={saves.data} />;
        const page = {
          web: d.character && (
            <>
              <TasteWeb web={d.web} name={d.character.name} />
              <Dials dials={d.character.dials} />
            </>
          ),
          connected: d.board?.tastes.length > 0 && (
            <section className="you-section">
              <div className="you-head"><h2>Everything is connected</h2><p>You in the middle, and everything your saves say you love, tied together.</p></div>
              <BoardWithUser board={d.board} character={d.character} />
            </section>
          ),
          world: d.collage && (
            <section className="you-section">
              <div className="you-head"><h2>Your world, in one picture</h2><p>Everything you’ve saved, as the things you’d carry and the room you’d live in.</p></div>
              <CollageWithUser collage={d.collage} title={d.character?.name} />
            </section>
          ),
          sides: d.character && <Sides sides={d.character.sides} />,
          day: <PerfectDay day={d.day} city={d.city} />,
          stretch: d.character && <Stretch tags={d.character.stretch} why={d.character.stretchWhy} />,
          add: (
            <section className="you-section">
              <div className="you-head"><h2>Feed your Tastemate</h2><p>The more you bring in, the sharper your character gets.</p></div>
              <ConnectApps onDone={reload} />
              <div className="saves-tools">
                <Importer onDone={reload} />
                <AddSave onDone={reload} />
              </div>
            </section>
          ),
          saves: saves.data && (
            <section className="you-section">
              <div className="you-head"><h2>Everything you’ve saved</h2><p>{saves.data.saves.length} saves, each broken down into what it says about you.</p></div>
              <SaveList data={saves.data} filter={filter} setFilter={setFilter} onChange={reload} />
            </section>
          ),
        }[section];
        return (
          <div className="you subpage">
            <Link to="/you" className="back-link"><Icon name="back" size={18} /> You</Link>
            {page || <Empty>Nothing here yet. <Link to="/you/add">Bring in a few saves</Link> and it’ll fill in.</Empty>}
            {section !== 'add' && <AddFab />}
          </div>
        );
      }}
    </Loading>
  );
}

/** The floating "add saves" button, so feeding your Tastemate is one tap away. */
function AddFab() {
  return <Link to="/you/add" className="fab"><Icon name="plus" size={20} /> <span>Add saves</span></Link>;
}

/** You, at a glance: your character, then a tile for each part of you to tap into. */
function Home({ d, saves }) {
  const c = d.character;
  const bag = d.collage?.bag.slice(0, 3) || [];
  const tiles = c ? [
    { to: 'web', title: 'Your taste web', sub: 'and how you roll', color: 'var(--glow-1)', art: <MiniWeb web={d.web} /> },
    { to: 'world', title: 'Your bag & room', sub: 'your world in one picture', color: 'var(--glow-2)', art: <span className="tile-things">{bag.map((x) => <Thing key={x.obj} obj={x.obj} size={44} />)}</span> },
    { to: 'connected', title: 'Everything is connected', sub: `${d.board?.tastes.length || 0} tastes, tied together`, color: 'var(--glow-3)', art: <span className="tile-words">{d.board?.tastes.slice(0, 3).map((t) => <b key={t.tag}>{t.tag}</b>)}</span> },
    { to: 'sides', title: 'The sides of you', sub: c.sides.map((sd) => sd.name).slice(0, 2).join(' · '), color: 'var(--glow-4)', art: <TasteArt name={c.sides[0]?.key || c.key} size={52} fill="#8a8178" /> },
    { to: 'day', title: d.city ? `A perfect day in ${d.city}` : 'Your perfect day', sub: d.day.length ? d.day.map((x) => x.slot).join(', ') : 'set your home city', color: 'var(--glow-5)', art: <TasteArt name="Morning" size={52} fill="var(--accent)" /> },
    { to: 'stretch', title: 'Stretch your taste', sub: c.stretch.slice(0, 3).join(', ') || 'a little beyond your usual', color: 'var(--glow-6)', art: <TasteArt name={c.stretch[0] || 'explorer'} size={52} fill="#5d3f6a" /> },
  ] : [];
  return (
    <div className="you home">
      {c ? <Character c={c} signature={(d.board?.tastes || []).slice(0, 3).map((t) => t.tag)} /> : <Welcome />}
      {d.lookingUp > 0 && <p className="notice small">Looking up {d.lookingUp} more artist{d.lookingUp > 1 ? 's' : ''}… your character will sharpen in a moment.</p>}
      <div className="quick">
        <Link to="/you/add" className="quick-btn primary"><Icon name="plus" size={20} /><span>Add saves</span></Link>
        <Link to="/you/saves" className="quick-btn"><Icon name="bookmark" size={20} /><span>{saves ? `${saves.saves.length} saved` : 'Your saves'}</span></Link>
        <Link to="/next" className="quick-btn"><Icon name="pin" size={20} /><span>Go out</span></Link>
        <Link to="/host" className="quick-btn"><Icon name="cup" size={20} /><span>Host</span></Link>
      </div>
      {tiles.length > 0 && (
        <div className="tiles">
          {tiles.map((t) => (
            <Link key={t.to} to={`/you/${t.to}`} className="tile" style={{ '--tile': t.color }}>
              <span className="tile-art">{t.art}</span>
              <span className="tile-text"><b>{t.title}</b><small>{t.sub}</small></span>
              <Icon name="chevron" size={18} className="tile-go" />
            </Link>
          ))}
        </div>
      )}
      <Twin twin={d.twin} />
    </div>
  );
}

// The six sides of the web, in a fixed order round the clock.
const WEB_R = 92;
const webPoint = (i, n, v, r = WEB_R) => {
  const a = -Math.PI / 2 + (i / n) * 2 * Math.PI;
  return [Math.cos(a) * r * v, Math.sin(a) * r * v];
};

/** A tiny web for the tile. */
function MiniWeb({ web }) {
  if (!web) return <TasteArt name="explorer" size={52} fill="var(--accent)" />;
  const pts = web.map((a, i) => webPoint(i, web.length, Math.max(0.12, a.value), 26).join(',')).join(' ');
  return (
    <svg viewBox="-30 -30 60 60" width="60" height="60" aria-hidden>
      {[1, 0.5].map((k) => <polygon key={k} points={web.map((_, i) => webPoint(i, web.length, k, 26).join(',')).join(' ')} fill="none" stroke="#1d1b19" strokeOpacity="0.25" />)}
      <polygon points={pts} fill="var(--accent)" fillOpacity="0.85" />
    </svg>
  );
}

/**
 * Your taste web: one shape, six sides of a life (music, food & drink,
 * nights out, art & culture, style, travel), with what leads each side.
 */
function TasteWeb({ web, name }) {
  const [on, setOn] = useState(null);
  if (!web) return null;
  const n = web.length;
  const shape = web.map((a, i) => webPoint(i, n, Math.max(0.06, a.value)).join(',')).join(' ');
  const top = [...web].sort((a, b) => b.value - a.value)[0];
  return (
    <section className="you-section">
      <div className="you-head">
        <h2>Your taste web</h2>
        <p>Where your taste goes, side by side. {top && <>Your biggest side is <b>{top.label.toLowerCase()}</b>.</>}</p>
      </div>
      <div className="web-card">
        <svg viewBox="-215 -150 430 300" className="web" role="img" aria-label={`${name}'s taste web: ${web.map((a) => `${a.label} ${Math.round(a.value * 100)}%`).join(', ')}`}>
          {[0.25, 0.5, 0.75, 1].map((k) => (
            <polygon key={k} points={web.map((_, i) => webPoint(i, n, k).join(',')).join(' ')} className="web-ring" />
          ))}
          {web.map((a, i) => {
            const [x, y] = webPoint(i, n, 1);
            return <line key={a.key} x1="0" y1="0" x2={x} y2={y} className="web-spoke" />;
          })}
          <polygon points={shape} className="web-shape" />
          {web.map((a, i) => {
            const [x, y] = webPoint(i, n, Math.max(0.06, a.value));
            const [lx, ly] = webPoint(i, n, 1.2);
            const anchor = Math.abs(lx) < 8 ? 'middle' : lx > 0 ? 'start' : 'end';
            return (
              <g key={a.key} className={`web-axis ${on === i ? 'on' : ''}`} tabIndex={0} onMouseEnter={() => setOn(i)} onMouseLeave={() => setOn(null)} onFocus={() => setOn(i)} onBlur={() => setOn(null)}>
                <circle cx={x} cy={y} r="14" fill="transparent" />
                <circle cx={x} cy={y} r={on === i ? 6 : 4.5} className="web-dot" />
                <text x={lx} y={ly} textAnchor={anchor} className="web-label">{a.label}</text>
                {a.top[0] && <text x={lx} y={ly + 14} textAnchor={anchor} className="web-sub">{a.top.join(', ')}</text>}
              </g>
            );
          })}
        </svg>
        <p className="web-tip" aria-live="polite">
          {on != null
            ? <><b>{web[on].label}</b> · {Math.round(web[on].value * 100)}% of your biggest side{web[on].top.length ? <>, led by {web[on].top.join(' and ')}</> : null}</>
            : 'Tap a side to see what leads it.'}
        </p>
        <table className="sr-only">
          <caption>Taste web</caption>
          <tbody>{web.map((a) => <tr key={a.key}><th>{a.label}</th><td>{Math.round(a.value * 100)}%</td><td>{a.top.join(', ')}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function CollageWithUser({ collage, title }) {
  const { user } = useAuth();
  return <Collage collage={collage} name={user.display_name.split(' ')[0]} title={title} />;
}

function BoardWithUser({ board, character }) {
  const { user } = useAuth();
  return <TasteBoard board={board} character={character} avatarUrl={user.avatar_url} name={user.display_name.split(' ')[0]} />;
}

/** Your portrait in the title card's arched frame (or your initial), tap to add or change it. */
function Photo() {
  const { user, refresh } = useAuth();
  const { toast } = useActions();
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      await uploadPhoto(file);
      await refresh();
      toast('Looking good!');
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="portrait">
      <label className="portrait-frame" title={user.avatar_url ? 'Change your photo' : 'Add your photo'}>
        <span>{user.avatar_url ? <img src={user.avatar_url} alt="Your photo" /> : <b className="monogram">{user.display_name[0].toUpperCase()}</b>}</span>
        <input type="file" accept="image/*" onChange={pick} hidden disabled={busy} />
      </label>
      {!user.avatar_url && <span className="portrait-add">{busy ? 'Uploading…' : '+ Add your photo'}</span>}
    </div>
  );
}

function Welcome() {
  return (
    <section className="title-card">
      <Photo />
      <div>
        <p className="tc-eyebrow">Your Tastemate</p>
        <h1>Who are you, taste-wise?</h1>
        <div className="tc-rule" />
        <p className="tc-desc">Bring in what you’ve saved on Spotify, Instagram, Google Maps or Pinterest. We’ll read all of it and tell you who you are, then find you things to do.</p>
        <Link to="/you/add" className="btn btn-primary">Bring in your saves</Link>
      </div>
    </section>
  );
}

function Character({ c, signature = [] }) {
  const navigate = useNavigate();
  const { toast } = useActions();
  const share = async () => {
    const text = `I’m ${c.name}${c.tagline ? `, ${c.tagline}` : ''}. ${c.description || ''} What’s your Tastemate?`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast('Copied. Go and show someone.');
      }
    } catch {
      /* closed the share sheet */
    }
  };
  return (
    <section className="title-card">
      <Photo />
      <div>
        <p className="tc-eyebrow">Your Tastemate · Nº {String(c.saves).padStart(3, '0')}</p>
        <h1>{c.name}</h1>
        {c.tagline && <p className="tc-tagline">{c.tagline}</p>}
        <div className="tc-rule" />
        {c.description && <p className="tc-desc">{c.description}</p>}
        {signature.length > 0 && <p className="tc-signature">{signature.join(' · ')}</p>}
        <p className="tc-apps">Read from {c.saves} saves across {c.apps.map((a) => a.label).join(', ')}.</p>
        <div className="row">
          <button className="btn btn-primary" onClick={() => navigate('/next')}>Take me somewhere <Icon name="arrow" size={18} /></button>
          <button className="btn btn-outline" onClick={share}>Share my Tastemate</button>
        </div>
      </div>
    </section>
  );
}

function Dials({ dials }) {
  if (!dials.length) return null;
  return (
    <section className="you-section">
      <div className="you-head"><h2>How you roll</h2></div>
      <div className="dials">
        {dials.map((d) => (
          <div key={d.left} className="dial">
            <div className="dial-ends"><span className={d.value < 0.5 ? 'on' : ''}>{d.left}</span><span className={d.value > 0.5 ? 'on' : ''}>{d.right}</span></div>
            <div className="dial-track" role="img" aria-label={`${d.label}, between ${d.left} and ${d.right}`}>
              <span className="dial-knob" style={{ left: `${d.value * 100}%` }} />
            </div>
            <b className="dial-label">{d.label}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function Sides({ sides }) {
  if (!sides.length) return null;
  return (
    <section className="you-section">
      <div className="you-head"><h2>The sides of you</h2><p>What your saves keep coming back to.</p></div>
      <div className="sides">
        {sides.map((sd) => (
          <article key={sd.index} className="side-card" style={{ '--c': clusterVar(sd.index) }}>
            <div className="side-top">
              <TasteArt name={sd.key} size={72} fill={clusterVar(sd.index)} />
              <div>
                <span className="side-share">{sd.share}%</span>
                <h3>Your {sd.name}</h3>
              </div>
            </div>
            <p className="side-proof-label">The proof</p>
            <ul className="side-proof">
              {sd.proof.map((p) => (
                <li key={p.id}>
                  <span className="proof-title">{p.kind === 'song' ? <Vinyl title={p.title} size={22} /> : <Icon name={SAVE_ICON[p.kind]} size={14} />} {p.title}{p.creator && !p.title.includes(p.creator) ? <span className="muted"> · {p.creator}</span> : null}</span>
                  <span className="proof-chips">{p.chips.map((ch) => <Chip key={ch.tag} {...ch} />)}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function PerfectDay({ day, city }) {
  if (!city) {
    return (
      <section className="you-section">
        <div className="you-head"><h2>Your perfect day</h2><p>Set your home city on the <Link to="/me">account page</Link> and we’ll plan one.</p></div>
      </section>
    );
  }
  if (!day.length) return null;
  return (
    <section className="you-section">
      <div className="you-head"><h2>Your perfect day in {city}</h2><p>Built from your saves, for this week.</p></div>
      <ol className="day">
        {day.map((d) => (
          <li key={d.slot} className={`day-slot slot-${d.slot.toLowerCase()}`}>
            <TasteArt name={d.slot} size={52} fill="var(--slot)" />
            <div>
              <span className="eyebrow">{d.slot}</span>
              <h3>{d.spot.title}</h3>
              <p className="muted small">{[d.spot.venue, whenOn(d.spot)].filter(Boolean).join(' · ')}</p>
              {d.because.length > 0 && <p className="because">for your love of {d.because.join(' and ')}</p>}
            </div>
          </li>
        ))}
      </ol>
      <Link to="/next" className="btn btn-sm btn-outline">More for this week <Icon name="arrow" size={15} /></Link>
    </section>
  );
}

/** "Sat 31 Oct, 20:00", or "on until 13 Nov" for something already running. */
function whenOn(spot) {
  if (spot.kind !== 'event' || !spot.starts_at) return null;
  const f = (x) => new Date(`${x.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const today = new Date().toISOString().slice(0, 10);
  if (spot.ends_at && spot.starts_at.slice(0, 10) <= today) return `on until ${f(spot.ends_at)}`;
  return `${f(spot.starts_at)}${spot.starts_at.length > 10 ? `, ${spot.starts_at.slice(11, 16)}` : ''}`;
}

function Stretch({ tags, why }) {
  if (!tags.length) return null;
  return (
    <section className="you-section stretch">
      <div className="you-head"><h2>Stretch your taste</h2><p>Your saves keep hinting at these. Go on.</p></div>
      <div className="stretch-cards">
        {tags.map((t) => (
          <Link key={t} to="/next" className="stretch-card">
            <TasteArt name={t} size={48} fill="var(--series-3)" />
            <b>{t}</b>
            {why[t] && <small>{why[t]}</small>}
          </Link>
        ))}
      </div>
    </section>
  );
}

function Twin({ twin }) {
  if (!twin) return null;
  return (
    <section className="you-section">
      <div className="you-head"><h2>Your taste twin</h2></div>
      <Link to="/friends" className="twin">
        <span className="friend-face">
          <Mascot size={58} color="sky" prop={twin.emblem || undefined} tear={false} />
          {twin.avatar_url && <img src={twin.avatar_url} alt="" />}
        </span>
        <span>
          <b>{twin.display_name}</b>{twin.title && <span className="friend-title"> · {twin.title}</span>}
          <br />is {twin.match}% you.
          {twin.shared.length > 0 && <span className="muted"> You both love {twin.shared.join(', ')}.</span>}
        </span>
        <Icon name="chevron" />
      </Link>
    </section>
  );
}

const FACET_ICON = { artist: 'user', sound: 'music', vibe: 'sparkle', place: 'pin', era: 'clock', thing: 'bookmark' };
const FACET_ORDER = ['sound', 'vibe', 'place', 'era', 'thing'];

/** One facet of a save: "neo-soul", "London", "2020s". Hints are dashed. */
function Chip({ tag, facet, tier, via }) {
  return (
    <span className={`chip-facet f-${facet} t-${tier}`} title={via || undefined}>
      <Icon name={FACET_ICON[facet] || 'bookmark'} size={12} /> {tag}
    </span>
  );
}

/** A save broken down: who made it, how it sounds, how it feels, where, when. */
function FacetChips({ facets = {}, creator }) {
  const chips = FACET_ORDER.flatMap((f) => (facets[f] || []).filter((x) => x.tier !== 'possible').slice(0, f === 'thing' ? 3 : 2).map((x) => ({ ...x, facet: f })));
  return (
    <span className="proof-chips">
      {creator && <Chip tag={creator} facet="artist" tier="obvious" />}
      {chips.map((ch) => <Chip key={`${ch.facet}-${ch.tag}`} {...ch} />)}
    </span>
  );
}

const CONNECT_INFO = {
  spotify: { icon: 'music', color: '#9ccf8a', what: 'Your liked songs and saved albums, kept up to date every day.' },
  instagram: { icon: 'image', color: '#f39ab5', what: 'Your own posts, for business and creator accounts. Instagram doesn’t share saved posts with any app, so bring those in from your download below.' },
};

/** "2 hours ago" from SQLite's UTC "YYYY-MM-DD HH:MM:SS". */
function ago(ts) {
  if (!ts) return 'never';
  const s = Math.max(0, (Date.now() - new Date(`${ts.replace(' ', 'T')}Z`).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} days ago`;
}

/** Connect Spotify and Instagram once, and they keep feeding your Tastemate. */
function ConnectApps({ onDone }) {
  const state = useApi('/connect');
  const { toast } = useActions();
  const [busy, setBusy] = useState(null);
  const [params, setParams] = useSearchParams();
  const syncing = state.data?.apps.some((a) => a.syncing);

  // Back from the app: say how it went.
  useEffect(() => {
    const ok = params.get('connected');
    const bad = params.get('connect_error');
    if (!ok && !bad) return;
    const label = (ok || bad)[0].toUpperCase() + (ok || bad).slice(1);
    toast(ok ? `${label} connected. Bringing your library in…` : params.get('reason') === 'declined' ? `${label} wasn’t connected.` : `Couldn’t connect ${label}. Try again?`);
    setParams({}, { replace: true });
  }, []);
  // While a library comes in, check back, then refresh your character.
  useEffect(() => {
    if (!syncing) return undefined;
    const t = setTimeout(() => {
      state.reload();
      onDone();
    }, 2000);
    return () => clearTimeout(t);
  }, [state.data]);

  const act = async (provider, fn, done) => {
    setBusy(provider);
    try {
      const r = await fn();
      if (done) toast(done(r));
      state.reload();
      onDone();
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="panel connect-panel">
      <h2><Icon name="refresh" /> Connect your apps</h2>
      <p className="muted small">Connect once and your Tastemate keeps up on its own. Tastemate only reads; it never posts or changes anything.</p>
      <Loading state={state}>
        {({ apps }) => (
          <ul className="connect-list">
            {apps.map((a) => {
              const info = CONNECT_INFO[a.provider] || {};
              return (
                <li key={a.provider} className="connect-app" style={{ '--app': info.color }}>
                  <span className="connect-icon"><Icon name={info.icon || 'bookmark'} size={22} /></span>
                  <div className="connect-body">
                    <b>{a.label}</b>
                    {a.connected ? (
                      <span className="small">
                        {a.account && <>Connected as <b>{a.account}</b> · </>}
                        {a.syncing ? 'bringing your library in…' : <>{a.saves} saves · synced {ago(a.last_synced_at)}</>}
                      </span>
                    ) : (
                      <span className="muted small">{info.what}</span>
                    )}
                    {a.needs_reconnect && <span className="small warn-text">{a.label} asked to be connected again.</span>}
                    {a.error && <span className="small warn-text">Last sync didn’t work: {a.error}</span>}
                    {!a.available && <span className="muted small">Not switched on for this server yet.{import.meta.env.DEV ? ` Add the ${a.label} keys to .env (see README).` : ''}</span>}
                  </div>
                  <div className="connect-actions">
                    {a.available && (!a.connected || a.needs_reconnect) && (
                      <a className="btn btn-primary btn-sm" href={`/api/connect/${a.provider}/start`}>{a.connected ? 'Connect again' : `Connect ${a.label}`}</a>
                    )}
                    {a.connected && !a.needs_reconnect && (
                      <button className="btn btn-outline btn-sm" disabled={busy === a.provider || a.syncing} onClick={() => act(a.provider, () => api.post(`/connect/${a.provider}/sync`), (r) => (r.error ? r.error : `${r.added} new from ${a.label}`))}>
                        <Icon name="refresh" size={14} /> Sync now
                      </button>
                    )}
                    {a.connected && (
                      <button className="btn btn-ghost btn-sm" disabled={busy === a.provider} onClick={() => act(a.provider, () => api.del(`/connect/${a.provider}`), () => `${a.label} disconnected. Your saves stay.`)}>Disconnect</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Loading>
    </section>
  );
}

function Importer({ onDone }) {
  const [source, setSource] = useState('spotify');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const info = IMPORTS.find((i) => i.source === source);

  // One or more files' contents, imported in turn and added up.
  const send = async (contents) => {
    setBusy(true);
    setMsg(null);
    try {
      const t = { found: 0, added: 0, updated: 0, skipped: 0, lookingUp: 0 };
      for (const content of contents) {
        const r = await api.post('/saves/import', { source, text: content });
        for (const k of Object.keys(t)) t[k] += r[k] || 0;
      }
      setMsg(`Found ${t.found}, added ${t.added}${t.updated ? `, filled in ${t.updated}` : ''}${t.skipped ? ` (${t.skipped} already here)` : ''}.${t.lookingUp ? ` Looking up ${t.lookingUp} artist${t.lookingUp > 1 ? 's' : ''}…` : ''}`);
      setText('');
      onDone();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (isZip(file)) {
      setBusy(true);
      setMsg('Opening the archive…');
      try {
        const found = info.zip.length ? await readFromZip(file, info.zip) : [];
        if (!found.length) return setMsg(`No ${SOURCE_LABEL[source]} saves in that archive. Check it’s the right download, with Saved included.`);
        await send(found.map((f) => f.text));
      } catch (err) {
        setMsg(err.message);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (file.size > 8e6) return setMsg('That file is over 8 MB. Upload the whole ZIP instead and we’ll find the saves in it.');
    send([await file.text()]);
  };

  return (
    <section className="panel">
      <h2><Icon name="upload" /> Or bring in a download</h2>
      <div className="seg seg-full" role="tablist" aria-label="App">
        {IMPORTS.map((i) => (
          <button key={i.source} role="tab" aria-selected={source === i.source} className={source === i.source ? 'on' : ''} onClick={() => setSource(i.source)}>
            <Icon name={i.icon} size={15} /> <span>{SOURCE_LABEL[i.source]}</span>
          </button>
        ))}
      </div>
      <p className="muted small">{info.how}</p>
      <div className="row">
        <label className="btn btn-outline file-btn">
          <Icon name="upload" size={16} /> Choose file
          <input type="file" accept=".zip,.json,.csv,.txt" onChange={onFile} disabled={busy} hidden />
        </label>
        <span className="muted small">or paste below</span>
      </div>
      <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={source === 'spotify' ? 'Miles Davis - So What' : source === 'pinterest' ? 'Minimal wool coat outfit' : 'Paste the file contents'} />
      <div className="row">
        <button className="btn btn-primary btn-sm" disabled={busy || !text.trim()} onClick={() => send([text])}>Import</button>
        {msg && <span className="small">{msg}</span>}
      </div>
    </section>
  );
}

function AddSave({ onDone }) {
  const empty = { title: '', kind: '', city: '', url: '', note: '' };
  const [f, setF] = useState(empty);
  const { toast } = useActions();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    await api.post('/saves', { ...f, kind: f.kind || undefined });
    toast(`Saved ${f.title}`);
    setF(empty);
    onDone();
  };
  return (
    <form className="panel" onSubmit={submit}>
      <h2><Icon name="plus" /> Spotted something?</h2>
      <p className="muted small">A song you heard on the street, a bakery you walked past. Pop it in; we’ll work out what it says about you.</p>
      <input required placeholder="e.g. Tiny natural wine bar, candlelit" value={f.title} onChange={set('title')} />
      <div className="form-row">
        <select value={f.kind} onChange={set('kind')} aria-label="Kind">
          <option value="">Kind: guess</option>
          {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input placeholder="City" value={f.city} onChange={set('city')} />
      </div>
      <input placeholder="Link (optional)" value={f.url} onChange={set('url')} />
      <input placeholder="Note (optional)" value={f.note} onChange={set('note')} />
      <button className="btn btn-primary btn-sm" disabled={!f.title.trim()}>Save</button>
    </form>
  );
}

function SaveList({ data, filter, setFilter, onChange }) {
  const list = data.saves.filter(
    (s) => (!filter.kind || s.kind === filter.kind) && (!filter.source || s.source === filter.source) && (!filter.tag || s.tags.includes(filter.tag))
  );
  const chip = (key, value, label, n) => (
    <button key={value ?? 'all'} className={`chip ${filter[key] === value ? 'on' : ''}`} onClick={() => setFilter((f) => ({ ...f, [key]: value }))}>
      {label}{n != null && <span className="muted"> {n}</span>}
    </button>
  );
  return (
    <section className="shelf-section">

      <div className="chips">
        {chip('kind', null, 'Everything')}
        {Object.entries(data.counts.kind).map(([k, n]) => chip('kind', k, KIND_LABEL[k], n))}
      </div>
      <div className="chips">
        {chip('source', null, 'All apps')}
        {Object.entries(data.counts.source).map(([k, n]) => chip('source', k, SOURCE_LABEL[k], n))}
        {filter.tag && <button className="chip on" onClick={() => setFilter((f) => ({ ...f, tag: null }))}>#{filter.tag} <Icon name="x" size={14} /></button>}
      </div>
      {list.length ? <ul className="save-list">{list.map((s) => <SaveRow key={s.id} save={s} onChange={onChange} />)}</ul> : <Empty>Nothing here.</Empty>}
    </section>
  );
}

function SaveRow({ save, onChange }) {
  const [editing, setEditing] = useState(false);
  const [tags, setTags] = useState(save.tags.join(', '));
  const commit = async () => {
    await api.patch(`/saves/${save.id}`, { tags: tags.split(',') });
    setEditing(false);
    onChange();
  };
  const remove = async () => {
    await api.del(`/saves/${save.id}`);
    onChange();
  };
  return (
    <li className="save-row">
      <span className={`save-icon ${save.kind === 'song' ? 'is-vinyl' : ''}`}>{save.kind === 'song' ? <Vinyl title={save.title} size={38} /> : <Icon name={SAVE_ICON[save.kind]} size={18} />}</span>
      <div className="save-main">
        <b>{save.url ? <a href={save.url} target="_blank" rel="noreferrer">{save.title}</a> : save.title}</b>
        <span className="muted small">{[SOURCE_LABEL[save.source], save.collection].filter(Boolean).join(' · ')}</span>
        {save.links?.length > 0 && !editing && (
          <span className="save-links"><Icon name="graph" size={13} /> Tied to {save.links.map((l, i) => <span key={l.id}>{i ? ', ' : ''}<b>{l.title}</b> <span className="muted">({l.because.join(', ')})</span></span>)}</span>
        )}
        {editing ? (
          <div className="row">
            <input autoFocus value={tags} onChange={(e) => setTags(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit()} placeholder="jazz, intimate, moody" aria-label="Tags, comma separated" />
            <button className="btn btn-sm btn-primary" onClick={commit}>Done</button>
          </div>
        ) : (
          <div className="row facet-row">
            <FacetChips facets={save.facets} creator={save.creator} />
            <button className="tag tag-edit" onClick={() => setEditing(true)}>{save.tags.length ? 'Edit' : '+ Add tags'}</button>
          </div>
        )}
      </div>
      <button className="icon-btn" aria-label={`Delete ${save.title}`} onClick={remove}><Icon name="x" size={16} /></button>
    </li>
  );
}
