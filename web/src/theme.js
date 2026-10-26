// Theme preference: 'system' (default), 'light' or 'dark'. index.html applies
// the saved value before first paint, so there's no flash of the wrong theme.
import { useState } from 'react';

const KEY = 'tm-theme';

function read() {
  try {
    return localStorage.getItem(KEY) || 'system';
  } catch {
    return 'system';
  }
}

function apply(pref) {
  const root = document.documentElement;
  if (pref === 'system') delete root.dataset.theme;
  else root.dataset.theme = pref;
}

export function useTheme() {
  const [pref, setPref] = useState(read);
  const set = (p) => {
    try {
      localStorage.setItem(KEY, p);
    } catch {
      /* private mode: still apply for this session */
    }
    apply(p);
    setPref(p);
  };
  return [pref, set];
}

// Colour: the accent everything glows in. Same idea: saved, applied early.
const ACCENT_KEY = 'tm-accent';
export const ACCENTS = [
  ['apricot', 'Apricot', 'radial-gradient(circle at 35% 30%, #ffe0c2, #ffad6e 45%, #f26a1b)'],
  ['sage', 'Sage', 'radial-gradient(circle at 35% 30%, #eef7ea, #bfe1bf 45%, #6aa97a)'],
  ['lavender', 'Lavender', 'radial-gradient(circle at 35% 30%, #f4f0ff, #d2c6f7 45%, #8470d8)'],
  ['ocean', 'Ocean', 'radial-gradient(circle at 35% 30%, #edf6ff, #b5d7f5 45%, #4b88c2)'],
  ['rose', 'Rose', 'radial-gradient(circle at 35% 30%, #fff0f4, #f7c0cf 45%, #d66688)'],
];

function readAccent() {
  try {
    const a = localStorage.getItem(ACCENT_KEY);
    return ACCENTS.some(([k]) => k === a) ? a : 'apricot';
  } catch {
    return 'apricot';
  }
}

export function useAccent() {
  const [accent, setAccent] = useState(readAccent);
  const set = (a) => {
    try {
      localStorage.setItem(ACCENT_KEY, a);
    } catch {
      /* private mode: still apply for this session */
    }
    document.documentElement.dataset.accent = a;
    setAccent(a);
  };
  return [accent, set];
}
