import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../api.js';
import Icon, { SAVE_ICON, SPOT_ICON } from '../components/Icon.jsx';
import { useActions } from '../components/actions.jsx';
import { Empty, Loading, PageHead, useApi } from '../components/ui.jsx';
import { Dialog, WhyFlow } from '../components/viz.jsx';
import TasteArt, { hasArt } from '../components/TasteArt.jsx';

const iso = (d) => d.toISOString().slice(0, 10);
const plus = (n) => iso(new Date(Date.now() + n * 864e5));

// Quick date ranges. A trip uses the date inputs instead.
const WHEN = {
  tomorrow: { label: 'Tomorrow', range: () => [plus(1), plus(1)] },
  weekend: {
    label: 'This weekend',
    range: () => {
      const d = new Date().getDay(); // 0 Sun … 6 Sat
      const toSat = d === 0 ? -1 : 6 - d;
      return [plus(Math.max(0, toSat)), plus(toSat + 1)];
    },
  },
  fortnight: { label: 'Next 2 weeks', range: () => [plus(0), plus(14)] },
  trip: { label: 'Trip dates', range: null },
};

const KIND_LABEL = { event: 'Worth leaving the house for', place: 'Spots with your name on them', product: 'Little things you’d love' };
const KIND_SUB = {
  event: 'On while you’re there, picked from what you save',
  place: 'Places that fit you, including ones that just opened',
  product: 'In shops nearby, or happy to ship to you',
};

