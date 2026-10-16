// Questions about the results, in plain words: "Jo with Sam", "Sam vs Jo", "how many
// games have Jo, Sam and Priya played together?", or just a name. The words around the
// names do not matter; who is named, and whether "vs" sits between them, decides what is
// counted.
import { firstName, shortName } from './names.js';
import { AWARDS, outcome, weekPlayerIds } from './weeks.js';

const fold = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const VERSUS = /\b(vs|v|versus|against)\b/;

// Everything a player might be called: full name, first name, surname, "Jo R", nicknames.
function aliases(p) {
  const full = fold(p.name);
  const parts = full.split(' ');
  const out = new Set([full]);
  if (parts.length > 1) {
    out.add(parts[0]);
    out.add(parts[parts.length - 1]);
    out.add(parts[0] + ' ' + parts[1][0]);
  }
  (p.nicknames || []).forEach((n) => {
    const f = fold(n);
    if (f) out.add(f);
  });
  return [...out].filter(Boolean).map((a) => ({ words: a.split(' '), exact: a === full || (p.nicknames || []).some((n) => fold(n) === a) }));
}

// Finds the players named in a run of text. Longest match wins at each position; a word
// that could be two people (two Jos, neither given a surname) is reported, not guessed.
function findPlayers(text, players) {
  const words = fold(text).split(' ').filter(Boolean);
  const table = players.map((p) => ({ p, aliases: aliases(p) }));
  const found = [];
  const ambiguous = [];
  let i = 0;
  while (i < words.length) {
    let best = null;
    for (let k = Math.min(4, words.length - i); k >= 1; k--) {
      const span = words.slice(i, i + k).join(' ');
      const hits = [];
      table.forEach(({ p, aliases: as }) => {
        const a = as.find((x) => x.words.join(' ') === span);
        if (a) hits.push({ p, exact: a.exact });
      });
      if (hits.length) {
        best = { k, hits, span };
        break;
      }
    }
    if (!best) {
      i += 1;
      continue;
    }
    const exact = best.hits.filter((h) => h.exact);
    const pick = exact.length === 1 ? exact : best.hits;
    if (pick.length === 1) {
      if (!found.includes(pick[0].p)) found.push(pick[0].p);
    } else {
      ambiguous.push({ text: best.span, options: pick.map((h) => h.p) });
    }
    i += best.k;
  }
  return { found, ambiguous };
}

const onSide = (list, id) => (list || []).some((p) => p.id === id);
const allOn = (list, ids) => ids.every((id) => onSide(list, id));
const everyIn = (ids, set) => ids.every((id) => set.has(id));

function record(list) {
  const won = list.filter((m) => m.result === 'won').length;
  const lost = list.filter((m) => m.result === 'lost').length;
  const decided = won + lost;
  return { won, lost, pct: decided ? won / decided : null };
}

function nameOf(p, players) {
  const clash = players.some((o) => o.id !== p.id && fold(firstName(o.name)) === fold(firstName(p.name)));
  return clash ? shortName(p.name) : firstName(p.name);
}

function joinNames(list) {
  if (list.length <= 1) return list.join('');
  return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}

const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
const fmtPct = (pct) => (pct == null ? null : pct.toFixed(3));

// Walks every match once and hands back the ones that matter for the question.
function scan(weeks, test) {
  const out = [];
  (weeks || []).forEach((w) => {
    (w.matches || []).forEach((m, i) => {
      const o = outcome(m);
      if (o === 'off') return;
      const hit = test(m, w);
      if (!hit) return;
      const score = o === 'noscore' ? null : m.redScore + '–' + m.blueScore;
      let result = 'unscored';
      if (o === 'red' || o === 'blue') result = hit.side === 'none' ? 'played' : hit.side === o ? 'won' : 'lost';
      else if (o === 'draw') result = 'level';
      out.push({ date: w.date, n: i + 1, of: w.matches.length, score, side: hit.side, result, note: hit.note || '', winner: o === 'red' || o === 'blue' ? o : null });
    });
  });
  return out;
}

