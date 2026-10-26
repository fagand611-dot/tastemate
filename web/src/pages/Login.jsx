import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import Mascot, { MascotFace } from '../components/Mascot.jsx';

export default function Login() {
  const { setUser } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', displayName: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.post(mode === 'login' ? '/auth/login' : '/auth/register', form);
      setUser(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-hero">
        <div className="auth-mascots" aria-hidden>
          <Mascot size={150} prop="jazz" color="pink" />
          <Mascot size={110} prop="pastry" color="sky" tear={false} className="m-2" />
          <Mascot size={90} prop="art" color="lilac" className="m-3" />
        </div>
        <h1><MascotFace size={44} /> <span className="brand-word">tastemate</span></h1>
        <p>Everything you save on Spotify, Instagram, Google Maps and Pinterest, connected into what to do, see and buy next, at home tomorrow or on your next trip.</p>
      </div>
      <form className="panel auth-form" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Welcome back!' : 'Hello, new friend'}</h2>
        <label>Username<input autoComplete="username" value={form.username} onChange={set('username')} required /></label>
        {mode === 'register' && (
          <label>Display name<input value={form.displayName} onChange={set('displayName')} placeholder="Optional" /></label>
        )}
        <label>
          Password
          <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={set('password')} required minLength={mode === 'register' ? 8 : undefined} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>{mode === 'login' ? 'Sign in' : 'Meet my Tastemate'}</button>
        <p className="muted small">
          {mode === 'login' ? 'New here? ' : 'Already have an account? '}
          <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </form>
    </div>
  );
}