// Next: pick a city and dates, get events, places and products ranked by
// everything you've saved, with your own saves as the explanation.
export default function Next() {
  const [city, setCity] = useState(null); // null = server default (home city)
  const [when, setWhen] = useState('fortnight');
  const [trip, setTrip] = useState([plus(7), plus(12)]);
  const [from, to] = when === 'trip' ? trip : WHEN[when].range();
  const state = useApi(`/next${qs({ city, from, to })}`);
  const { toast } = useActions();

  const act = async (spot, action) => {
    if (action === 'save') await api.post(`/spots/${spot.id}/save`);
    else if (action === 'unsave') await api.del(`/spots/${spot.id}/save`);
    else await api.post(`/spots/${spot.id}/dismiss`);
    toast(action === 'save' ? `Saved ${spot.title}` : action === 'unsave' ? 'Removed from your plan' : 'Got it, fewer like this');
    state.reload();
  };

  const setHome = async (c) => {
    await api.put('/settings', { home_city: c });
    toast(`${c} is now your home city`);
    state.reload();
  };

  return (
    <>
      <PageHead title="Where to next?" intro="Things to do, see and buy, picked from everything you’ve saved.">
        <Link to="/host" className="btn btn-outline"><Icon name="cup" size={18} /> Staying in?</Link>
      </PageHead>
      <Loading state={state}>
        {(d) => (
          <>
            <div className="next-controls">
              <label className="field">
                <span className="label">Where</span>
                <select value={d.city ?? 'anywhere'} onChange={(e) => setCity(e.target.value)}>
                  {d.cities.map((c) => <option key={c} value={c}>{c}{c === d.homeCity ? ' (home)' : ''}</option>)}
                  <option value="anywhere">Anywhere</option>
                </select>
              </label>
              <div className="field">
                <span className="label">When</span>
                <div className="seg" role="radiogroup" aria-label="When">
                  {Object.entries(WHEN).map(([k, w]) => (
                    <button key={k} role="radio" aria-checked={when === k} className={when === k ? 'on' : ''} onClick={() => setWhen(k)}>{w.label}</button>
                  ))}
                </div>
              </div>
              {when === 'trip' && (
                <div className="row trip-dates">
                  <input type="date" aria-label="From" value={trip[0]} onChange={(e) => setTrip([e.target.value, trip[1] < e.target.value ? e.target.value : trip[1]])} />
                  <span className="muted">to</span>
                  <input type="date" aria-label="To" min={trip[0]} value={trip[1]} onChange={(e) => setTrip([trip[0], e.target.value])} />
                </div>
              )}
              {d.city && d.city !== d.homeCity && (
                <button className="btn btn-sm btn-ghost" onClick={() => setHome(d.city)}><Icon name="home" size={16} /> Make {d.city} home</button>
              )}
            </div>

            <PostToEvent cities={d.cities} canRefresh={d.canRefreshPosts} onAdded={state.reload} />

            {d.profileSize === 0 && (
              <p className="notice">Nothing to go on yet. <Link to="/you">Feed your Tastemate</Link> with saves from Spotify, Instagram or Google Maps and this page fills up.</p>
            )}

            {d.yourSaves.length > 0 && (
              <section className="panel remember">
                <h2><Icon name="bookmark" /> Don’t forget, you saved these</h2>
                <p className="muted small">From your own lists for {d.city}. Easy to lose track of when you’re planning.</p>
                <ul className="save-chips">
                  {d.yourSaves.map((s) => (
                    <li key={s.id}>
                      <Icon name={SAVE_ICON[s.kind]} size={15} />
                      {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}
                      {s.collection && <span className="muted"> · {s.collection}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {['event', 'place', 'product'].map((kind) => {
              const list = d[`${kind}s`];
              return (
                <section key={kind} className="shelf-section">
                  <div className="shelf-head">
                    <div>
                      <h2><Icon name={SPOT_ICON[kind]} /> {KIND_LABEL[kind]}</h2>
                      <p className="shelf-sub">{KIND_SUB[kind]}</p>
                    </div>
                  </div>
                  {list.length ? (
                    <div className="grid">{list.map((x) => <SpotCard key={x.spot.id} {...x} onAct={act} />)}</div>
                  ) : (
                    <Empty>{kind === 'event' ? 'No matching events in these dates. Try a wider range.' : 'Nothing matching here yet.'}</Empty>
                  )}
                </section>
              );
            })}

            {d.stretch?.length > 0 && (
              <section className="shelf-section">
                <div className="shelf-head">
                  <div>
                    <h2><Icon name="sparkle" /> Something a little different</h2>
                    <p className="shelf-sub">Your saves keep hinting at these. Worth a go?</p>
                  </div>
                </div>
                <div className="grid">{d.stretch.map((x) => <SpotCard key={x.spot.id} {...x} onAct={act} />)}</div>
              </section>
            )}

            {d.saved.length > 0 && (
              <section className="shelf-section">
                <div className="shelf-head"><h2><Icon name="check" /> Your plan so far</h2></div>
                <ul className="plan">
                  {d.saved.map((s) => (
                    <li key={s.id}>
                      <Icon name={SPOT_ICON[s.spot.kind]} size={16} />
                      <span><b>{s.spot.title}</b> <span className="muted">{spotWhen(s.spot) || s.spot.venue}</span></span>
                      <button className="icon-btn" aria-label="Remove" onClick={() => act(s.spot, 'unsave')}><Icon name="x" size={16} /></button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </Loading>
    </>
  );
}

const EMPTY_DRAFT = { title: '', starts_at: '', city: '', venue: '', price: '', tags: [], url: '', description: '' };

/**
 * Small venues announce on Instagram and Facebook first. Paste a post (or
 * its link and caption) and it becomes an event you and your friends see.
 */
function PostToEvent({ cities, canRefresh, onAdded }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [draft, setDraft] = useState(null);
  const [msg, setMsg] = useState(null);
  const { toast } = useActions();
  const set = (k) => (e) => setDraft({ ...draft, [k]: k === 'tags' ? e.target.value.split(',') : e.target.value });

  const read = async () => {
    setMsg(null);
    try {
      setDraft({ ...EMPTY_DRAFT, ...(await api.post('/spots/from-post', { text, url })).draft });
    } catch (e) {
      setMsg(e.message);
    }
  };
  const save = async (e) => {
    e.preventDefault();
    try {
      const { spot } = await api.post('/spots', { ...draft, tags: draft.tags.map((t) => t.trim()).filter(Boolean) });
      toast(`Added ${spot.title} to your plan`);
      setDraft(null);
      setText('');
      setUrl('');
      setOpen(false);
      onAdded();
    } catch (err) {
      setMsg(err.message);
    }
  };
  const refresh = async () => {
    setMsg('Checking the venues you follow…');
    try {
      const r = await api.post('/spots/refresh-posts');
      setMsg(`${r.posts} posts read, ${r.added} new events.${r.errors.length ? ` Problems: ${r.errors.map((x) => `@${x.account}: ${x.error}`).join('; ')}` : ''}`);
      onAdded();
    } catch (err) {
      setMsg(err.message);
    }
  };

  if (!open) {
    return (
      <div className="row post-cta">
        <button className="btn btn-sm btn-outline" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> Spotted an event online? Add it</button>
        {canRefresh && <button className="btn btn-sm btn-ghost" onClick={refresh}><Icon name="refresh" size={16} /> Check venues I follow</button>}
        {msg && <span className="small">{msg}</span>}
      </div>
    );
  }
  return (
    <section className="panel post-panel">
      <h2><Icon name="ticket" /> Add an event from a post</h2>
      {!draft ? (
        <>
          <p className="muted small">Copy the caption from a venue’s Instagram or Facebook post. We’ll pick out the date, time, venue, city and price.</p>
          <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={'JAZZ & COMEDY NIGHT\nFri 14 Nov, doors 8pm at The Workman’s Club, Dublin. €12'} />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link to the post (optional)" />
          <div className="row">
            <button className="btn btn-sm btn-primary" disabled={!text.trim()} onClick={read}>Read post</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            {msg && <span className="small error">{msg}</span>}
          </div>
        </>
      ) : (
        <form onSubmit={save} className="draft-form">
          {draft.missing?.length > 0 && <p className="notice small">Couldn’t find: {draft.missing.map((m) => m.replace('starts_at', 'date')).join(', ')}. Fill them in below.</p>}
          <label>Title<input required value={draft.title} onChange={set('title')} /></label>
          <div className="form-row">
            <label>Date and time<input required type={draft.starts_at.includes('T') ? 'datetime-local' : 'date'} value={draft.starts_at} onChange={set('starts_at')} /></label>
            <label>City
              <input required list="next-cities" value={draft.city || ''} onChange={set('city')} />
              <datalist id="next-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
            </label>
          </div>
          <div className="form-row">
            <label>Venue<input value={draft.venue || ''} onChange={set('venue')} /></label>
            <label>Price<input value={draft.price || ''} onChange={set('price')} /></label>
          </div>
          <label>Tags<input value={draft.tags.join(', ')} onChange={set('tags')} placeholder="jazz, comedy, intimate" /></label>
          <div className="row">
            <button className="btn btn-sm btn-primary">Save event</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setDraft(null)}>Back</button>
            {msg && <span className="small error">{msg}</span>}
          </div>
        </form>
      )}
    </section>
  );
}

function spotWhen(s) {
  if (s.kind !== 'event' || !s.starts_at) return null;
  const f = (x) => new Date(`${x.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  // starts_at may carry a time: "2026-11-14T20:00".
  const time = s.starts_at.length > 10 ? `, ${s.starts_at.slice(11, 16)}` : '';
  return s.ends_at ? `${f(s.starts_at)} – ${f(s.ends_at)}` : `${f(s.starts_at)}${time}`;
}

function SpotCard({ spot, match, reasons, onAct }) {
  const [busy, setBusy] = useState(false);
  const [why, setWhy] = useState(false);
  const go = async (a) => {
    setBusy(true);
    try {
      await onAct(spot, a);
    } finally {
      setBusy(false);
    }
  };
  const when = spotWhen(spot);
  return (
    <article className="card spot-card">
      <div className={`spot-top g${hueFor(spot.title) % 5}`}>
        <span className="spot-kind"><Icon name={SPOT_ICON[spot.kind]} size={15} /> {spot.kind}</span>
        <span className="spot-sticker"><TasteArt name={spot.tags.find(hasArt) || 'explorer'} size={70} fill="#fff" /></span>
        <span className="match">{match}% match</span>
      </div>
      <div className="card-body">
        <div className="card-meta">
          {when && <span className="badge status"><Icon name="clock" size={12} /> {when}</span>}
          {spot.price && <span className="badge">{spot.price}</span>}
          {spot.is_demo && <span className="badge demo" title="Sample data, not a real listing">demo</span>}
        </div>
        <h3>{spot.url ? <a href={spot.url} target="_blank" rel="noreferrer">{spot.title}</a> : spot.title}</h3>
        <p className="sub">{[spot.venue, spot.city || 'Online'].filter(Boolean).join(' · ')}</p>
        {spot.description && <p className="desc">{spot.description}</p>}
        <SpotReasons reasons={reasons} compact />
        <div className="actions">
          <button disabled={busy} className="btn btn-sm btn-outline" onClick={() => go('save')}><Icon name="plus" size={16} /> Save</button>
          <button className="btn btn-sm btn-ghost why-btn" onClick={() => setWhy(true)}><Icon name="graph" size={16} /> Why?</button>
          <button disabled={busy} className="icon-btn" aria-label="Not for me" title="Not for me" onClick={() => go('dismiss')}><Icon name="x" size={18} /></button>
        </div>
      </div>
      {why && (
        <Dialog title={`Why ${spot.title}?`} onClose={() => setWhy(false)}>
          <p className="muted small">How your saves led here. The wider the stream, the more of your saves.</p>
          <WhyFlow spot={spot} match={match} reasons={reasons} />
          <SpotReasons reasons={reasons} />
        </Dialog>
      )}
    </article>
  );
}

function SpotReasons({ reasons, compact }) {
  if (!reasons?.length) return null;
  // On a card: one friendly line per reason. The full detail lives behind "Why?".
  if (compact) {
    const ev = reasons.find((r) => r.type === 'saves')?.evidence || [];
    const lines = [];
    const st = reasons.find((r) => r.type === 'stretch');
    if (st) lines.push(['sparkle', <>A stretch for you: <b>{st.tags.join(', ') || 'something new'}</b></>]);
    if (ev[0]) {
      const n = ev[0].sources.reduce((a, x) => a + x.n, 0);
      lines.push(['sparkle', <><b>{ev[0].tag}</b>{ev[1] ? <> &amp; <b>{ev[1].tag}</b></> : null} · {n} of your saves</>]);
    }
    const tags = reasons.find((r) => r.type === 'tags');
    if (!ev[0] && tags) lines.push(['sparkle', <>Fits your <b>{tags.tags.slice(0, 2).join(' & ')}</b></>]);
    const fr = reasons.find((r) => r.type === 'friends');
    if (fr) lines.push(['users', <>{fr.names.join(', ')} saved it</>, 'friend']);
    const creator = reasons.find((r) => r.type === 'creator');
    if (creator) lines.push(['heart', <>Features <b>{creator.name}</b></>]);
    const nw = reasons.find((r) => r.type === 'new');
    if (nw) lines.push(['clock', <>Just opened</>]);
    else if (reasons.some((r) => r.type === 'gem')) lines.push(['star', <>Under the radar</>]);
    return (
      <ul className="reasons">
        {lines.slice(0, 3).map(([icon, text, cls], i) => <li key={i} className={cls}><Icon name={icon} size={14} /> <span>{text}</span></li>)}
      </ul>
    );
  }
  return (
    <ul className="reasons">
      {reasons.map((r, i) => {
        if (r.type === 'saves') {
          return r.evidence.slice(0, 2).map((e) => (
            <li key={`${i}-${e.tag}`}>
              <Icon name="sparkle" size={14} />
              <span><b>{e.tag}</b>: {e.sources.map((s) => `${s.n} on ${s.label}`).join(', ')}{e.maybe ? `, ${e.maybe} more could be` : ''}
                {e.examples[0] && <span className="muted"> · like “{e.examples[0]}”</span>}</span>
            </li>
          ));
        }
        if (r.type === 'creator') return <li key={i}><Icon name="heart" size={14} /> <span>Features <b>{r.name}</b>, who you saved</span></li>;
        if (r.type === 'tags') return <li key={i}><Icon name="sparkle" size={14} /> <span>Fits your taste for <b>{r.tags.join(', ')}</b></span></li>;
        if (r.type === 'friends') return <li key={i} className="friend"><Icon name="users" size={14} /> <span>{r.names.join(', ')} saved it</span></li>;
        if (r.type === 'new') return <li key={i}><Icon name="clock" size={14} /> <span>Just opened{r.days > 0 ? `, ${r.days} days ago` : ''}</span></li>;
        if (r.type === 'stretch') return <li key={i}><Icon name="sparkle" size={14} /> <span>A stretch: <b>{r.tags.join(', ') || 'something new'}</b>{r.why ? <span className="muted"> · {r.why}</span> : null}</span></li>;
        if (r.type === 'gem') return <li key={i}><Icon name="star" size={14} /> <span>Under the radar: you wouldn’t see it pushed elsewhere</span></li>;
        return null;
      })}
    </ul>
  );
}

function hueFor(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}
