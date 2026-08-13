import { DEFAULT_STAT, STATS } from './model.js';
import { toWeeks } from './weeks.js';

// Roster and format persist locally — there is no backend.
const STORE = 'fufa.tb.v1';

// Rosters saved before a stat or field existed have no value for it. Fill the gaps rather
// than letting `overall()` read undefined as zero and quietly tank everyone's rating.
export function normalizePlayer(p) {
  const stats = {};
  STATS.forEach((k) => {
    const v = Number(p && p.stats ? p.stats[k] : undefined);
    stats[k] = Number.isFinite(v) ? v : DEFAULT_STAT;
  });
  const nicknames = Array.isArray(p && p.nicknames)
    ? p.nicknames.map((n) => String(n).trim()).filter(Boolean)
    : [];
  return { ...p, alt: Array.isArray(p && p.alt) ? p.alt : [], nicknames, stats };
}

export function loadSaved() {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.players)) return null;
    return {
      ...d,
      players: d.players.map(normalizePlayer),
      history: toWeeks(d.history),
    };
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
