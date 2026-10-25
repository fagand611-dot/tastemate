import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import Icon, { SAVE_ICON } from '../components/Icon.jsx';
import TasteArt from '../components/TasteArt.jsx';
import { useActions } from '../components/actions.jsx';
import { clusterVar } from '../components/viz.jsx';
import { Empty, Loading, useApi } from '../components/ui.jsx';

export const SOURCE_LABEL = { spotify: 'Spotify', instagram: 'Instagram', google_maps: 'Google Maps', pinterest: 'Pinterest', manual: 'Added here', tastemate: 'Saved in Next' };
const KIND_LABEL = { song: 'Songs', place: 'Places', look: 'Looks', product: 'Products', art: 'Art', food: 'Food', event: 'Events', other: 'Other' };

// How to get each export. None of these apps let another app read your saves
// directly, but all of them let you download your own data.
const IMPORTS = [
  { source: 'spotify', icon: 'music', how: 'Spotify → Account → Privacy → Download your data. Upload YourLibrary.json, or paste “Artist - Song” lines.' },
  { source: 'instagram', icon: 'image', how: 'Accounts Centre → Download your information → JSON. Upload saved_collections.json (or saved_posts.json). Collection names matter most.' },
  { source: 'google_maps', icon: 'pin', how: 'Google Takeout → Saved (Maps). Upload “Saved Places.json” or a list’s CSV.' },
  { source: 'pinterest', icon: 'bookmark', how: 'Paste pin titles or board names, one per line.' },
];

// Your saves from every app in one place, the patterns that run across
// them, and the tools to import, add and retag.

// You: your Tastemate character, the way a personality test reads you.
// Who you are, how you roll, the sides of you (with proof), your perfect day,
// where to stretch, and your taste twin. Your raw saves stay tucked away.
export default function You() {
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
      {(d) => (
        <div className="you">
          {d.character ? <Character c={d.character} /> : <Welcome />}
          {d.lookingUp > 0 && <p className="notice small">Looking up {d.lookingUp} more artist{d.lookingUp > 1 ? 's' : ''}… your character will sharpen in a moment.</p>}
          {d.character && (
            <>
              <Dials dials={d.character.dials} />
              <Sides sides={d.character.sides} />
              <PerfectDay day={d.day} city={d.city} />
              <Stretch tags={d.character.stretch} why={d.character.stretchWhy} />
              <Twin twin={d.twin} />
            </>
          )}

          <section className="you-section">
            <div className="you-head">
              <h2>Feed your Tastemate</h2>
              <p>The more you bring in, the sharper your character gets.</p>
            </div>
            <div className="saves-tools">
              <Importer onDone={reload} />
              <AddSave onDone={reload} />
            </div>
          </section>

          {saves.data?.saves.length > 0 && (
            <details className="drawer">
              <summary><Icon name="bookmark" size={18} /> Everything you’ve saved <span className="muted">{saves.data.saves.length}</span><Icon name="down" size={16} className="chev" /></summary>
              <SaveList data={saves.data} filter={filter} setFilter={setFilter} onChange={reload} />
            </details>
          )}
        </div>
      )}
    </Loading>
  );
}

function Welcome() {
  return (
    <section className="character hero-empty">
      <div className="character-art"><TasteArt name="explorer" size={120} fill="var(--series-1)" /></div>
      <div className="character-body">
        <p className="eyebrow">Meet your Tastemate</p>
        <h1>Who are you, taste-wise?</h1>
        <p className="character-desc">Bring in what you’ve saved on Spotify, Instagram, Google Maps or Pinterest. We’ll read all of it and tell you who you are, then find you things to do.</p>
      </div>
    </section>
  );
}

function Character({ c }) {
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
    <section className="character">
      <div className="character-blobs" aria-hidden>
        {c.sides.map((sd) => <span key={sd.index} className={`blob b${sd.index}`} style={{ background: clusterVar(sd.index) }} />)}
      </div>
      <div className="character-art" aria-hidden><TasteArt name={c.key} size={132} fill="var(--series-1)" className="wobble" /></div>
      <div className="character-body">
        <p className="eyebrow">Meet your Tastemate</p>
        <h1>{c.name}</h1>
        {c.tagline && <p className="character-tagline">{c.tagline}</p>}
        {c.description && <p className="character-desc">{c.description}</p>}
        <p className="character-apps">Read from {c.saves} saves across {c.apps.map((a) => a.label).join(', ')}.</p>
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
                  <span className="proof-title"><Icon name={SAVE_ICON[p.kind]} size={14} /> {p.title}{p.creator && !p.title.includes(p.creator) ? <span className="muted"> · {p.creator}</span> : null}</span>
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
        <span className="avatar-lg">{twin.display_name[0].toUpperCase()}</span>
        <span>
          <b>{twin.display_name}</b> is {twin.match}% you.
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

function Importer({ onDone }) {
  const [source, setSource] = useState('spotify');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const info = IMPORTS.find((i) => i.source === source);

  const send = async (content) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.post('/saves/import', { source, text: content });
      setMsg(`Found ${r.found}, added ${r.added}${r.skipped ? ` (${r.skipped} already here)` : ''}.${r.lookingUp ? ` Looking up ${r.lookingUp} artist${r.lookingUp > 1 ? 's' : ''}…` : ''}`);
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
    if (file.size > 8e6) return setMsg('That file is over 8 MB. Pick the saves file from inside the export, not the whole archive.');
    send(await file.text());
  };

  return (
    <section className="panel">
      <h2><Icon name="upload" /> Bring in your saves</h2>
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
          <input type="file" accept=".json,.csv,.txt" onChange={onFile} disabled={busy} hidden />
        </label>
        <span className="muted small">or paste below</span>
      </div>
      <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={source === 'spotify' ? 'Miles Davis - So What' : source === 'pinterest' ? 'Minimal wool coat outfit' : 'Paste the file contents'} />
      <div className="row">
        <button className="btn btn-primary btn-sm" disabled={busy || !text.trim()} onClick={() => send(text)}>Import</button>
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
      <span className="save-icon"><Icon name={SAVE_ICON[save.kind]} size={18} /></span>
      <div className="save-main">
        <b>{save.url ? <a href={save.url} target="_blank" rel="noreferrer">{save.title}</a> : save.title}</b>
        <span className="muted small">{[SOURCE_LABEL[save.source], save.collection].filter(Boolean).join(' · ')}</span>
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
