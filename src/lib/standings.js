import { byName, shortName } from './names.js';
import { AWARDS, outcome, weekPlayerIds } from './weeks.js';

// The season so far, per player: nights turned out, and each award won, by week.
//
// Everyone who has ever appeared in a week is in here, and so is everyone on the
// roster — a new signing sits at the bottom on zero until they play. Someone deleted
// from the roster keeps their row under the name the week recorded them by, because
// a POTM is a POTM whether or not they are still around.
export function standings(weeks, players) {
  const rows = new Map();
  const row = (id, name) => {
    if (!rows.has(id)) {
      rows.set(id, {
        id,
        name,
        attacker: 0,
        midfielder: 0,
        defender: 0,
        potm: 0,
        total: 0,
        played: [], // dates, newest first
        wins: [], // { date, award, label }, newest first
        games: 0, // matches actually played, scored or not
        won: 0, // from the side the player was on
        drawn: 0,
        lost: 0,
      });
    }
    return rows.get(id);
  };

  (players || []).forEach((p) => row(p.id, p.name));

  // Weeks arrive newest first, so pushing in order keeps each list newest first.
  (weeks || []).forEach((w) => {
    weekPlayerIds(w).forEach((p) => row(p.id, p.name).played.push(w.date));
    // A result counts for everyone who was on the pitch for it. Called off or unscored
    // matches count for nobody.
    (w.matches || []).forEach((m) => {
      const o = outcome(m);
      if (o === 'off') return;
      [
        ['red', m.red],
        ['blue', m.blue],
      ].forEach(([side, list]) => {
        (list || []).forEach((p) => {
          const r = row(p.id, p.name);
          r.games += 1;
          if (o === 'draw') r.drawn += 1;
          else if (o === 'red' || o === 'blue') {
            if (o === side) r.won += 1;
            else r.lost += 1;
          }
        });
      });
    });
    AWARDS.forEach(([k, label]) => {
      const id = w.awards && w.awards[k];
      if (id == null) return;
      const named = weekPlayerIds(w).find((p) => p.id === id);
      const r = row(id, named ? named.name : w.ratings && w.ratings[id] ? w.ratings[id].name : 'Unknown');
      r[k] += 1;
      r.total += 1;
      r.wins.push({ date: w.date, award: k, label });
    });
  });

  // A league table: most awards first, POTM breaking ties since it is the one that
  // counts for the whole night, then nights played, then A–Z so equals read as equals.
  return [...rows.values()].sort(
    (a, b) =>
      b.total - a.total ||
      b.potm - a.potm ||
      b.played.length - a.played.length ||
      byName(a, b)
  );
}

export function shortRow(r) {
  return { ...r, short: shortName(r.name) };
}
