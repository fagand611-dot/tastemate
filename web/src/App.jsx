import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api } from './api.js';
import Icon from './components/Icon.jsx';
import { ActionsProvider } from './components/actions.jsx';
import { MascotFace } from './components/Mascot.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Login from './pages/Login.jsx';
import Next from './pages/Next.jsx';
import You from './pages/You.jsx';
import Host from './pages/Host.jsx';
import Friends from './pages/Friends.jsx';
import Me from './pages/Me.jsx';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// Desktop top navigation.
const NAV = [
  ['/you', 'You'],
  ['/next', 'Next'],
  ['/host', 'Host'],
  ['/friends', 'Friends'],
];

// Phone bottom tabs. You come first: meet your character, then go out.
const TABS = [
  ['/you', 'You', 'sparkle'],
  ['/next', 'Next', 'pin'],
  ['/host', 'Host', 'cup'],
  ['/friends', 'Friends', 'users'],
  ['/me', 'Account', 'user'],
];

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = still loading
  const [offline, setOffline] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const refresh = useCallback(
    () =>
      api.get('/me').then(
        (d) => {
          setOffline(false);
          setUser(d.user ?? null);
        },
        // No answer, or the dev proxy's 5xx, means the API server isn't running.
        (e) => (!e.status || e.status >= 500 ? setOffline(true) : setUser(null))
      ),
    []
  );
  useEffect(() => {
    refresh();
  }, [refresh]);
  // Braces matter: newer browsers return a Promise from scrollTo, and an effect
  // must return nothing (or a cleanup function), or React crashes on unmount.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    navigate('/');
  };

  if (offline) {
    return (
      <div className="crash">
        <h1>Can’t reach the Tastemate server</h1>
        <p className="intro">
          The page loaded, but the server behind it isn’t answering. Check the terminal where you ran <code>npm run dev</code>:
          it should still be running and show “Tastemate API on http://localhost:3001”. If it stopped with an error, fix that and run it again.
        </p>
        <button className="btn btn-primary" onClick={refresh}>Try again</button>
      </div>
    );
  }
  if (user === undefined) return <div className="center"><div className="skeleton"><span /><span /></div></div>;
  if (!user) return <AuthCtx.Provider value={{ user, setUser, refresh, logout }}><Login /></AuthCtx.Provider>;

  return (
    <AuthCtx.Provider value={{ user, setUser, refresh, logout }}>
      <ActionsProvider>
        <header className="topbar">
          <Link to="/" className="brand"><MascotFace /><span className="brand-word">tastemate</span></Link>
          <nav className="topnav">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to}>{label}</NavLink>
            ))}
          </nav>
          <div className="top-actions">
            <NavLink to="/me" className="avatar-btn" aria-label="Your account">{user.avatar_url ? <img src={user.avatar_url} alt="" /> : user.display_name[0].toUpperCase()}</NavLink>
          </div>
        </header>
        <main>
          <ErrorBoundary key={pathname}>
          <Routes>
            <Route path="/" element={<Navigate to="/you" replace />} />
            <Route path="/you" element={<You />} />
            <Route path="/you/:section" element={<You />} />
            <Route path="/saves" element={<Navigate to="/you" replace />} />
            <Route path="/next" element={<Next />} />
            <Route path="/host" element={<Host />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/me" element={<Me />} />
            <Route path="*" element={<p className="muted">Page not found.</p>} />
          </Routes>
          </ErrorBoundary>
        </main>
        <nav className="tabbar" aria-label="Main">
          {TABS.map(([to, label, icon]) => (
            <NavLink key={to} to={to}>
              <Icon name={icon} size={22} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </ActionsProvider>
    </AuthCtx.Provider>
  );
}
