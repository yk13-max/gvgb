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
  const row = (id, name, club) => {
    if (!rows.has(id)) {
      rows.set(id, {
        id,
        name,
        club: club || null,
        attacker: 0,
        midfielder: 0,
        defender: 0,
        potm: 0,
        total: 0,
        played: [], // dates, newest first
        wins: [], // { date, award, label }, newest first
        games: 0, // matches actually played, scored or not
        won: 0, // from the side the player was on
        lost: 0,
        recent: [], // 'W' / 'L' for each decided match, newest first
      });
    }
    return rows.get(id);
  };

  (players || []).forEach((p) => row(p.id, p.name, p.club));

  // Weeks arrive newest first, so pushing in order keeps each list newest first.
  (weeks || []).forEach((w) => {
    weekPlayerIds(w).forEach((p) => row(p.id, p.name).played.push(w.date));
    // A result counts for everyone who was on the pitch for it. Called off or unscored
    // matches count for nobody.
    // Later matches in a night come first, so `recent` stays newest first throughout.
    (w.matches || []).slice().reverse().forEach((m) => {
      const o = outcome(m);
      if (o === 'off') return;
      [
        ['red', m.red],
        ['blue', m.blue],
      ].forEach(([side, list]) => {
        (list || []).forEach((p) => {
          const r = row(p.id, p.name);
          r.games += 1;
          // Matches are played to a winner. A level score left over from before that
          // rule counts as a game played and nothing else.
          if (o === 'red' || o === 'blue') {
            if (o === side) r.won += 1;
            else r.lost += 1;
            r.recent.push(o === side ? 'W' : 'L');
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

  // Win ratio the way the NBA prints it: wins over wins plus losses, to three places.
  // Nobody with no result yet gets a number — 0.000 would rank them level with someone
  // who lost every game, which is a different thing.
  rows.forEach((r) => {
    const decided = r.won + r.lost;
    r.pct = decided ? r.won / decided : null;
    // The last five, read left to right oldest to newest, the way a league table prints form.
    r.form = r.recent.slice(0, 5).reverse();
    r.formWins = r.form.filter((x) => x === 'W').length;
  });

  // A league table, the way a league prints one: best win ratio first. Nobody with no
  // result yet has a ratio, so they come last. Equal ratios are split by games played
  // (the same ratio over more games is the harder one to hold), then wins, then
  // nominations, then A–Z so equals read as equals.
  return [...rows.values()]
    .sort((a, b) => {
      if (a.pct == null || b.pct == null) {
        if (a.pct == null && b.pct == null) return b.played.length - a.played.length || byName(a, b);
        return a.pct == null ? 1 : -1;
      }
      return b.pct - a.pct || b.games - a.games || b.won - a.won || b.total - a.total || byName(a, b);
    })
    .map((r, i) => ({ ...r, order: i }));
}

export function shortRow(r) {
  return { ...r, short: shortName(r.name) };
}
