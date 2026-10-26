import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Mascot from './Mascot.jsx';

/** Load JSON from the API; returns { data, error, loading, reload, setData }. */
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const load = useCallback(() => {
    if (!path) return;
    setState((s) => ({ ...s, loading: true }));
    api.get(path).then(
      (data) => setState({ data, error: null, loading: false }),
      (error) => setState({ data: null, error, loading: false })
    );
  }, [path]);
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load, setData: (fn) => setState((s) => ({ ...s, data: typeof fn === 'function' ? fn(s.data) : fn })) };
}

export function Loading({ state, children }) {
  if (state.error) return <p className="error">{state.error.message}</p>;
  if (!state.data) return <div className="skeleton" aria-label="Loading"><span /><span /><span /></div>;
  return children(state.data);
}

/** Page title block: serif heading, optional intro line and actions on the right. */
export function PageHead({ title, intro, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {intro && <p className="intro">{intro}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}

export function Empty({ children }) {
  return (
    <div className="empty">
      <Mascot size={72} color="lilac" />
      <div>{children}</div>
    </div>
  );
}
