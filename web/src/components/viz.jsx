import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';

// Shared visual pieces: side colours, and a dialog (a sheet on phones).
//
// Side colours are categorical slots 1–3 (validated as a set against both
// themes' surfaces); text always stays in text colours.

export const CLUSTER_SLOTS = 3;
export const clusterVar = (i) => (i != null && i < CLUSTER_SLOTS ? `var(--series-${i + 1})` : 'var(--series-other)');

export function Dialog({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="dialog-backdrop" onClick={onClose}>
      <div className={`dialog ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose} autoFocus><Icon name="x" size={18} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

