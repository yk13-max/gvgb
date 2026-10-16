// Questions about the results, in plain words: "Jo with Sam", "Sam vs Jo", "how many
// games have Jo, Sam and Priya played together?", or just a name. The words around the
// names do not matter; who is named, and whether "vs" sits between them, decides what is
// counted. A few words ask for more — "streak", "form", "nights", "goals", "biggest win" —
// and a question with no names at all asks about everyone: "who has played the most?".
//
// Follow-ups carry the subject over: after "Sam with Jo", "and against?" is Sam vs Jo,
// "what about with Priya?" adds Priya, and "streak?" is their run together.
import { firstName, shortName } from './names.js';
import { AWARDS, outcome, weekPlayerIds } from './weeks.js';

const fold = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']s\b/g, '') // "Sam’s streak" asks about Sam
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const VERSUS = /\b(vs|v|versus|against)\b/;
const FOLLOW = /^(and|also|plus|what about|how about|now|then|ok)\b\s*/;
const TOGETHER_WORD = /\b(together|with each other|same side|alongside)\b/;

// What is being asked for, beyond the basic count.
const INTENT = {
  streak: /\b(streak|run|form|last (five|5|three|3|few)|in a row|recent|lately)\b/,
  attendance: /\b(night|nights|attendance|turn(ed|s)? out|turnout|regular|missed|since|absent|seen)\b/,
  goals: /\b(goal|goals|score|scores|scoring|scored|biggest|heaviest|clean sheet|clean sheets|average|margin|conceded)\b/,
};
const MOST = /\b(most|least|fewest|best|worst|top)\b/;
const LEAST = /\b(least|fewest|worst)\b/;

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

// "since september", "since 2026-09-01", "since 4/9", "since 4/9/26".
function sinceDate(text, today) {
  const m = text.match(/\bsince\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|[a-z]+)\b/);
  if (!m) return null;
  const s = m[1];
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dm = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  const pad = (n) => String(n).padStart(2, '0');
  if (dm) {
    const y = dm[3] ? (dm[3].length === 2 ? '20' + dm[3] : dm[3]) : today.slice(0, 4);
    return y + '-' + pad(dm[2]) + '-' + pad(dm[1]);
  }
  const mi = MONTHS.findIndex((name) => name.startsWith(s.slice(0, 3)) && s.length >= 3);
  if (mi < 0) return null;
  // The most recent such month that has already started.
  const y = Number(today.slice(0, 4));
  const thisMonth = Number(today.slice(5, 7)) - 1;
  return (mi <= thisMonth ? y : y - 1) + '-' + pad(mi + 1) + '-01';
}

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

// Walks every match once and hands back the ones that matter for the question, newest
// first (weeks are newest first; within a week the later match comes first too).
function scan(weeks, test) {
  const out = [];
  (weeks || []).forEach((w) => {
    const rows = [];
    (w.matches || []).forEach((m, i) => {
      const o = outcome(m);
      if (o === 'off') return;
      const hit = test(m, w);
      if (!hit) return;
      const score = o === 'noscore' ? null : m.redScore + '–' + m.blueScore;
      let result = 'unscored';
      if (o === 'red' || o === 'blue') result = hit.side === 'none' ? 'played' : hit.side === o ? 'won' : 'lost';
      else if (o === 'draw') result = 'level';
      const gf = hit.side === 'red' ? m.redScore : hit.side === 'blue' ? m.blueScore : null;
      const ga = hit.side === 'red' ? m.blueScore : hit.side === 'blue' ? m.redScore : null;
      rows.push({ date: w.date, n: i + 1, of: w.matches.length, score, side: hit.side, result, note: hit.note || '', winner: o === 'red' || o === 'blue' ? o : null, gf: o === 'noscore' ? null : gf, ga: o === 'noscore' ? null : ga, m, w });
    });
    out.push(...rows.reverse());
  });
  return out;
}

// --- the extra sections -------------------------------------------------------------

// Form reads oldest to newest, like a results strip; the streak counts back from the
// latest result.
function formSection(list, who) {
  const decided = list.filter((m) => m.result === 'won' || m.result === 'lost');
  if (!decided.length) return null;
  let run = 0;
  const first = decided[0].result;
  for (const m of decided) {
    if (m.result !== first) break;
    run += 1;
  }
  const longest = (kind) => {
    let best = 0;
    let cur = 0;
    decided
      .slice()
      .reverse()
      .forEach((m) => {
        cur = m.result === kind ? cur + 1 : 0;
        best = Math.max(best, cur);
      });
    return best;
  };
  const last = decided.slice(0, 5).reverse();
  return {
    title: 'Form',
    line: who + (first === 'won' ? ' won' : ' lost') + ' the last ' + (run === 1 ? 'match' : run + ' in a row') + '.',
    form: last.map((m) => (m.result === 'won' ? 'W' : 'L')),
    facts: [
      ['Current run', (first === 'won' ? 'W' : 'L') + run],
      ['Longest winning run', longest('won')],
      ['Longest losing run', longest('lost')],
      ['Last ' + last.length, last.map((m) => (m.result === 'won' ? 'W' : 'L')).join(' ')],
    ],
  };
}

