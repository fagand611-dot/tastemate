import { useState } from 'react';
import { api } from '../api.js';
import Icon from '../components/Icon.jsx';
import { Empty, Loading, PageHead, useApi } from '../components/ui.jsx';

// Friends are mutual. When a friend saves a spot, it shows up in your Next
// with their name on it, and you can see how close your tastes are.
export default function Friends() {
  const state = useApi('/friends');
  const [username, setUsername] = useState('');
  const [msg, setMsg] = useState(null);

  const act = async (fn, text) => {
    try {
      await fn();
      setMsg(text);
      state.reload();
    } catch (e) {
      setMsg(e.message);
    }
  };
  const request = (e) => {
    e.preventDefault();
    const u = username.trim().replace(/^@/, '');
    act(() => api.post('/friends/request', { username: u }), `Request sent to ${u}`).then(() => setUsername(''));
  };

  return (
    <>
      <PageHead title="Friends" intro="When a friend saves a spot, it shows up in your Next with their name on it." />
      {msg && <p className="notice">{msg}</p>}
      <form className="searchbar" onSubmit={request}>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Add a friend by username" aria-label="Username" />
        <button className="btn btn-primary" disabled={!username.trim()}><Icon name="plus" size={16} /> Add</button>
      </form>

      <Loading state={state}>
        {({ friends, incoming, outgoing }) => (
          <>
            {incoming.length > 0 && (
              <>
                <h2>Requests</h2>
                <ul className="people">
                  {incoming.map((u) => (
                    <li key={u.id}>
                      <span><b>{u.display_name}</b> <span className="muted">@{u.username}</span></span>
                      <div className="row">
                        <button className="btn btn-sm btn-primary" onClick={() => act(() => api.post(`/friends/${u.id}/accept`), `You and ${u.display_name} are now friends`)}>Accept</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => act(() => api.del(`/friends/${u.id}`), 'Request declined')}>Decline</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <h2>Your friends</h2>
            {friends.length ? (
              <ul className="people">
                {friends.map((u) => (
                  <li key={u.id}>
                    <span><b>{u.display_name}</b> <span className="muted">@{u.username}</span></span>
                    <span className="taste-match" style={{ '--p': u.match }}>{u.match}% taste match</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No friends yet. Share your username: they can add you too.</Empty>
            )}
            {outgoing.length > 0 && (
              <>
                <h3>Pending</h3>
                <ul className="people">
                  {outgoing.map((u) => (
                    <li key={u.id}>
                      <span>{u.display_name} <span className="muted">@{u.username}</span></span>
                      <button className="btn btn-sm btn-ghost" onClick={() => act(() => api.del(`/friends/${u.id}`), 'Request cancelled')}>Cancel</button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </Loading>
    </>
  );
}
