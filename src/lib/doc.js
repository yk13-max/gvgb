// The document. One shape for all three places the app's data lives: the hosted store
// behind /api/data, the localStorage cache, and an exported .json file. Whatever is in
// the hosted store is the source of truth — the cache is a copy of what we last saw and
// the file is a copy you can keep.
import { cleanFormula } from './formula.js';
import { normalizePlayer } from './model.js';
import { toWeeks } from './weeks.js';

export const DOC_APP = 'fufa-team-balancer';
export const DOC_VERSION = 5;

const round = (n) => Math.round(Number(n) * 100) / 100;

function cleanMatch(m) {
  return {
    date: m && typeof m.date === 'string' ? m.date : '',
    time: m && typeof m.time === 'string' ? m.time : '',
    venue: m && typeof m.venue === 'string' ? m.venue : '',
  };
}

// Teams are stored as ids against the roster, never as copies of the players: a rating
// edited on the stats page has to show on the board, not leave a stale twin behind.
function boardOf(teams, pos, ids) {
  const side = (t) => (Array.isArray(t) ? t.map((p) => p.id).filter((id) => ids.has(id)) : []);
  const red = side(teams && teams.red);
  const blue = side(teams && teams.blue);
  const on = new Set([...red, ...blue]);
  const place = {};
  Object.keys(pos || {}).forEach((k) => {
    const id = Number(k);
    const p = pos[k];
    if (on.has(id) && p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y))) {
      place[id] = { x: round(p.x), y: round(p.y) };
    }
  });
  return { red, blue, pos: place };
}

// No timestamp in here on purpose: the document has to serialise identically when nothing
// has changed, or the app would see every render as an edit worth saving.
const HONOUR_KEYS = ['winner', 'attacker', 'midfielder', 'defender', 'player'];
function cleanHonours(h) {
  const out = {};
  HONOUR_KEYS.forEach((k) => {
    const v = h && Number(h[k]);
    out[k] = Number.isInteger(v) && v > 0 ? v : null;
  });
  return out;
}

function cleanSeasons(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list
    .filter((s) => s && typeof s.name === 'string' && s.name.trim() && /^\d{4}-\d{2}-\d{2}$/.test(s.start || ''))
    .map((s) => ({ id: Number(s.id), name: s.name.trim(), start: s.start, honours: cleanHonours(s.honours) }))
    .filter((s) => Number.isInteger(s.id) && s.id > 0 && !seen.has(s.id) && seen.add(s.id));
}

export function buildDoc({ players, history, teamSize, selected, match, teams, pos, seasons, formula, formulaPrev }) {
  const list = Array.isArray(players) ? players : [];
  const ids = new Set(list.map((p) => p.id));
  return {
    app: DOC_APP,
    version: DOC_VERSION,
    teamSize: teamSize === 6 ? 6 : 5,
    selected: (Array.isArray(selected) ? selected : []).filter((id) => ids.has(id)),
    match: cleanMatch(match),
    board: boardOf(teams, pos, ids),
    players: list,
    history: Array.isArray(history) ? history : [],
    seasons: cleanSeasons(seasons),
    // How teams are made, and the one before the last change so it can be undone.
    formula: cleanFormula(formula),
    formulaPrev: formulaPrev ? cleanFormula(formulaPrev) : null,
  };
}

function readBoard(raw, byId) {
  const pick = (side) =>
    (Array.isArray(raw && raw[side]) ? raw[side] : []).map((id) => byId[Number(id)]).filter(Boolean);
  const red = pick('red');
  const blue = pick('blue');
  // A half-resolved board is worse than none: if players have been deleted since, or the
  // two sides no longer match, start from an empty pitch rather than an uneven one.
  if (!red.length || red.length !== blue.length) return { red: [], blue: [], pos: {} };
  const on = new Set([...red, ...blue].map((p) => p.id));
  if (on.size !== red.length + blue.length) return { red: [], blue: [], pos: {} };
  const pos = {};
  const rawPos = (raw && raw.pos) || {};
  Object.keys(rawPos).forEach((k) => {
    const id = Number(k);
    const p = rawPos[k];
    if (on.has(id) && p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y))) {
      pos[id] = { x: Number(p.x), y: Number(p.y) };
    }
  });
  return { red, blue, pos };
}

// Accepts a document this app wrote, an older one, a bare { players: [...] } object, or a
// plain array of players — a hand-written list should be as loadable as a real backup.
export function parseDoc(data) {
  const raw = Array.isArray(data) ? data : data && data.players;
  if (!Array.isArray(raw)) return { error: 'No "players" list found in that file.' };
  if (!raw.length) return { error: 'That file has an empty player list.' };

  const players = [];
  const byId = {};
  const seen = new Set();
  let nextId = 1;
  raw.forEach((p) => {
    if (!p || typeof p.name !== 'string' || !p.name.trim()) return;
    // Ids are kept when they are valid and unique, so the squad selection, the board and
    // the ids inside recorded weeks still point at the right players. Clashes get re-issued.
    let id = Number(p.id);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) {
      while (seen.has(nextId)) nextId += 1;
      id = nextId;
    }
    seen.add(id);
    const player = normalizePlayer({ ...p, id, name: p.name.trim() });
    players.push(player);
    byId[id] = player;
  });
  if (!players.length) return { error: 'No players in that file had a name.' };

  const d = data && !Array.isArray(data) ? data : {};
  return {
    players,
    history: toWeeks(d.history),
    teamSize: d.teamSize === 5 || d.teamSize === 6 ? d.teamSize : null,
    selected: Array.isArray(d.selected) ? d.selected.map(Number).filter((id) => seen.has(id)) : null,
    match: d.match && typeof d.match === 'object' ? cleanMatch(d.match) : null,
    board: readBoard(d.board, byId),
    seasons: cleanSeasons(d.seasons),
    // A document from before the formula could be edited gets the formula as it was then.
    formula: cleanFormula(d.formula),
    formulaPrev: d.formulaPrev ? cleanFormula(d.formulaPrev) : null,
    // Written by version 2 documents, when the squad view was still shared. It is a per-device
    // preference now, so it is read for the sake of old files and never written back.
    mini: typeof d.mini === 'boolean' ? d.mini : null,
  };
}
