// How results feed into balancing, and where a rating looks out of step with them.
//
// Ratings are an organiser's judgement; results are what happened. The balancer can
// lean on both: each player's rating is nudged by a damped record and their recent form,
// by up to a few points either way. The ratings themselves are never changed by this.
import { overall } from './model.js';
import { outcome } from './weeks.js';

export const INFLUENCE = {
  off: { label: 'Off', points: 0 },
  light: { label: 'Light', points: 4 },
  strong: { label: 'Strong', points: 8 },
};

const on = (list, id) => (list || []).some((p) => p.id === id);

// Every decided match, oldest first, with who won.
function decided(weeks) {
  const out = [];
  (weeks || [])
    .slice()
    .reverse()
    .forEach((w) =>
      (w.matches || []).forEach((m) => {
        const o = outcome(m);
        if (o === 'red' || o === 'blue') out.push({ m, o, w });
      })
    );
  return out;
}

// A number between -1 and 1 for each player: their record, damped by six phantom
// even games so a 2–0 start doesn't read as a great player, blended with their last five.
export function resultScores(weeks, players) {
  const list = decided(weeks);
  const out = new Map();
  players.forEach((p) => {
    const res = [];
    list.forEach(({ m, o }) => {
      const side = on(m.red, p.id) ? 'red' : on(m.blue, p.id) ? 'blue' : null;
      if (side) res.push(side === o ? 1 : -1);
    });
    const won = res.filter((x) => x > 0).length;
    const lost = res.length - won;
    const record = (won - lost) / (won + lost + 6);
    const last = res.slice(-5);
    const form = last.reduce((s, x) => s + x, 0) / (last.length + 2);
    out.set(p.id, { score: res.length ? 0.6 * record + 0.4 * form : 0, won, lost, games: res.length });
  });
  return out;
}

// The strength function the balancer uses: rating plus the results nudge.
export function strengthOf(weeks, players, influence) {
  const pts = (INFLUENCE[influence] || INFLUENCE.off).points;
  if (!pts) return overall;
  const scores = resultScores(weeks, players);
  return (p) => overall(p) + pts * ((scores.get(p.id) || { score: 0 }).score || 0);
}

// --- rating suggestions ------------------------------------------------------------------
//
// For every match, the two sides' average ratings at the time give the chance each side
// was expected to win. A player whose sides keep doing better than that, over enough
// matches to trust it, is probably rated too low; worse, too high.

const SCALE = 4; // a 4-point gap in average rating makes the stronger side about a 73% favourite
const MIN_GAMES = 8;
const expected = (mine, theirs) => 1 / (1 + Math.exp(-(mine - theirs) / SCALE));

export function ratingSuggestions(weeks, players) {
  const rated = (w, p) => {
    const snap = w.ratings && w.ratings[p.id];
    if (snap && snap.ovr != null) return snap.ovr;
    const now = players.find((x) => x.id === p.id);
    return now ? overall(now) : null;
  };
  const avg = (w, list) => {
    const v = (list || []).map((p) => rated(w, p)).filter((x) => x != null);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };
  const tally = new Map(players.map((p) => [p.id, { n: 0, won: 0, exp: 0, resid: 0 }]));
  decided(weeks).forEach(({ m, o, w }) => {
    const r = avg(w, m.red);
    const b = avg(w, m.blue);
    if (r == null || b == null) return;
    [
      ['red', m.red, r, b],
      ['blue', m.blue, b, r],
    ].forEach(([side, list, mine, theirs]) => {
      const p = expected(mine, theirs);
      const won = side === o ? 1 : 0;
      (list || []).forEach((pl) => {
        const t = tally.get(pl.id);
        if (!t) return;
        t.n += 1;
        t.won += won;
        t.exp += p;
        t.resid += won - p;
      });
    });
  });
  const out = [];
  players.forEach((p) => {
    const t = tally.get(p.id);
    if (!t || t.n < MIN_GAMES) return;
    const r = t.resid / t.n; // how far above or below expectation, per match
    const z = r / (0.5 / Math.sqrt(t.n)); // roughly how many standard errors that is
    if (Math.abs(z) < 2) return;
    const delta = Math.max(-8, Math.min(8, Math.round(r * 20)));
    if (Math.abs(delta) < 2) return;
    out.push({ id: p.id, name: p.name, ovr: overall(p), games: t.n, won: t.won, expectedPct: Math.round((t.exp / t.n) * 100), actualPct: Math.round((t.won / t.n) * 100), delta });
  });
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.games - a.games);
}

// Moving every stat by the same amount moves OVR by exactly that much (the weights add
// up to one), so applying a suggestion keeps the shape of a player and shifts the level.
export function shiftStats(stats, delta) {
  const out = {};
  Object.keys(stats).forEach((k) => {
    out[k] = Math.max(0, Math.min(100, (Number(stats[k]) || 0) + delta));
  });
  return out;
}
