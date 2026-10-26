import { useState } from 'react';
import TasteArt, { hasArt } from './TasteArt.jsx';
import { wesFor } from './Retro.jsx';

/**
 * A real photo of a place or thing, with its taste icon stuck on as a little
 * label. Without a photo (or if it won't load) the illustration fills in.
 */
export default function SpotPhoto({ spot, size = 86, className = '', children }) {
  const [failed, setFailed] = useState(false);
  const art = spot.tags.find(hasArt) || 'explorer';
  const show = spot.image && !failed;
  return (
    <div className={`spot-photo ${show ? 'has-photo' : ''} ${className}`} style={{ background: wesFor(spot.title) }}>
      {show
        ? <img src={spot.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
        : <TasteArt name={art} size={size} fill="#fff" />}
      {show && (
        <span className="photo-label" style={{ background: wesFor(spot.title) }} title={art}>
          <TasteArt name={art} size={Math.max(22, Math.round(size * 0.34))} fill="#fff" />
        </span>
      )}
      {children}
    </div>
  );
}
