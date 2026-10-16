// Talking points for the shared images: a few facts that make a team sheet or a results
// card worth a second look in the group chat. Pre-match facts come from the two line-ups
// against everything played before; post-match facts from the night against everything
// before it.
//
// Ratings never appear as numbers. The upset meter compares the sides' ratings behind
// the scenes and says only that the lower-rated side won, and how much of a surprise that
// was — the image goes to everyone, password or not.
import { overall } from './model.js';
import { firstName, shortName } from './names.js';
import { currentSeason, seasonOf, weeksIn } from './seasons.js';
import { standings } from './standings.js';
import { outcome } from './weeks.js';

export const CATEGORY = {
  h2h: { tag: 'Head to head', tone: 'gold' },
  form: { tag: 'Form guide', tone: 'green' },
  duo: { tag: 'Partnerships', tone: 'violet' }, // pairs, and groups of three or four
  story: { tag: 'Milestone', tone: 'blue' },
  streak: { tag: 'Streak', tone: 'green' },
  record: { tag: 'Record', tone: 'gold' },
  table: { tag: 'Table', tone: 'blue' },
  upset: { tag: 'Upset meter', tone: 'red' },
};

const MILESTONES = [10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500];
const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
const ids = (list) => (list || []).map((p) => p.id);
const has = (list, id) => (list || []).some((p) => p.id === id);
const sameSet = (list, want) => {
  const got = ids(list);
  return got.length === want.length && want.every((id) => got.includes(id));
};

function namer(players, extra) {
  const all = [...players, ...(extra || [])];
  return (id) => {
    const p = all.find((x) => x.id === id);
    if (!p) return 'Unknown';
    const clash = players.some((o) => o.id !== id && firstName(o.name).toLowerCase() === firstName(p.name).toLowerCase());
    return clash ? shortName(p.name) : firstName(p.name);
  };
}

// Every played match, oldest first.
function chrono(weeks) {
  const out = [];
  weeks
    .slice()
    .reverse()
    .forEach((w) =>
      (w.matches || []).forEach((m, i) => {
        const o = outcome(m);
        if (o === 'off') return;
        out.push({ m, o, date: w.date, n: i + 1, week: w });
      })
    );
  return out;
}

// A player's decided results, oldest first: 'W' / 'L'.
function resultsOf(id, list) {
  const out = [];
  list.forEach(({ m, o }) => {
    if (o !== 'red' && o !== 'blue') return;
    const side = has(m.red, id) ? 'red' : has(m.blue, id) ? 'blue' : null;
    if (side) out.push(side === o ? 'W' : 'L');
  });
  return out;
}

// Every group of three or more within a side, up to the whole side, for streaks shared
// by more than a pair. The biggest group sharing a run is the one worth naming.
function groupsOf(side) {
  const out = [];
  const n = side.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const g = side.filter((_, i) => mask & (1 << i));
    if (g.length >= 3) out.push(g);
  }
  return out;
}

// A group's results in the matches they all played on the same side, oldest first.
function groupResults(group, list) {
  const out = [];
  list.forEach(({ m, o }) => {
    if (o !== 'red' && o !== 'blue') return;
    const side = group.every((id) => has(m.red, id)) ? 'red' : group.every((id) => has(m.blue, id)) ? 'blue' : null;
    if (side) out.push(side === o ? 'W' : 'L');
  });
  return out;
}

// The best shared winning run among the groups of three or more on these sides: the
// longest run first, a bigger group breaking ties. Only runs of three or more count.
function bestGroupRun(sides, list, minRun = 3) {
  let best = null;
  sides.forEach((side) =>
    groupsOf(side).forEach((group) => {
      const r = runOf(groupResults(group, list));
      if (r.kind !== 'W' || r.n < minRun) return;
      if (!best || r.n > best.n || (r.n === best.n && group.length > best.group.length)) best = { group, n: r.n };
    })
  );
  return best;
}

const listNames = (names) => names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];

function runOf(results) {
  if (!results.length) return { kind: null, n: 0 };
  const last = results[results.length - 1];
  let n = 0;
  for (let i = results.length - 1; i >= 0 && results[i] === last; i--) n += 1;
  return { kind: last, n };
}

const gamesOf = (id, list) => list.filter(({ m }) => has(m.red, id) || has(m.blue, id)).length;