function solo(p, weeks, players) {
  const id = p.id;
  const nights = weeks.filter((w) => weekPlayerIds(w).some((x) => x.id === id));
  const matches = scan(weeks, (m) => (onSide(m.red, id) ? { side: 'red' } : onSide(m.blue, id) ? { side: 'blue' } : null));
  const r = record(matches);
  const awards = [];
  AWARDS.forEach(([k, label]) => {
    const n = weeks.filter((w) => w.awards && w.awards[k] === id).length;
    if (n) awards.push({ key: k, label: k === 'potm' ? 'POTM' : label.replace('Best ', '').replace(/^\w/, (c) => c.toUpperCase()), n });
  });
  // Who they line up with, and against, most often.
  const withCount = new Map();
  const vsCount = new Map();
  weeks.forEach((w) =>
    (w.matches || []).forEach((m) => {
      if (outcome(m) === 'off') return;
      const mine = onSide(m.red, id) ? m.red : onSide(m.blue, id) ? m.blue : null;
      if (!mine) return;
      const theirs = mine === m.red ? m.blue : m.red;
      mine.forEach((x) => x.id !== id && withCount.set(x.id, (withCount.get(x.id) || 0) + 1));
      (theirs || []).forEach((x) => vsCount.set(x.id, (vsCount.get(x.id) || 0) + 1));
    })
  );
  const top = (map) => {
    const [bestId, n] = [...map.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    const who = players.find((x) => x.id === bestId);
    return who ? { who, n } : null;
  };
  const name = nameOf(p, players);
  const headline = matches.length
    ? name + ' has turned out ' + plural(nights.length, 'night') + ' and played ' + plural(matches.length, 'match', 'matches') + ': ' + r.won + ' won, ' + r.lost + ' lost' + (r.pct != null ? ' (' + fmtPct(r.pct) + ')' : '') + '.'
    : name + ' has not played a match yet.';
  const facts = [
    ['Nights', nights.length],
    ['Matches', matches.length],
    ['Won', r.won],
    ['Lost', r.lost],
    ['PCT', fmtPct(r.pct) || '–'],
    ['Nominations', awards.length ? awards.map((a) => a.n + ' ' + a.label).join(' · ') : 'none yet'],
  ];
  const w = top(withCount);
  const v = top(vsCount);
  if (w) facts.push(['Most often alongside', nameOf(w.who, players) + ' · ' + plural(w.n, 'match', 'matches')]);
  if (v) facts.push(['Most often against', nameOf(v.who, players) + ' · ' + plural(v.n, 'match', 'matches')]);
  if (nights.length) facts.push(['Last played', nights[0].date]);
  return { mode: 'solo', headline, facts, matches, names: [name] };
}

function together(group, weeks, players) {
  const ids = group.map((p) => p.id);
  const nights = weeks.filter((w) => {
    const set = new Set(weekPlayerIds(w).map((x) => x.id));
    return everyIn(ids, set);
  });
  const same = scan(weeks, (m) => (allOn(m.red, ids) ? { side: 'red' } : allOn(m.blue, ids) ? { side: 'blue' } : null));
  const split = scan(weeks, (m) => {
    const present = ids.every((id) => onSide(m.red, id) || onSide(m.blue, id));
    if (!present || allOn(m.red, ids) || allOn(m.blue, ids)) return null;
    const a = ids.filter((id) => onSide(m.red, id)).map((id) => shortName(players.find((p) => p.id === id).name));
    const b = ids.filter((id) => onSide(m.blue, id)).map((id) => shortName(players.find((p) => p.id === id).name));
    return { side: 'none', note: a.join(', ') + ' on red · ' + b.join(', ') + ' on blue' };
  });
  const r = record(same);
  const names = group.map((p) => nameOf(p, players));
  const who = joinNames(names);
  let h2h = null;
  if (group.length === 2) {
    const [a, b] = ids;
    const aWins = split.filter((m) => m.winner && onSide(weeks.find((w) => w.date === m.date).matches[m.n - 1][m.winner], a)).length;
    const bWins = split.filter((m) => m.winner && onSide(weeks.find((w) => w.date === m.date).matches[m.n - 1][m.winner], b)).length;
    h2h = { aWins, bWins };
  }
  let headline;
  if (!same.length && !split.length) headline = who + ' have not been on the pitch together yet.';
  else {
    headline = who + ' have been on the same side ' + plural(same.length, 'time') + (same.length ? ' — ' + r.won + ' won, ' + r.lost + ' lost' : '') + ' — and on opposite sides ' + plural(split.length, 'time') + (h2h && split.length ? ' (' + names[0] + ' ' + h2h.aWins + ', ' + names[1] + ' ' + h2h.bWins + ')' : '') + '.';
  }
  const facts = [
    ['Nights all turned out', nights.length],
    ['Same side', plural(same.length, 'match', 'matches')],
    ['Record together', same.length ? r.won + '–' + r.lost + (r.pct != null ? ' · ' + fmtPct(r.pct) : '') : '–'],
    ['Opposite sides', plural(split.length, 'match', 'matches')],
  ];
  if (h2h) facts.push(['Head to head', split.length ? names[0] + ' ' + h2h.aWins + ' · ' + names[1] + ' ' + h2h.bWins : '–']);
  if (same.length) facts.push(['Last on the same side', same[0].date]);
  return { mode: 'together', headline, facts, matches: [...same, ...split].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.n - b.n)), names };
}