function attendanceSection(ids, weeks, who, since) {
  const dates = weeks.map((w) => w.date); // newest first
  const present = weeks.map((w) => {
    const set = new Set(weekPlayerIds(w).map((x) => x.id));
    return everyIn(ids, set);
  });
  const nights = present.filter(Boolean).length;
  let current = 0;
  for (const p of present) {
    if (!p) break;
    current += 1;
  }
  let longest = 0;
  let cur = 0;
  present.forEach((p) => {
    cur = p ? cur + 1 : 0;
    longest = Math.max(longest, cur);
  });
  const lastIdx = present.indexOf(true);
  const facts = [
    ['Turned out', nights + ' of ' + plural(dates.length, 'night')],
    ['Missed', dates.length - nights],
    ['Current run', current ? plural(current, 'night') + ' in a row' : 'missed the last night'],
    ['Longest run', plural(longest, 'night')],
  ];
  if (lastIdx >= 0) facts.push(['Last turned out', dates[lastIdx]]);
  if (since) {
    const n = present.filter((p, i) => p && dates[i] >= since).length;
    facts.push(['Since ' + since, plural(n, 'night')]);
  }
  return {
    title: 'Attendance',
    line: who + (current ? ' ' + (ids.length > 1 ? 'have' : 'has') + ' turned out the last ' + (current === 1 ? 'night' : current + ' nights running') : ' missed the last night') + ' — ' + nights + ' of ' + plural(dates.length, 'night') + ' recorded.',
    facts,
  };
}

function goalsSection(list, who) {
  const scored = list.filter((m) => m.gf != null);
  if (!scored.length) return null;
  const gf = scored.reduce((s, m) => s + m.gf, 0);
  const ga = scored.reduce((s, m) => s + m.ga, 0);
  const byMargin = scored.slice().sort((a, b) => b.gf - b.ga - (a.gf - a.ga));
  const best = byMargin[0];
  const worst = byMargin[byMargin.length - 1];
  const high = scored.slice().sort((a, b) => b.gf + b.ga - (a.gf + a.ga))[0];
  const facts = [
    ['Goals for', gf],
    ['Goals against', ga],
    ['Per match', (gf / scored.length).toFixed(1) + ' for · ' + (ga / scored.length).toFixed(1) + ' against'],
    ['Clean sheets', scored.filter((m) => m.ga === 0).length],
  ];
  if (best.gf > best.ga) facts.push(['Biggest win', best.score + ' · ' + best.date]);
  if (worst.gf < worst.ga) facts.push(['Heaviest defeat', worst.score + ' · ' + worst.date]);
  facts.push(['Highest-scoring', high.score + ' · ' + high.date]);
  return {
    title: 'Goals',
    line: who + (best.gf > best.ga ? '’s biggest win is ' + best.score + ' on ' + best.date : ' ' + (/ and /.test(who) ? 'have' : 'has') + ' not won yet') + '; ' + gf + ' scored and ' + ga + ' conceded across ' + plural(scored.length, 'match', 'matches') + '.',
    facts,
  };
}

// --- the subjects ---------------------------------------------------------------------

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
  return { mode: 'solo', headline, facts, matches, sided: matches, ids: [id], groups: [[id]], who: name, names: [name] };
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
    const aWins = split.filter((m) => m.winner && onSide(m.m[m.winner], a)).length;
    const bWins = split.filter((m) => m.winner && onSide(m.m[m.winner], b)).length;
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
  const matches = [...same, ...split].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.n - a.n));
  return { mode: 'together', headline, facts, matches, sided: same, ids, groups: [ids], who, names };
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
  return { mode: 'versus', headline, facts, matches: meetings, sided: meetings, ids: [...A, ...B], groups: [A, B], who: an, names: [an, bn] };
}