// Takes the strongest fact in each category first, so the image tells a few different
// stories, then fills the rest by weight.
function pick(facts, max) {
  const sorted = facts.filter(Boolean).sort((a, b) => b.weight - a.weight);
  const out = [];
  const seen = new Set();
  sorted.forEach((f) => {
    if (out.length < max && !seen.has(f.cat)) {
      out.push(f);
      seen.add(f.cat);
    }
  });
  sorted.forEach((f) => {
    if (out.length < max && !out.includes(f)) out.push(f);
  });
  return out.sort((a, b) => b.weight - a.weight).map((f) => ({ ...f, ...CATEGORY[f.cat] }));
}

// --- before kick-off -------------------------------------------------------------------

export function preMatchFacts(teams, weeks, players, { seasons = [], today, max = 4 } = {}) {
  const red = ids(teams && teams.red);
  const blue = ids(teams && teams.blue);
  if (!red.length || !blue.length) return [];
  const all = chrono(weeks || []);
  const name = namer(players, [...(teams.red || []), ...(teams.blue || [])]);
  const both = [...red, ...blue];
  const facts = [];

  // Head to head: the exact sides first, then sides that were mostly these players.
  const total = both.length;
  let exact = { n: 0, red: 0, blue: 0 };
  let close = { n: 0, red: 0, blue: 0, min: total };
  all.forEach(({ m, o }) => {
    const straight = red.filter((id) => has(m.red, id)).length + blue.filter((id) => has(m.blue, id)).length;
    const swapped = red.filter((id) => has(m.blue, id)).length + blue.filter((id) => has(m.red, id)).length;
    const aligned = straight >= swapped;
    const overlap = Math.max(straight, swapped);
    const ours = (side) => (aligned ? side : side === 'red' ? 'blue' : 'red'); // their colour -> our side
    const isExact = (sameSet(m.red, red) && sameSet(m.blue, blue)) || (sameSet(m.red, blue) && sameSet(m.blue, red));
    const tally = (t) => {
      t.n += 1;
      if (o === 'red' || o === 'blue') t[ours(o)] += 1;
    };
    if (isExact) tally(exact);
    else if (overlap >= Math.ceil(total * 0.7)) {
      tally(close);
      close.min = Math.min(close.min, overlap);
    }
  });
  const lead = (t) => (t.red === t.blue ? 'level at ' + t.red + '–' + t.blue : (t.red > t.blue ? 'Red' : 'Blue') + ' lead ' + Math.max(t.red, t.blue) + '–' + Math.min(t.red, t.blue));
  if (exact.n) facts.push({ cat: 'h2h', weight: 95, text: 'Rematch! These exact sides have met ' + plural(exact.n, 'time') + ' — ' + lead(exact) + '.' });
  else if (close.n) facts.push({ cat: 'h2h', weight: 72, text: 'Familiar foes: sides with at least ' + close.min + ' of these ' + total + ' players have met ' + plural(close.n, 'time') + ' — ' + lead(close) + '.' });
  else if (all.length >= 5) facts.push({ cat: 'h2h', weight: 30, text: 'A fresh fixture: these sides have never lined up like this before.' });

  // Form guide: each side's players' last five, and the hottest and coldest runs.
  const formOf = (side) => side.reduce((acc, id) => {
    const last = resultsOf(id, all).slice(-5);
    acc.w += last.filter((x) => x === 'W').length;
    acc.n += last.length;
    return acc;
  }, { w: 0, n: 0 });
  const rf = formOf(red);
  const bf = formOf(blue);
  if (rf.n + bf.n >= 6) {
    const better = rf.w / (rf.n || 1) >= bf.w / (bf.n || 1) ? 'Red' : 'Blue';
    facts.push({ cat: 'form', weight: 60, text: 'Red’s players have won ' + rf.w + ' of their last ' + rf.n + ', Blue’s ' + bf.w + ' of ' + bf.n + ' — ' + better + ' come in hotter.' });
  }
  const runs = both.map((id) => ({ id, ...runOf(resultsOf(id, all)) }));
  const hot = runs.filter((r) => r.kind === 'W' && r.n >= 3).sort((a, b) => b.n - a.n)[0];
  const cold = runs.filter((r) => r.kind === 'L' && r.n >= 3).sort((a, b) => b.n - a.n)[0];
  if (hot) facts.push({ cat: 'form', who: hot.id, weight: 62 + hot.n, text: name(hot.id) + ' is on a ' + hot.n + '-match winning run.' });
  if (cold) facts.push({ cat: 'form', weight: 55 + cold.n, text: name(cold.id) + ' has lost ' + cold.n + ' in a row — due a win?' });

  // Partnerships: each side's best duo on record, and team-mates for the first time.
  const duo = (side) => {
    let best = null;
    for (let i = 0; i < side.length; i++)
      for (let j = i + 1; j < side.length; j++) {
        let w = 0;
        let l = 0;
        all.forEach(({ m, o }) => {
          const together = (has(m.red, side[i]) && has(m.red, side[j])) ? 'red' : has(m.blue, side[i]) && has(m.blue, side[j]) ? 'blue' : null;
          if (!together || (o !== 'red' && o !== 'blue')) return;
          if (o === together) w += 1;
          else l += 1;
        });
        if (w + l < 3) continue;
        const pct = w / (w + l);
        if (pct < 0.5) continue; // a losing partnership is not one to brag about
        if (!best || pct > best.pct || (pct === best.pct && w + l > best.w + best.l)) best = { a: side[i], b: side[j], w, l, pct };
      }
    return best;
  };
  const rd = duo(red);
  const bd = duo(blue);
  if (rd || bd) {
    const part = (label, d) => (d ? label + ': ' + name(d.a) + ' & ' + name(d.b) + ' (' + d.w + '–' + d.l + ' together)' : null);
    facts.push({ cat: 'duo', weight: 58 + Math.round(((rd ? rd.pct : 0) + (bd ? bd.pct : 0)) * 5), text: 'Best duos — ' + [part('Red', rd), part('Blue', bd)].filter(Boolean).join(' · ') + '.' });
  }
  const firsts = [];
  [red, blue].forEach((side) => {
    for (let i = 0; i < side.length; i++)
      for (let j = i + 1; j < side.length; j++) {
        if (gamesOf(side[i], all) < 3 || gamesOf(side[j], all) < 3) continue;
        const ever = all.some(({ m }) => (has(m.red, side[i]) && has(m.red, side[j])) || (has(m.blue, side[i]) && has(m.blue, side[j])));
        if (!ever) firsts.push(name(side[i]) + ' & ' + name(side[j]));
      }
  });
  // Bigger than a pair: three or four on the same side tonight who are on a run together.
  const crew = bestGroupRun([red, blue], all);
  if (crew) {
    const sideName = red.includes(crew.group[0]) ? 'Red' : 'Blue';
    facts.push({ cat: 'duo', weight: 66 + crew.n + crew.group.length, text: listNames(crew.group.map(name)) + ' have won their last ' + crew.n + ' together — and they’re all on ' + sideName + ' again.' });
    // The group's run is the story; one of them on the same run would just repeat it.
    for (let i = facts.length - 1; i >= 0; i--) if (facts[i].who != null && crew.group.includes(facts[i].who)) facts.splice(i, 1);
  }
  if (firsts.length) facts.push({ cat: 'duo', weight: 54, text: 'First time on the same side: ' + firsts.slice(0, 2).join(', ') + (firsts.length > 2 ? ' and ' + (firsts.length - 2) + ' more pairs' : '') + '.' });

  // Milestones and storylines.
  both.forEach((id) => {
    const g = gamesOf(id, all);
    if (g === 0 && all.length) facts.push({ cat: 'story', weight: 76, text: name(id) + '’s first recorded match.' });
    else if (MILESTONES.includes(g + 1)) facts.push({ cat: 'story', weight: g + 1 >= 50 ? 88 : 70, text: name(id) + ' plays their ' + ordinal(g + 1) + ' match.' });
    const lastIdx = (weeks || []).findIndex((w) => (w.matches || []).some((m) => has(m.red, id) || has(m.blue, id)));
    if (lastIdx >= 3) facts.push({ cat: 'story', weight: 52 + lastIdx, text: name(id) + ' is back after ' + lastIdx + ' nights out.' });
  });
  const now = today || new Date().toISOString().slice(0, 10);
  const cur = currentSeason(seasons, now);
  const tableWeeks = cur ? weeksIn(weeks || [], String(cur.id), seasons) : weeks || [];
  const rows = standings(tableWeeks, players).filter((r) => r.pct != null && r.won + r.lost >= 3);
  if (rows.length >= 4) {
    const top = rows[0];
    const bottom = rows[rows.length - 1];
    const sideOf = (id) => (red.includes(id) ? 'red' : blue.includes(id) ? 'blue' : null);
    const ts = sideOf(top.id);
    const bs = sideOf(bottom.id);
    if (ts && bs && ts !== bs) facts.push({ cat: 'story', weight: 74, text: 'Top v bottom: league leader ' + name(top.id) + ' faces bottom-placed ' + name(bottom.id) + '.' });
    else if (ts) facts.push({ cat: 'story', weight: 50, text: 'League leader ' + name(top.id) + ' lines up for ' + (ts === 'red' ? 'Red' : 'Blue') + '.' });
  }

  return pick(facts, max);
}

