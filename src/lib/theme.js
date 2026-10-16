// Light, dark, or follow the phone: a per-device choice, like the squad view. The page is
// themed by `data-theme` on <html>, set before the first paint by a line in index.html and
// kept in step here, including when the phone switches itself at dusk.
import { useEffect, useState } from 'react';

const KEY = 'fufa.tb.theme';
export const THEMES = ['system', 'light', 'dark'];

export function savedTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return THEMES.includes(t) ? t : 'system';
  } catch {
    return 'system';
  }
}

const media = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null);

export function resolve(pref) {
  if (pref === 'light' || pref === 'dark') return pref;
  const m = media();
  return m && m.matches ? 'dark' : 'light';
}

function apply(pref) {
  const t = resolve(pref);
  document.documentElement.dataset.theme = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#14191f' : '#ffffff');
}

export function useTheme() {
  const [pref, setPref] = useState(savedTheme);
  useEffect(() => {
    apply(pref);
    try {
      localStorage.setItem(KEY, pref);
    } catch {
      // Without storage the choice lasts until the page is closed.
    }
    if (pref !== 'system') return undefined;
    const m = media();
    if (!m) return undefined;
    const on = () => apply('system');
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [pref]);
  const cycle = () => setPref((p) => THEMES[(THEMES.indexOf(p) + 1) % THEMES.length]);
  return { pref, resolved: resolve(pref), setPref, cycle };
}