function versus(a, b, weeks, players) {
  const A = a.map((p) => p.id);
  const B = b.map((p) => p.id);
  const meetings = scan(weeks, (m) => (allOn(m.red, A) && allOn(m.blue, B) ? { side: 'red' } : allOn(m.blue, A) && allOn(m.red, B) ? { side: 'blue' } : null));
  const r = record(meetings);
  const an = joinNames(a.map((p) => nameOf(p, players)));
  const bn = joinNames(b.map((p) => nameOf(p, players)));
  const headline = meetings.length
    ? an + (a.length > 1 ? ' have' : ' has') + ' faced ' + bn + ' ' + plural(meetings.length, 'time') + ': ' + (r.won === r.lost ? 'level at ' + r.won + '–' + r.lost : r.won > r.lost ? r.won + '–' + r.lost + ' to ' + an : r.lost + '–' + r.won + ' to ' + bn) + '.'
    : an + (a.length > 1 ? ' have' : ' has') + ' not faced ' + bn + ' yet.';
  const facts = [
    ['Meetings', meetings.length],
    [an + ' won', r.won],
    [bn + ' won', r.lost],
  ];
  if (meetings.length) facts.push(['Last meeting', meetings[0].date]);
  return { mode: 'versus', headline, facts, matches: meetings, names: [an, bn] };
}

export function ask(text, players, weeks) {
  const raw = String(text || '').trim();
  if (!raw) return { kind: 'empty' };
  const sides = fold(raw).split(VERSUS).filter((_, i) => i % 2 === 0);
  const parsed = sides.map((s) => findPlayers(s, players));
  const ambiguous = parsed.flatMap((p) => p.ambiguous);
  if (ambiguous.length) return { kind: 'ambiguous', which: ambiguous };
  const groups = parsed.map((p) => p.found).filter((g) => g.length);
  if (!groups.length) return { kind: 'nobody' };
  if (groups.length >= 2) {
    const a = groups[0];
    const b = groups.slice(1).flat().filter((p) => !a.includes(p));
    if (b.length) return { kind: 'answer', ...versus(a, b, weeks, players) };
  }
  const g = groups.flat();
  return { kind: 'answer', ...(g.length === 1 ? solo(g[0], weeks, players) : together(g, weeks, players)) };
}

// Ready-made questions, from whoever has played most, so the examples are real.
export function examples(players, weeks) {
  const games = new Map();
  (weeks || []).forEach((w) => weekPlayerIds(w).forEach((p) => games.set(p.id, (games.get(p.id) || 0) + 1)));
  const top = players
    .slice()
    .sort((x, y) => (games.get(y.id) || 0) - (games.get(x.id) || 0) || x.name.localeCompare(y.name))
    .slice(0, 3)
    .map((p) => nameOf(p, players));
  if (top.length < 2) return top.length ? [top[0]] : [];
  const out = [top[0] + ' with ' + top[1], top[0] + ' vs ' + top[1]];
  if (top.length > 2) out.push(top[0] + ', ' + top[1] + ' and ' + top[2] + ' together');
  out.push(top[0]);
  return out;
}
