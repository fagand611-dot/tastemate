import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import Icon from '../components/Icon.jsx';
import { useActions } from '../components/actions.jsx';
import { useApi } from '../components/ui.jsx';
import { useTheme } from '../theme.js';

const LINKS = [
  ['/saves', 'Saves', 'graph', 'Everything you saved, and your taste clusters'],
  ['/next', 'Next', 'pin', 'Events, places and things to buy'],
  ['/host', 'Host', 'sparkle', 'Plan an evening from your taste'],
  ['/friends', 'Friends', 'users', 'Requests and taste matches'],
];

// Account hub: the phone's "Me" tab, and the avatar menu on desktop.
export default function Me() {
  const { user, logout, refresh } = useAuth();
  const graph = useApi('/graph');
  const friends = useApi('/friends');
  const [theme, setTheme] = useTheme();
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
        <div className="avatar-lg">{user.display_name[0].toUpperCase()}</div>
        <div>
          <h1>{user.display_name}</h1>
          <span className="muted">@{user.username}</span>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat"><b>{graph.data?.total ?? '–'}</b><span>saves</span></div>
        <div className="stat"><b>{friends.data?.friends.length ?? '–'}</b><span>friends</span></div>
        <div className="stat"><b>{graph.data?.tags[0]?.tag ?? '–'}</b><span>top taste</span></div>
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
        <p className="muted small">Next and Host use it when you don’t pick a city.</p>
        <div className="row">
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Dublin" aria-label="Home city" style={{ flex: 1 }} />
          <button className="btn btn-sm btn-outline">Save</button>
        </div>
      </form>

      <section className="card-plain">
        <span className="label">Appearance</span>
        <div className="seg seg-full" role="radiogroup" aria-label="Theme">
          {[['system', 'Auto', 'monitor'], ['light', 'Light', 'sun'], ['dark', 'Dark', 'moon']].map(([v, l, i]) => (
            <button key={v} role="radio" aria-checked={theme === v} className={theme === v ? 'on' : ''} onClick={() => setTheme(v)}>
              <Icon name={i} size={16} /> {l}
            </button>
          ))}
        </div>
      </section>

      <button className="btn btn-ghost signout" onClick={logout}><Icon name="logout" size={18} /> Sign out</button>
    </div>
  );
}
