import { useState } from 'react';
import { api } from '../api.js';
import Icon from './Icon.jsx';
import { useActions } from './actions.jsx';

// The invitation: the same card in Host's preview and on the page guests
// open, and the panel that turns it into a link to send.

export const MOTIFS = {
  record: <><circle cx="50" cy="50" r="40" /><circle cx="50" cy="50" r="28" /><circle cx="50" cy="50" r="6" /></>,
  candle: <><path d="M44 40h12v50H44z" /><path d="M50 14c6 8 6 14 0 20-6-6-6-12 0-20z" /></>,
  grid: <><path d="M10 10h80v80H10zM36 10v80M64 10v80M10 36h80M10 64h80" /></>,
  sun: <><circle cx="50" cy="50" r="18" /><path d="M50 10v14M50 76v14M10 50h14M76 50h14M22 22l10 10M68 68l10 10M78 22 68 32M32 68 22 78" /></>,
  arc: <><path d="M10 90a40 40 0 0 1 80 0" /><path d="M24 90a26 26 0 0 1 52 0" /></>,
};

/** The card itself, in the theme's type, colours and motif. */
export function InviteCard({ invite, when, where, className = '' }) {
  return (
    <div className={`invite type-${invite.type} ${className}`} style={{ '--bg': invite.colors.bg, '--ink': invite.colors.ink, '--accent': invite.colors.accent }}>
      <svg className="invite-motif" viewBox="0 0 100 100" aria-hidden>{MOTIFS[invite.motif] || MOTIFS.arc}</svg>
      <p className="invite-line">{invite.line}</p>
      <h3>{invite.headline}</h3>
      <p className="invite-when">{when}{where ? <><br />{where}</> : null}</p>
      {invite.dress && <p className="invite-dress">Dress: {invite.dress}</p>}
    </div>
  );
}

/** The invitation as a 1080×1350 image, for Instagram and anywhere a picture travels better than a link. */
export async function inviteImage(invite, when, where) {
  await document.fonts?.ready;
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const { bg, ink, accent } = invite.colors;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  // The motif, drawn from the same shapes as the card.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="${accent}" stroke-width="2.2">${MOTIF_SVG[invite.motif] || MOTIF_SVG.arc}</svg>`;
  const img = await new Promise((resolve) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  if (img) ctx.drawImage(img, W - 140 - 420, 120, 420, 420);
  const left = 120;
  let y = 760;
  ctx.textAlign = 'left';
  ctx.fillStyle = accent;
  ctx.font = '600 30px Jost, Futura, sans-serif';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
  ctx.fillText((invite.line || '').toUpperCase(), left, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.fillStyle = ink;
  ctx.font = invite.type === 'serif-italic' ? 'italic 500 92px "Playfair Display", Georgia, serif' : invite.type === 'display' ? '800 92px Jost, Futura, sans-serif' : '600 92px Jost, Futura, sans-serif';
  const words = invite.headline.split(/\s+/);
  let line = '';
  y += 110;
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > W - 2 * left && line) {
      ctx.fillText(line, left, y);
      y += 100;
      line = w;
    } else line = next;
  }
  ctx.fillText(line, left, y);
  ctx.font = '400 40px "DM Sans", system-ui, sans-serif';
  y += 90;
  ctx.fillText(when || '', left, y);
  if (where) ctx.fillText(where, left, (y += 54));
  if (invite.dress) {
    ctx.globalAlpha = 0.8;
    ctx.font = 'italic 500 32px "Playfair Display", Georgia, serif';
    ctx.fillText(`Dress: ${invite.dress}`, left, (y += 70));
    ctx.globalAlpha = 1;
  }
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  return new File([blob], 'invitation.png', { type: 'image/png' });
}

// The motifs as plain SVG markup, for drawing onto the image.
const MOTIF_SVG = {
  record: '<circle cx="50" cy="50" r="40"/><circle cx="50" cy="50" r="28"/><circle cx="50" cy="50" r="6"/>',
  candle: '<path d="M44 40h12v50H44z"/><path d="M50 14c6 8 6 14 0 20-6-6-6-12 0-20z"/>',
  grid: '<path d="M10 10h80v80H10zM36 10v80M64 10v80M10 36h80M10 64h80"/>',
  sun: '<circle cx="50" cy="50" r="18"/><path d="M50 10v14M50 76v14M10 50h14M76 50h14M22 22l10 10M68 68l10 10M78 22 68 32M32 68 22 78"/>',
  arc: '<path d="M10 90a40 40 0 0 1 80 0"/><path d="M24 90a26 26 0 0 1 52 0"/>',
};

