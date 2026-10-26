import { standings } from './standings.js';
import { moreMatches, shortOf, sortSeasons } from './seasons.js';

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

// Who is in line for each honour while the season is still running: the table leader,
// the most POTMs, the most nominations in each line. Each comes with how far ahead they
// are, since "two clear" and "level with Jo" are different kinds of leading. Nobody
// leads a line with nothing in it yet.
// `min` is the season's minimum matches. Anyone can lead on win ratio; the winner's card
// says how many more matches they need when they haven't reached it yet.
export function frontRunners(weeks, players, min = 0) {
  const rows = standings(weeks, players);
  const out = {};
  HONOURS.forEach(([key]) => {
    let ranked;
    let value;
    if (key === 'winner') {
      ranked = rows.filter((r) => r.pct != null);
      value = (r) => r.pct;
    } else {
      const stat = key === 'player' ? 'potm' : key;
      ranked = rows.filter((r) => r[stat] > 0).sort((a, b) => b[stat] - a[stat] || a.order - b.order);
      value = (r) => r[stat];
    }
    if (!ranked.length) {
      out[key] = null;
      return;
    }
    const lead = ranked[0];
    const level = ranked.slice(1).filter((r) => value(r) === value(lead));
    const next = ranked.find((r) => value(r) < value(lead));
    out[key] = {
      row: lead,
      level,
      // Clear by how many — nominations are counted, so this is a whole number, and with
      // nobody else on the board yet it is the whole count. The win ratio is not a count,
      // so the winner's margin is left to the record on the card.
      clear: key === 'winner' ? null : value(lead) - (next ? value(next) : 0),
      needs: key === 'winner' ? shortOf(lead, min) : 0,
    };
  });
  return out;
}

// The line under a front runner's name: what they lead by.
export function lead(fr) {
  if (!fr) return '';
  if (fr.needs > 0) return 'Needs ' + moreMatches(fr.needs) + ' to qualify';
  if (fr.level.length === 1) return 'Level with ' + fr.level[0].name.split(' ')[0];
  if (fr.level.length > 1) return 'Level with ' + fr.level.length + ' others';
  if (fr.clear == null) return 'Top of the table';
  return fr.clear + ' clear';
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
export function candidates(weeks, players, key, min = 0) {
  const rows = standings(weeks, players).filter((r) => r.played.length > 0);
  // Only the winner needs the minimum; each row says how many it is short.
  if (key === 'winner') return rows.map((r) => ({ ...r, short: shortOf(r, min) }));
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
