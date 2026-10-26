import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import Icon from '../components/Icon.jsx';
import { useActions } from '../components/actions.jsx';
import { useApi } from '../components/ui.jsx';
import { ACCENTS, useAccent, useTheme } from '../theme.js';
import { uploadPhoto } from '../components/photo.js';

const LINKS = [
  ['/you', 'You', 'sparkle', 'Your Tastemate character, and your saves'],
  ['/next', 'Next', 'pin', 'Where to go, what to see, what to buy'],
  ['/host', 'Host', 'cup', 'Set the mood for tonight'],
  ['/friends', 'Friends', 'users', 'Your people and taste twins'],
];

// Account hub: the phone's "Me" tab, and the avatar menu on desktop.
export default function Me() {
  const { user, logout, refresh } = useAuth();
  const you = useApi('/you');
  const friends = useApi('/friends');
  const apps = useApi('/connect');
  const [theme, setTheme] = useTheme();
  const [accent, setAccent] = useAccent();
  const [city, setCity] = useState(user.home_city || '');
  const { toast } = useActions();

  const saveCity = async (e) => {
    e.preventDefault();
    await api.put('/settings', { home_city: city });
    toast(city ? `${city} is your home city` : 'Home city cleared');
    refresh();
  };

  return (
    <div className="me-page">
      <div className="me-head">
        <label className="avatar-lg avatar-pick" title="Change your photo">
          {user.avatar_url ? <img src={user.avatar_url} alt="" /> : user.display_name[0].toUpperCase()}
          <span className="avatar-edit"><Icon name="plus" size={14} /></span>
          <input type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              await uploadPhoto(f);
              await refresh();
              toast('New photo, who dis?');
            } catch (err) {
              toast(err.message);
            }
          }} />
        </label>
        <div>
          <h1>{user.display_name}</h1>
          <span className="muted">@{user.username}</span>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat"><b>{you.data?.total ?? '–'}</b><span>saves</span></div>
        <div className="stat"><b>{friends.data?.friends.length ?? '–'}</b><span>friends</span></div>
        <div className="stat"><b>{you.data?.character?.sides[0]?.key ?? '–'}</b><span>top side</span></div>
      </div>

      {friends.data?.incoming.length > 0 && (
        <Link to="/friends" className="notice-link">
          <Icon name="users" /> {friends.data.incoming.length} friend request{friends.data.incoming.length > 1 ? 's' : ''} waiting <Icon name="chevron" />
        </Link>
      )}

      <nav className="menu">
        {LINKS.map(([to, label, icon, hint]) => (
          <Link key={to} to={to}>
            <span className="menu-icon"><Icon name={icon} /></span>
            <span className="menu-text"><b>{label}</b><small>{hint}</small></span>
            <Icon name="chevron" className="muted" />
          </Link>
        ))}
      </nav>

      <form className="card-plain" onSubmit={saveCity}>
        <span className="label">Home city</span>
        <p className="muted small">Your perfect day, Next and Host use it when you don’t pick a city. Any city works: live events and places are fetched for it.</p>
        <div className="row">
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Dublin" aria-label="Home city" style={{ flex: 1 }} />
          <button className="btn btn-sm btn-outline">Save</button>
        </div>
      </form>

      {apps.data && (
        <section className="card-plain">
          <span className="label">Connected apps</span>
          <ul className="me-apps">
            {apps.data.apps.map((a) => (
              <li key={a.provider}>
                <b>{a.label}</b>
                <span className="muted small">
                  {a.needs_reconnect ? 'Needs connecting again' : a.connected ? `Connected${a.account ? ` as ${a.account}` : ''} · ${a.saves} saves` : a.available ? 'Not connected' : 'Not switched on here yet'}
                </span>
              </li>
            ))}
          </ul>
          <Link to="/you/add" className="btn btn-sm btn-outline">Manage apps and imports</Link>
        </section>
      )}

      <section className="card-plain">
        <span className="label">Appearance</span>
        <div className="seg seg-full" role="radiogroup" aria-label="Theme">
          {[['system', 'Auto', 'monitor'], ['light', 'Light', 'sun'], ['dark', 'Dark', 'moon']].map(([v, l, i]) => (
            <button key={v} role="radio" aria-checked={theme === v} className={theme === v ? 'on' : ''} onClick={() => setTheme(v)}>
              <Icon name={i} size={16} /> {l}
            </button>
          ))}
        </div>
        <span className="label" style={{ marginTop: 16, display: 'block' }}>Colour</span>
        <div className="accent-picks" role="radiogroup" aria-label="Colour">
          {ACCENTS.map(([k, label, swatch]) => (
            <button key={k} role="radio" aria-checked={accent === k} className="accent-pick" onClick={() => setAccent(k)}>
              <i style={{ background: swatch }} />
              {label}
            </button>
          ))}
        </div>
      </section>

      <button className="btn btn-ghost signout" onClick={logout}><Icon name="logout" size={18} /> Sign out</button>
    </div>
  );
}