// Nobody named: the question is about everyone.
function everyone(weeks, players, intent, text, since) {
  const nights = new Map(players.map((p) => [p.id, 0]));
  const last = new Map();
  weeks.forEach((w) =>
    weekPlayerIds(w).forEach((p) => {
      if (!nights.has(p.id)) return;
      nights.set(p.id, nights.get(p.id) + 1);
      if (!last.has(p.id)) last.set(p.id, w.date);
    })
  );
  const least = LEAST.test(text);
  const total = weeks.length;
  let headline;
  let table = null;
  const facts = [];
  const sections = [];

  if (intent.attendance || (MOST.test(text) && !intent.goals && !intent.streak)) {
    let rows = players.map((p) => ({ name: nameOf(p, players), value: nights.get(p.id), extra: last.get(p.id) || 'never' }));
    if (since) {
      const missing = rows.filter((r) => r.extra === 'never' || r.extra < since);
      headline = missing.length ? joinNames(missing.map((r) => r.name)) + (missing.length === 1 ? ' has' : ' have') + ' not played since ' + since + '.' : 'Everyone on the roster has played since ' + since + '.';
      table = { title: 'Last turned out', rows: missing.map((r) => ({ name: r.name, value: r.extra })) };
    } else {
      rows = rows.sort((x, y) => (least ? x.value - y.value : y.value - x.value) || x.name.localeCompare(y.name));
      const top = rows[0];
      headline = top
        ? (least ? 'Fewest nights: ' : 'Most nights: ') + top.name + ' with ' + top.value + ' of ' + plural(total, 'night') + '.'
        : 'Nobody on the roster yet.';
      table = { title: 'Nights turned out', rows: rows.map((r) => ({ name: r.name, value: r.value + ' / ' + total })) };
    }
  } else if (intent.goals) {
    const all = scan(weeks, () => ({ side: 'red' }));
    const scored = all.filter((m) => m.gf != null);
    if (!scored.length) headline = 'No scored matches yet.';
    else {
      const goals = scored.reduce((s, m) => s + m.gf + m.ga, 0);
      const big = scored.slice().sort((a, b) => Math.abs(b.gf - b.ga) - Math.abs(a.gf - a.ga))[0];
      const high = scored.slice().sort((a, b) => b.gf + b.ga - (a.gf + a.ga))[0];
      const bigSide = big.gf > big.ga ? big.m.red : big.m.blue;
      headline = 'Biggest win so far: ' + big.score + ' on ' + big.date + (bigSide.length ? ', by ' + joinNames(bigSide.map((p) => shortName(p.name))) : '') + '.';
      facts.push(['Matches scored', scored.length], ['Goals', goals], ['Per match', (goals / scored.length).toFixed(1)], ['Highest-scoring', high.score + ' · ' + high.date], ['Biggest margin', big.score + ' · ' + big.date]);
      table = { title: 'Winning side that day', rows: bigSide.map((p) => ({ name: shortName(p.name), value: '' })) };
    }
  } else if (intent.streak) {
    // Everyone's current run, best first.
    const rows = players
      .map((p) => {
        const list = scan(weeks, (m) => (onSide(m.red, p.id) ? { side: 'red' } : onSide(m.blue, p.id) ? { side: 'blue' } : null)).filter((m) => m.result === 'won' || m.result === 'lost');
        if (!list.length) return null;
        let run = 0;
        for (const m of list) {
          if (m.result !== list[0].result) break;
          run += 1;
        }
        return { name: nameOf(p, players), kind: list[0].result, run };
      })
      .filter(Boolean)
      .sort((x, y) => (x.kind === y.kind ? y.run - x.run : x.kind === 'won' ? -1 : 1));
    const best = rows.find((r) => r.kind === 'won');
    headline = best ? 'Hottest streak: ' + best.name + ', won the last ' + (best.run === 1 ? 'match' : best.run + ' in a row') + '.' : 'Nobody is on a winning run right now.';
    table = { title: 'Current runs', rows: rows.map((r) => ({ name: r.name, value: (r.kind === 'won' ? 'W' : 'L') + r.run })) };
  } else {
    return null;
  }
  return { mode: 'everyone', headline, facts, sections, table, matches: [], sided: [], ids: [], groups: [], who: 'Everyone', names: [] };
}

// --- putting it together ----------------------------------------------------------------

function intentOf(text) {
  return { streak: INTENT.streak.test(text), attendance: INTENT.attendance.test(text), goals: INTENT.goals.test(text) };
}

