import { parseDoc } from './doc.js';

// A copy of the document as we last saw it, so the app opens with something on screen
// before /api/data answers — and still works on a pitch with no signal.
const CACHE = 'fufa.tb.v1';
// Settings that belong to this browser rather than to the group: they never sync.
const PREFS = 'fufa.tb.prefs';

export { normalizePlayer } from './model.js';

export function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE);
    if (!raw) return null;
    const parsed = parseDoc(JSON.parse(raw));
    return parsed.error ? null : parsed;
  } catch {
    return null;
  }
}

export function saveCache(doc) {
  try {
    localStorage.setItem(CACHE, JSON.stringify(doc));
  } catch {
    // Private-mode Safari and full quotas both throw here; the app works without a cache.
  }
}

export function loadPrefs() {
  try {
    const d = JSON.parse(localStorage.getItem(PREFS) || '{}');
    return { mini: !!d.mini, sort: d.sort === 'ovr' ? 'ovr' : 'name' };
  } catch {
    return { mini: false, sort: 'name' };
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS, JSON.stringify(prefs));
  } catch {
    // Same as above — a lost preference is not worth breaking a render over.
  }
}