// --- after the night ---------------------------------------------------------------------

export function postMatchFacts(week, weeks, players, { seasons = [], max = 4 } = {}) {
  if (!week) return [];
  const before = (weeks || []).filter((w) => w.date < week.date);
  const upto = [week, ...before];
  const pre = chrono(before);
  const post = chrono(upto);
  const tonight = chrono([week]);
  const squad = [];
  (week.matches || []).forEach((m) => [...(m.red || []), ...(m.blue || [])].forEach((p) => !squad.some((x) => x.id === p.id) && squad.push(p)));
  const name = namer(players, squad);
  const facts = [];

  // Streaks extended, ended and broken.
  squad.forEach(({ id }) => {
    const was = runOf(resultsOf(id, pre));
    const now = runOf(resultsOf(id, post));
    const playedTonight = resultsOf(id, tonight).length > 0;
    if (!playedTonight) return;
    if (now.kind === 'W' && now.n >= 3) facts.push({ cat: 'streak', who: id, weight: 55 + now.n, text: name(id) + ' has now won ' + now.n + ' in a row.' });
    if (was.kind === 'W' && was.n >= 3 && now.kind === 'L') facts.push({ cat: 'streak', who: id, weight: 58 + was.n, text: name(id) + '’s ' + was.n + '-match winning run is over.' });
    if (was.kind === 'L' && was.n >= 3 && now.kind === 'W') facts.push({ cat: 'streak', weight: 57 + was.n, text: name(id) + ' finally won, ending a ' + was.n + '-match losing run.' });
    if (now.kind === 'L' && now.n >= 4) facts.push({ cat: 'streak', weight: 45 + now.n, text: name(id) + ' has now lost ' + now.n + ' in a row.' });
  });

  // Groups of three or four who were on the same side tonight: a shared run extended, or ended.
  const sidesTonight = [];
  (week.matches || []).forEach((m) => {
    [m.red, m.blue].forEach((list) => {
      const key = ids(list).sort((a, b) => a - b).join(',');
      if (list && list.length >= 3 && !sidesTonight.some((x) => x.key === key)) sidesTonight.push({ key, ids: ids(list) });
    });
  });
  const crewNow = bestGroupRun(sidesTonight.map((x) => x.ids), post);
  if (crewNow && resultsOf(crewNow.group[0], tonight).length) {
    const extended = groupResults(crewNow.group, tonight).length > 0;
    if (extended) {
      facts.push({ cat: 'duo', weight: 64 + crewNow.n + crewNow.group.length, text: listNames(crewNow.group.map(name)) + ' have now won ' + crewNow.n + ' in a row together.' });
      for (let i = facts.length - 1; i >= 0; i--) if (facts[i].who != null && crewNow.group.includes(facts[i].who)) facts.splice(i, 1);
    }
  }
  let ended = null;
  sidesTonight.forEach(({ ids: side }) =>
    groupsOf(side).forEach((group) => {
      const before = runOf(groupResults(group, pre));
      const after = runOf(groupResults(group, post));
      if (before.kind === 'W' && before.n >= 3 && after.kind === 'L' && (!ended || before.n > ended.n || (before.n === ended.n && group.length > ended.group.length))) ended = { group, n: before.n };
    })
  );
  if (ended) {
    facts.push({ cat: 'duo', weight: 60 + ended.n + ended.group.length, text: listNames(ended.group.map(name)) + '’s ' + ended.n + '-match winning run together is over.' });
    for (let i = facts.length - 1; i >= 0; i--) if (facts[i].who != null && ended.group.includes(facts[i].who)) facts.splice(i, 1);
  }

  // Records: tonight against everything before.
  const scored = (list) => list.filter(({ m, o }) => (o === 'red' || o === 'blue') && m.redScore != null && m.blueScore != null);
  const prev = scored(pre);
  const mine = scored(tonight);
  if (prev.length >= 3 && mine.length) {
    const margin = ({ m }) => Math.abs(m.redScore - m.blueScore);
    const goals = ({ m }) => m.redScore + m.blueScore;
    const bestMargin = Math.max(...prev.map(margin));
    const bestGoals = Math.max(...prev.map(goals));
    const big = mine.slice().sort((a, b) => margin(b) - margin(a))[0];
    const high = mine.slice().sort((a, b) => goals(b) - goals(a))[0];
    const sc = ({ m, o }) => Math.max(m.redScore, m.blueScore) + '–' + Math.min(m.redScore, m.blueScore) + ' to ' + (o === 'red' ? 'Red' : 'Blue');
    const which = (x) => (week.matches.length > 1 ? ' in match ' + x.n : '');
    if (margin(big) > bestMargin) facts.push({ cat: 'record', weight: 92, text: sc(big) + which(big) + ' is the biggest win on record.' });
    else if (margin(big) === bestMargin && margin(big) >= 3) facts.push({ cat: 'record', weight: 66, text: sc(big) + which(big) + ' equals the biggest win on record.' });
    if (goals(high) > bestGoals) facts.push({ cat: 'record', weight: 86, text: plural(goals(high), 'goal') + which(high) + ' — the highest-scoring game yet.' });
    const nightGoals = mine.reduce((s, x) => s + goals(x), 0);
    const nights = before.map((w) => scored(chrono([w])).reduce((s, x) => s + goals(x), 0));
    if (nights.length >= 3 && nightGoals > Math.max(...nights)) facts.push({ cat: 'record', weight: 70, text: plural(nightGoals, 'goal') + ' on the night — the most in a single session.' });
  }

  // Table movement within the week's season.
  const season = seasonOf(seasons, week.date);
  const inSeason = (list) => (season ? weeksIn(list, String(season.id), seasons) : list);
  const rank = (list) => {
    const rows = standings(inSeason(list), players).filter((r) => r.pct != null);
    return new Map(rows.map((r, i) => [r.id, i + 1]));
  };
  const was = rank(before);
  const now = rank(upto);
  if (was.size >= 3 && now.size >= 3) {
    const leaderNow = [...now.entries()].find(([, r]) => r === 1)[0];
    const leaderWas = [...was.entries()].find(([, r]) => r === 1)[0];
    if (leaderNow !== leaderWas) facts.push({ cat: 'table', weight: 84, text: name(leaderNow) + ' goes top of the table' + (season ? ' for ' + season.name : '') + '.' });
    let climb = null;
    let fall = null;
    squad.forEach(({ id }) => {
      if (!was.has(id) || !now.has(id)) return;
      const d = was.get(id) - now.get(id);
      if (d >= 2 && (!climb || d > climb.d)) climb = { id, d };
      if (d <= -2 && (!fall || d < fall.d)) fall = { id, d };
    });
    if (climb && climb.id !== leaderNow) facts.push({ cat: 'table', weight: 60 + climb.d, text: name(climb.id) + ' climbs ' + climb.d + ' places to ' + ordinal(now.get(climb.id)) + '.' });
    if (fall) facts.push({ cat: 'table', weight: 48 - fall.d, text: name(fall.id) + ' drops ' + -fall.d + ' places to ' + ordinal(now.get(fall.id)) + '.' });
    if (leaderNow === leaderWas) facts.push({ cat: 'table', weight: 38, text: name(leaderNow) + ' stays top of the table.' });
  }

  // Upset meter: the night's ratings, never shown.
  const rated = (p) => (week.ratings && week.ratings[p.id] && week.ratings[p.id].ovr != null ? week.ratings[p.id].ovr : (players.find((x) => x.id === p.id) ? overall(players.find((x) => x.id === p.id)) : null));
  const avg = (list) => {
    const v = (list || []).map(rated).filter((x) => x != null);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };
  let upset = null;
  let decided = 0;
  let close = false; // the lower-rated side won, but only just lower
  tonight.forEach((x) => {
    if (x.o !== 'red' && x.o !== 'blue') return;
    const r = avg(x.m.red);
    const b = avg(x.m.blue);
    if (r == null || b == null) return;
    decided += 1;
    const gap = x.o === 'red' ? b - r : r - b; // how much stronger the losers were
    if (gap >= 1.5 && (!upset || gap > upset.gap)) upset = { ...x, gap };
    else if (gap > 0) close = true;
  });
  if (upset) {
    const level = upset.gap >= 5 ? 3 : upset.gap >= 3 ? 2 : 1;
    const word = ['', 'a mild upset', 'an upset', 'a big upset'][level];
    const side = upset.o === 'red' ? 'Red' : 'Blue';
    facts.push({ cat: 'upset', weight: 60 + level * 8, meter: level, text: side + '’s win' + (week.matches.length > 1 ? ' in match ' + upset.n : '') + ' was ' + word + ' — they were the lower-rated side.' });
  } else if (decided && close) facts.push({ cat: 'upset', weight: 34, meter: 0, text: 'No real upsets: every result went roughly to form.' });
  else if (decided) facts.push({ cat: 'upset', weight: 34, meter: 0, text: 'The form book held: the higher-rated side won ' + (decided === 1 ? 'the match' : 'every match') + '.' });

  return pick(facts, max);
}
