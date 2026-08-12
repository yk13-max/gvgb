// Roster and format persist locally — there is no backend.
const STORE = 'fufa.tb.v1';

export function loadSaved() {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.players)) return null;
    return d;
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
