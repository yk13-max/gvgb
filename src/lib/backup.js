import { downloadBlob } from './download.js';
import { normalizePlayer } from './storage.js';
import { toWeeks } from './weeks.js';

export const BACKUP_APP = 'fufa-team-balancer';
export const BACKUP_VERSION = 1;

export function buildBackup({ players, history, teamSize }) {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    teamSize,
    players,
    history,
  };
}

export function exportJSON(state) {
  const json = JSON.stringify(buildBackup(state), null, 2);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(new Blob([json], { type: 'application/json' }), 'fufa-roster-' + stamp + '.json');
}

// Accepts a full export, a bare { players: [...] } object, or just an array of players,
// so a hand-written list is as importable as one this app produced.
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'That file is not valid JSON.' };
  }
  const raw = Array.isArray(data) ? data : data && data.players;
  if (!Array.isArray(raw)) return { error: 'No "players" list found in that file.' };
  if (!raw.length) return { error: 'That file has an empty player list.' };

  const players = [];
  const seen = new Set();
  let nextId = 1;
  raw.forEach((p) => {
    if (!p || typeof p.name !== 'string' || !p.name.trim()) return;
    // Ids are re-issued on the way in: a file from another roster can collide with this one.
    let id = Number(p.id);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) {
      while (seen.has(nextId)) nextId += 1;
      id = nextId;
    }
    seen.add(id);
    players.push(normalizePlayer({ ...p, id, name: p.name.trim() }));
  });
  if (!players.length) return { error: 'No players in that file had a name.' };

  const history = toWeeks(data && data.history);
  const teamSize = data && (data.teamSize === 5 || data.teamSize === 6) ? data.teamSize : null;
  return { players, history, teamSize };
}
