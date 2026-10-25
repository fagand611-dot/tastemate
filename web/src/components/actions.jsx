import { createContext, useCallback, useContext, useState } from 'react';
import Icon from './Icon.jsx';

// App-wide toasts: short confirmations after an action.
const Ctx = createContext(null);
export const useActions = () => useContext(Ctx);

export function ActionsProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((text) => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className="toast"><Icon name="check" size={16} /> {t.text}</div>)}
      </div>
    </Ctx.Provider>
  );
}
