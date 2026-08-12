import { DEFAULT_STAT, STATS } from './model.js';

// Roster and format persist locally — there is no backend.
const STORE = 'fufa.tb.v1';

// Rosters saved before a stat existed have no value for it. Fill the gaps rather than
// letting `overall()` read undefined as zero and quietly tank everyone's rating.
function normalize(p) {
  const stats = {};
  STATS.forEach((k) => {
    const v = Number(p && p.stats ? p.stats[k] : undefined);
    stats[k] = Number.isFinite(v) ? v : DEFAULT_STAT;
  });
  return { ...p, alt: Array.isArray(p.alt) ? p.alt : [], stats };
}

export function loadSaved() {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.players)) return null;
    return { ...d, players: d.players.map(normalize) };
  } catch {
    return null;
  }
}

export function save(state) {
  try {
    localStorage.setItem(STORE, JSON.stringify(state));
  } catch {
    // Private-mode Safari and full quotas both throw here; the app works without persistence.
  }
}