const ANSWER = { yes: 'Coming', maybe: 'Maybe', no: 'Can’t make it' };

/**
 * Send it: make (or update) the invite link, then hand it to WhatsApp,
 * email, text, or the phone's share sheet (Instagram, Messenger, anything),
 * with the image for apps that prefer pictures. Shows who's answered.
 */
export function SendInvite({ payload }) {
  const { toast } = useActions();
  const [token, setToken] = useState(null);
  const [sent, setSent] = useState(null); // the payload the link currently shows
  const [busy, setBusy] = useState(false);
  const [replies, setReplies] = useState(null);
  const url = token ? `${window.location.origin}/i/${token}` : null;
  const changed = token && JSON.stringify(sent) !== JSON.stringify(payload);
  const message = `${payload.line || 'You’re invited'}: ${payload.headline}. ${payload.when}${payload.where ? `, ${payload.where}` : ''}.`;

  const ensure = async () => {
    if (token && !changed) return url;
    setBusy(true);
    try {
      const r = token ? await api.put(`/invites/${token}`, payload) : await api.post('/invites', payload);
      setToken(r.token);
      setSent(payload);
      return `${window.location.origin}/i/${r.token}`;
    } finally {
      setBusy(false);
    }
  };
  const open = async (make) => {
    try {
      const link = await ensure();
      window.open(make(link), '_blank', 'noopener');
    } catch (e) {
      toast(e.message);
    }
  };
  const shareSheet = async () => {
    try {
      const link = await ensure();
      const file = await inviteImage(payload, payload.when, payload.where);
      const data = { title: payload.headline, text: `${message} Say if you’re coming: ${link}` };
      if (navigator.canShare?.({ ...data, files: [file] })) await navigator.share({ ...data, files: [file] });
      else if (navigator.share) await navigator.share({ ...data, url: link });
      else {
        // No share sheet (most desktops): save the picture and copy the link, to paste into Instagram or anywhere.
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        await navigator.clipboard?.writeText(link).catch(() => {});
        toast('Invitation saved as a picture, link copied. Post or send them anywhere.');
      }
    } catch (e) {
      if (e.name !== 'AbortError') toast(e.message);
    }
  };
  const copy = async () => {
    try {
      const link = await ensure();
      await navigator.clipboard.writeText(link);
      toast('Link copied');
    } catch (e) {
      toast(e.message);
    }
  };
  const loadReplies = async () => {
    if (!token) return;
    setReplies((await api.get(`/invites/${token}`)).rsvps || []);
  };

  return (
    <div className="send-invite">
      <p className="label">Send it</p>
      <p className="muted small">Guests get a link to the invitation and say if they’re coming. No app or account needed.</p>
      <div className="share-row">
        <button className="share-btn wa" disabled={busy} onClick={() => open((l) => `https://wa.me/?text=${encodeURIComponent(`${message}\n\nSay if you’re coming: ${l}`)}`)}><Icon name="note" size={16} /> WhatsApp</button>
        <button className="share-btn ig" disabled={busy} onClick={shareSheet}><Icon name="image" size={16} /> Instagram &amp; more</button>
        <button className="share-btn" disabled={busy} onClick={() => open((l) => `mailto:?subject=${encodeURIComponent(payload.headline)}&body=${encodeURIComponent(`${message}\n\nSay if you’re coming: ${l}`)}`)}><Icon name="bell" size={16} /> Email</button>
        <button className="share-btn" disabled={busy} onClick={() => open((l) => `sms:?&body=${encodeURIComponent(`${message} ${l}`)}`)}><Icon name="users" size={16} /> Text</button>
        <button className="share-btn" disabled={busy} onClick={copy}><Icon name="check" size={16} /> Copy link</button>
      </div>
      {url && (
        <p className="small invite-link">
          {changed ? 'Changes will go to the same link when you send again. ' : ''}
          <a href={url} target="_blank" rel="noreferrer">{url.replace(/^https?:\/\//, '')}</a> ·{' '}
          <button className="btn-link" onClick={loadReplies}>See who’s coming</button>
        </p>
      )}
      {replies && (
        replies.length ? (
          <ul className="replies">
            {replies.map((r) => <li key={r.name} className={`a-${r.answer}`}><b>{r.name}</b> <span>{ANSWER[r.answer]}</span>{r.note && <em> “{r.note}”</em>}</li>)}
          </ul>
        ) : <p className="muted small">No answers yet.</p>
      )}
    </div>
  );
}
