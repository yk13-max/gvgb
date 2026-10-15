import { standings } from './standings.js';
import { sortSeasons } from './seasons.js';

// A season's honours: who won it, and the best in each line, picked by the organiser
// once the season is done. Shown to everyone only when it is done — which, since a
// season runs until the next one starts, means the next season has started.

export const HONOURS = [
  ['winner', 'Season winner', 'trophy', 'gold', 'Top of the table'],
  ['player', 'Best player', 'crown', 'violet', 'Most player-of-the-match awards'],
  ['attacker', 'Best attacker', 'target', 'crimson', 'Goals and the threat of them'],
  ['midfielder', 'Best midfielder', 'zap', 'emerald', 'Ran the game from the middle'],
  ['defender', 'Best defender', 'shield', 'cobalt', 'The wall at the back'],
];

export const EMPTY_HONOURS = { winner: null, player: null, attacker: null, midfielder: null, defender: null };

// The organiser names these. Best player is not among them: it is whoever won the most
// player-of-the-match awards that season, worked out rather than chosen.
export const PICKED = HONOURS.filter(([k]) => k !== 'player');

export function bestPlayer(weeks, players) {
  const rows = standings(weeks, players).filter((r) => r.potm > 0);
  if (!rows.length) return null;
  // Most POTMs; a tie goes to whoever stands higher in the table.
  return rows.slice().sort((a, b) => b.potm - a.potm || a.order - b.order)[0];
}

export function isFinished(season, seasons, today) {
  return sortSeasons(seasons).some((s) => s.start > season.start && s.start <= today);
}

export function hasStarted(season, today) {
  return season.start <= today;
}

// Everyone who turned out in the season, ordered so the obvious pick for each honour
// comes first: the table order for the winner and best player, nominations in that
// line for the others. Nobody is excluded — a defender who played up front all
// season can still be named best attacker.
export function candidates(weeks, players, key) {
  const rows = standings(weeks, players).filter((r) => r.played.length > 0);
  if (key === 'winner') return rows;
  return rows.slice().sort((a, b) => b[key] - a[key] || a.order - b.order || 0);
}

// The line under a name on its card: the number that backs the honour up.
export function backing(row, key) {
  if (!row) return '';
  if (key === 'winner') {
    const rec = row.won + '–' + row.lost;
    return row.pct == null ? rec : rec + ' · ' + row.pct.toFixed(3);
  }
  if (key === 'player') return (row.potm || 0) + ' POTM award' + (row.potm === 1 ? '' : 's');
  const n = row[key] || 0;
  return n ? n + ' nomination' + (n === 1 ? '' : 's') : 'Organiser\u2019s pick';
}
