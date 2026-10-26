import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { InviteCard } from '../components/InviteCard.jsx';
import { MascotFace } from '../components/Mascot.jsx';
import { Vinyl } from '../components/Retro.jsx';
import { useApi } from '../components/ui.jsx';

// What a guest sees when they open an invite link: the invitation, the
// evening's details, and three buttons. No account needed.
export default function InvitePage() {
  const { token } = useParams();
  const state = useApi(`/invites/${token}`);
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem('tm-guest-name') || '';
    } catch {
      return '';
    }
  });
  const [note, setNote] = useState('');
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);

  const answer = async (a) => {
    setError(null);
    if (!name.trim()) return setError('Add your name first, so they know who’s coming.');
    try {
      await api.post(`/invites/${token}/rsvp`, { name: name.trim(), answer: a, note });
      try {
        localStorage.setItem('tm-guest-name', name.trim());
      } catch {
        /* private window */
      }
      setDone(a);
      state.reload();
    } catch (e) {
      setError(e.message);
    }
  };

  if (state.error) return <div className="guest-page"><p className="guest-gone">{state.error.message}</p></div>;
  if (!state.data) return <div className="guest-page"><div className="skeleton"><span /><span /></div></div>;
  const { invite, host, going, counts } = state.data;

  return (
    <div className="guest-page" style={{ '--g-bg': invite.colors.bg, '--g-ink': invite.colors.ink, '--g-accent': invite.colors.accent }}>
      <header className="guest-head">
        {host.avatar_url ? <img src={host.avatar_url} alt="" className="guest-host" /> : <span className="guest-host"><MascotFace size={34} /></span>}
        <p><b>{host.name}</b> invited you</p>
      </header>

      <InviteCard invite={invite} when={invite.when} where={invite.where} className="guest-card" />

      {(invite.palette.length > 0 || invite.records.length > 0 || invite.menu.length > 0) && (
        <section className="guest-details">
          {invite.palette.length > 0 && (
            <div>
              <p className="label">Wear these colours</p>
              <div className="swatches big">{invite.palette.map((c) => <span key={c} style={{ background: c }} />)}</div>
            </div>
          )}
          {invite.menu.length > 0 && (
            <div>
              <p className="label">On the table</p>
              <ul className="guest-menu">{invite.menu.map((m) => <li key={m}>{m}</li>)}</ul>
            </div>
          )}
          {invite.records.length > 0 && (
            <div>
              <p className="label">On the turntable</p>
              <ul className="guest-records">{invite.records.map((r) => <li key={r}><Vinyl title={r} size={28} /> {r}</li>)}</ul>
            </div>
          )}
        </section>
      )}

      <section className="guest-rsvp">
        {done ? (
          <p className="guest-done">{done === 'yes' ? 'See you there!' : done === 'maybe' ? 'Noted: maybe. You can change it any time.' : 'Shame! They’ll miss you.'} <button className="btn-link" onClick={() => setDone(null)}>Change</button></p>
        ) : (
          <>
            <p className="label">Are you coming?</p>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" maxLength={60} />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="A note for the host (optional)" aria-label="Note" maxLength={200} />
            <div className="guest-answers">
              <button className="btn btn-primary" onClick={() => answer('yes')}>I’m in</button>
              <button className="btn btn-outline" onClick={() => answer('maybe')}>Maybe</button>
              <button className="btn btn-ghost" onClick={() => answer('no')}>Can’t make it</button>
            </div>
            {error && <p className="error small">{error}</p>}
          </>
        )}
        {counts.yes > 0 && <p className="muted small">{going.slice(0, 8).join(', ')}{going.length > 8 ? ` and ${going.length - 8} more` : ''} {counts.yes === 1 ? 'is' : 'are'} coming{counts.maybe ? `, ${counts.maybe} maybe` : ''}.</p>}
      </section>

      <footer className="guest-foot">Made with <b>tastemate.</b></footer>
    </div>
  );
}