function decorate(answer, intent, weeks, since) {
  const sections = [];
  if (answer.mode !== 'everyone') {
    const who = answer.mode === 'versus' ? answer.names[0] + ' against ' + answer.names[1] : answer.who;
    if (intent.streak) {
      const s = formSection(answer.sided, who);
      sections.push(s || { title: 'Form', line: 'No decided matches to read a run from yet.', facts: [] });
    }
    if (intent.attendance && answer.mode !== 'versus') sections.push(attendanceSection(answer.ids, weeks, answer.who, since));
    if (intent.goals) {
      const g = goalsSection(answer.sided, who);
      sections.push(g || { title: 'Goals', line: 'No scored matches yet.', facts: [] });
    }
  }
  return { ...answer, sections: [...(answer.sections || []), ...sections] };
}

export function ask(text, players, weeks, context, today) {
  const raw = String(text || '').trim();
  if (!raw) return { kind: 'empty' };
  const now = today || new Date().toISOString().slice(0, 10);
  const folded = fold(raw);
  const intent = intentOf(folded);
  const since = sinceDate(folded, now);
  const body = folded.replace(FOLLOW, '');
  const isFollow = !!context && (FOLLOW.test(folded) || !findPlayers(body, players).found.length);
  const sides = body.split(VERSUS).filter((_, i) => i % 2 === 0);
  const parsed = sides.map((s) => findPlayers(s, players));
  const ambiguous = parsed.flatMap((p) => p.ambiguous);
  if (ambiguous.length) return { kind: 'ambiguous', which: ambiguous };
  const groups = parsed.map((p) => p.found).filter((g) => g.length);
  const byId = (id) => players.find((p) => p.id === id);
  const prev = context && context.groups ? context.groups.map((g) => g.map(byId).filter(Boolean)).filter((g) => g.length) : null;

  let answer = null;
  if (groups.length >= 2) {
    const a = groups[0];
    const b = groups.slice(1).flat().filter((p) => !a.includes(p));
    if (b.length) answer = versus(a, b, weeks, players);
  }
  if (!answer && groups.length) {
    const g = groups.flat();
    const opens = VERSUS.test(body.split(' ').slice(0, 3).join(' ')) && !parsed[0].found.length;
    if (isFollow && prev && prev.length) {
      const base = prev.flat().filter((p) => !g.includes(p));
      // "and against Priya?" — the subject so far takes on the newcomers; "and with
      // Priya?" / "what about Priya?" — the newcomers join the subject.
      answer = opens && base.length ? versus(base, g, weeks, players) : base.length + g.length > 1 ? together([...base, ...g], weeks, players) : solo(g[0], weeks, players);
    } else answer = g.length === 1 ? solo(g[0], weeks, players) : together(g, weeks, players);
  }
  if (!answer && !groups.length && prev && prev.length) {
    const flat = prev.flat();
    if (VERSUS.test(body) && flat.length >= 2) {
      // "and against?" — the pair becomes a meeting; a bigger group splits first versus rest.
      answer = prev.length >= 2 ? versus(prev[0], prev.slice(1).flat(), weeks, players) : versus([flat[0]], flat.slice(1), weeks, players);
    } else if (TOGETHER_WORD.test(body) && flat.length >= 2) answer = together(flat, weeks, players);
    else if (intent.streak || intent.attendance || intent.goals) {
      answer = prev.length >= 2 ? versus(prev[0], prev.slice(1).flat(), weeks, players) : flat.length === 1 ? solo(flat[0], weeks, players) : together(flat, weeks, players);
    }
  }
  if (!answer && !groups.length) {
    answer = everyone(weeks, players, intent, folded, since);
    if (!answer) return { kind: 'nobody' };
  }
  let out = decorate(answer, intent, weeks, since);
  // A follow-up that only asks for more ("streak?") leads with that, not with the count
  // the thread already has.
  if (!groups.length && prev && out.sections.length && out.sections[0].line) out = { ...out, sub: out.headline, headline: out.sections[0].line };
  // A question about everyone leaves the previous subject in place, so "who has played
  // the most?" in the middle of a thread does not lose the pair you were asking about.
  const subject = out.mode === 'everyone' && context ? context : { groups: out.groups, mode: out.mode };
  return { kind: 'answer', ...out, subject };
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
  out.push(top[0] + '’s form', 'who has played the most nights?', 'biggest win');
  return out;
}

// What to ask next, given what was just answered.
export function followUps(answer) {
  if (!answer || answer.kind !== 'answer') return [];
  const has = (t) => (answer.sections || []).some((s) => s.title === t);
  const out = [];
  if (answer.mode === 'together' && answer.ids.length === 2) out.push('and against?');
  if (answer.mode === 'versus') out.push('and together?');
  if (answer.mode !== 'everyone') {
    if (!has('Form')) out.push('streak?');
    if (!has('Goals')) out.push('goals?');
    if (answer.mode !== 'versus' && !has('Attendance')) out.push('nights?');
  }
  return out;
}
