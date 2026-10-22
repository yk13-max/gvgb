// How results feed into balancing, and where a rating looks out of step with them.
//
// Ratings are an organiser's judgement; results are what happened. The balancer can
// lean on both: each player's rating is nudged by a damped record and their recent form,
// by up to a few points either way. The ratings themselves are never changed by this.
import { formula } from './formula.js';
import { overall } from './model.js';
import { outcome } from './weeks.js';

export const INFLUENCE = {
  off: { label: 'Off' },
  light: { label: 'Light' },
  strong: { label: 'Strong' },
};

// The most a results nudge can be worth, in points, at each setting. The team formula holds them.
export const influencePoints = (influence) => (influence === 'light' || influence === 'strong' ? formula().results[influence] : 0);

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

// The rating a player went into a match with: the snapshot from that night when there is
// one, worked out again under today's weights, or their rating now when there isn't.
function ratedAt(w, id, players) {
  const snap = w.ratings && w.ratings[id];
  if (snap && snap.stats) return overall({ pos: snap.pos, stats: snap.stats });
  if (snap && snap.ovr != null) return snap.ovr;
  const now = players.find((x) => x.id === id);
  return now ? overall(now) : null;
}

function sideAvg(w, list, players) {
  const v = (list || []).map((p) => ratedAt(w, p.id, players)).filter((x) => x != null);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

const odds = (mine, theirs) => 1 / (1 + Math.exp(-(mine - theirs) / formula().suggest.odds));

// What one decided match counted as for each player who played: +1 for a win and -1 for
// a loss, or — with the teammates switch on — how far the result beat the odds, scaled so
// an even match still counts ±1 and a win nobody expected counts for more.
function matchValues({ m, o, w }, players, useOdds) {
  let pr = null;
  if (useOdds) {
    const r = sideAvg(w, m.red, players);
    const b = sideAvg(w, m.blue, players);
    if (r != null && b != null) pr = odds(r, b);
  }
  const out = [];
  [
    ['red', m.red],
    ['blue', m.blue],
  ].forEach(([side, ids]) => {
    (ids || []).forEach((pl) => {
      const won = side === o;
      if (pr == null) out.push([pl.id, won ? 1 : -1]);
      else out.push([pl.id, 2 * ((won ? 1 : 0) - (side === 'red' ? pr : 1 - pr))]);
    });
  });
  return out;
}

function perMatch(list, players) {
  const useOdds = formula().switches.odds;
  const out = new Map(players.map((p) => [p.id, []]));
  list.forEach((d) => {
    matchValues(d, players, useOdds).forEach(([id, v]) => {
      const res = out.get(id);
      if (res) res.push(v);
    });
  });
  return out;
}

// A number between -1 and 1 for each player: their record, damped by some pretend even
// games so a 2–0 start doesn't read as a great player, blended with their recent form.
export function scoreOf(res) {
  const r = formula().results;
  const won = res.filter((x) => x > 0).length;
  const lost = res.length - won;
  const record = res.reduce((s, x) => s + x, 0) / (res.length + r.draws || 1);
  const last = res.slice(-r.form);
  const form = last.reduce((s, x) => s + x, 0) / (last.length + 2);
  const score = res.length ? Math.max(-1, Math.min(1, r.record * record + (1 - r.record) * form)) : 0;
  return { score, won, lost, games: res.length, record, form };
}

export function resultScores(weeks, players) {
  const per = perMatch(decided(weeks), players);
  const out = new Map();
  players.forEach((p) => out.set(p.id, scoreOf(per.get(p.id) || [])));
  return out;
}

// The strength function the balancer uses: rating plus the results nudge.
export function strengthOf(weeks, players, influence) {
  const pts = influencePoints(influence);
  if (!pts) return overall;
  const scores = resultScores(weeks, players);
  return (p) => overall(p) + pts * ((scores.get(p.id) || { score: 0 }).score || 0);
}

// How often the formula would have picked the winner: for every decided match, oldest
// first, each side's average strength going in — ratings from that night under today's
// weights, plus a results nudge built only from the matches before it. A gap under half a
// point is too close to call and left out.
export function resultsCheck(weeks, players) {
  const f = formula();
  const useOdds = f.switches.odds;
  const levels = { off: 0, light: f.results.light, strong: f.results.strong };
  const tally = Object.fromEntries(Object.keys(levels).map((k) => [k, { n: 0, hit: 0, close: 0 }]));
  const seen = new Map();
  decided(weeks).forEach((d) => {
    const { m, o, w } = d;
    const score = new Map();
    const side = (ids, pts) => {
      const v = (ids || [])
        .map((pl) => {
          const r = ratedAt(w, pl.id, players);
          if (r == null) return null;
          if (!pts) return r;
          if (!score.has(pl.id)) score.set(pl.id, scoreOf(seen.get(pl.id) || []).score);
          return r + pts * score.get(pl.id);
        })
        .filter((x) => x != null);
      return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
    };
    Object.entries(levels).forEach(([k, pts]) => {
      const r = side(m.red, pts);
      const b = side(m.blue, pts);
      if (r == null || b == null) return;
      const t = tally[k];
      t.n += 1;
      if (Math.abs(r - b) < 0.5) t.close += 1;
      else if ((r > b ? 'red' : 'blue') === o) t.hit += 1;
    });
    matchValues(d, players, useOdds).forEach(([id, v]) => {
      if (!seen.has(id)) seen.set(id, []);
      seen.get(id).push(v);
    });
  });
  return tally;
}

// --- rating suggestions ------------------------------------------------------------------
//
// For every match, the two sides' average ratings at the time give the chance each side
// was expected to win. A player whose sides keep doing better than that, over enough
// matches to trust it, is probably rated too low; worse, too high.

// The odds scale, the matches needed, how sure it has to be and how big a suggestion can be
// are all the team formula's. By default a 4-point gap in average rating makes the stronger
// side about a 73% favourite.
export function ratingSuggestions(weeks, players) {
  const S = formula().suggest;
  const tally = new Map(players.map((p) => [p.id, { n: 0, won: 0, exp: 0, resid: 0 }]));
  decided(weeks).forEach(({ m, o, w }) => {
    const r = sideAvg(w, m.red, players);
    const b = sideAvg(w, m.blue, players);
    if (r == null || b == null) return;
    [
      ['red', m.red, r, b],
      ['blue', m.blue, b, r],
    ].forEach(([side, list, mine, theirs]) => {
      const p = odds(mine, theirs);
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
    if (!t || t.n < S.games) return;
    const r = t.resid / t.n; // how far above or below expectation, per match
    const z = r / (0.5 / Math.sqrt(t.n)); // roughly how many standard errors that is
    if (Math.abs(z) < S.z) return;
    const delta = Math.max(-S.cap, Math.min(S.cap, Math.round(r * S.size)));
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
