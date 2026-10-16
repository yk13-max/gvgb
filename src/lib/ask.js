// Questions about the results, in plain words. The box understands who is named (players
// by name, surname, "Jo R" or nickname; clubs by name; positions), what slice of the data
// is meant (a season, "since September", "last night", "at Goals", "6-a-side", "the nights
// Karthi was best defender", "the matches Sam lost"), and what is being asked for (the
// count, scores, streak and form, attendance, goals, awards, ratings, partners, opponents,
// honours, or a ranking of everyone by any of those). The words in between do not matter.
//
// Follow-ups carry the subject and the slice over: after "Sam with Jo since September",
// "and against?" is Sam vs Jo over the same period, "what about with Priya?" adds Priya,
// "streak?" is their run together, and "he"/"they" mean whoever was last asked about.
import { CLUBS } from './clubs.js';
import { HONOURS, bestPlayer, frontRunners, isFinished, lead } from './honours.js';
import { ABBR, STATS, overall } from './model.js';
import { firstName, shortName } from './names.js';
import { ALL, currentSeason, labelFor, sortSeasons, weeksIn } from './seasons.js';
import { AWARDS, outcome, weekPlayerIds } from './weeks.js';

// --- text --------------------------------------------------------------------------------

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

const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
const fmtPct = (pct) => (pct == null ? null : pct.toFixed(3));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function joinNames(list) {
  if (list.length <= 1) return list.join('');
  return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}

function nameOf(p, players) {
  const clash = players.some((o) => o.id !== p.id && fold(firstName(o.name)) === fold(firstName(p.name)));
  return clash ? shortName(p.name) : firstName(p.name);
}

// --- recognising things in the words -------------------------------------------------

// Everything a player might be called: full name, first name, surname, "Jo R", nicknames.
function playerAliases(p) {
  const full = fold(p.name);
  const parts = full.split(' ');
  const out = new Map([[full, true]]);
  if (parts.length > 1) {
    out.set(parts[0], false);
    out.set(parts[parts.length - 1], false);
    out.set(parts[0] + ' ' + parts[1][0], false);
  }
  (p.nicknames || []).forEach((n) => {
    const f = fold(n);
    if (f) out.set(f, true);
  });
  return [...out.entries()].map(([a, exact]) => ({ words: a.split(' '), exact }));
}

const CLUB_ALIASES = {
  MUN: ['man utd', 'man united', 'united', 'manchester utd'],
  MCI: ['man city', 'city'],
  TOT: ['spurs', 'tottenham'],
  WOL: ['wolves'],
  NFO: ['forest', 'nottingham forest', 'notts forest'],
  AVL: ['villa'],
  CRY: ['palace'],
  WHU: ['west ham', 'hammers'],
  WBA: ['west brom', 'wba', 'baggies'],
  SHU: ['sheffield united', 'blades', 'sheff utd'],
  SOU: ['saints'],
  POR: ['pompey'],
  MID: ['boro'],
  QPR: ['qpr'],
  BHA: ['brighton'],
  NEW: ['newcastle', 'toon'],
  LEE: ['leeds'],
  IPS: ['ipswich'],
  HUL: ['hull'],
  COV: ['coventry'],
  BRC: ['bristol city'],
  BLB: ['blackburn', 'rovers'],
  BWN: ['bolton'],
  CAR: ['cardiff'],
  CHA: ['charlton'],
  DER: ['derby'],
  LIN: ['lincoln'],
  NOR: ['norwich', 'canaries'],
  PNE: ['preston'],
  STK: ['stoke'],
  SWA: ['swansea', 'swans'],
  WRX: ['wrexham'],
  BAR: ['barca', 'barcelona'],
  RMA: ['real madrid', 'madrid', 'real'],
  ATM: ['atletico', 'atleti', 'atletico madrid'],
  ATH: ['athletic', 'bilbao', 'athletic bilbao'],
  RSO: ['real sociedad', 'sociedad'],
  BET: ['betis', 'real betis'],
  SEV: ['sevilla'],
  VAL: ['valencia'],
  VIL: ['villarreal'],
  CEL: ['celta'],
  DEP: ['deportivo', 'depor'],
  ESP: ['espanyol'],
  GET: ['getafe'],
  LEV: ['levante'],
  MAL: ['malaga'],
  OSA: ['osasuna'],
  RAC: ['racing', 'racing santander'],
  RAY: ['rayo'],
  ALA: ['alaves'],
  ELC: ['elche'],
  FCB: ['bayern', 'bayern munich'],
  BVB: ['dortmund'],
  BMG: ['gladbach', 'monchengladbach'],
  B04: ['leverkusen'],
  RBL: ['leipzig'],
  SGE: ['frankfurt', 'eintracht'],
  VFB: ['stuttgart'],
  SCF: ['freiburg'],
  TSG: ['hoffenheim'],
  M05: ['mainz'],
  KOE: ['koln', 'cologne'],
  S04: ['schalke'],
  HSV: ['hamburg', 'hsv'],
  SVW: ['bremen', 'werder'],
  UNB: ['union berlin'],
  FCA: ['augsburg'],
  SCP: ['paderborn'],
  ELV: ['elversberg'],
  PSG: ['psg', 'paris'],
  MAR: ['marseille'],
  LYO: ['lyon'],
  ASM: ['monaco'],
  LOS: ['lille'],
  OGC: ['nice'],
  RCL: ['lens'],
  REN: ['rennes'],
  STR: ['strasbourg'],
  TOU: ['toulouse'],
  BRS: ['brest'],
  AJA: ['auxerre'],
  SCO: ['angers'],
  HAC: ['le havre'],
  FCL: ['lorient'],
  EST: ['troyes'],
  LEM: ['le mans'],
  PFC: ['paris fc'],
  JUV: ['juve', 'juventus'],
  INT: ['inter'],
  MIL: ['milan', 'ac milan'],
  NAP: ['napoli'],
  ROM: ['roma'],
  LAZ: ['lazio'],
  ATA: ['atalanta'],
  FIO: ['fiorentina'],
  BOL: ['bologna'],
  TOR: ['torino'],
  GEN: ['genoa'],
  CAG: ['cagliari'],
  UDI: ['udinese'],
  SAS: ['sassuolo'],
  LEC: ['lecce'],
  PAR: ['parma'],
  COM: ['como'],
  VEN: ['venezia'],
  MON: ['monza'],
  FRO: ['frosinone'],
};
const clubTable = CLUBS.map((c) => ({
  item: c,
  aliases: [fold(c.name), ...(CLUB_ALIASES[c.code] || [])].map((a) => ({ words: a.split(' '), exact: true })),
}));

const POSITION_WORDS = [
  ['Goalkeeper', ['goalkeeper', 'goalkeepers', 'keeper', 'keepers', 'gk', 'gks', 'goalie', 'goalies']],
  ['Defender', ['defender', 'defenders', 'defence', 'defense']],
  ['Midfielder', ['midfielder', 'midfielders', 'midfield', 'mids']],
  ['Striker', ['striker', 'strikers', 'forward', 'forwards', 'attackers']],
];
const positionTable = POSITION_WORDS.map(([pos, list]) => ({ item: pos, aliases: list.map((a) => ({ words: a.split(' '), exact: true })) }));

const AWARD_PHRASES = [
  ['potm', ['potm', 'potms', 'player of the match', 'player of the night', 'man of the match', 'motm', 'mvp', 'best player']],
  ['attacker', ['best attacker', 'attacker award', 'best striker', 'best forward', 'top attacker']],
  ['midfielder', ['best midfielder', 'midfielder award', 'best mid', 'top midfielder']],
  ['defender', ['best defender', 'defender award', 'top defender']],
  ['any', ['award', 'awards', 'nomination', 'nominations', 'nominated', 'nominate', 'gong', 'gongs']],
];
const awardTable = AWARD_PHRASES.map(([key, list]) => ({ item: key, aliases: list.map((a) => ({ words: a.split(' '), exact: true })) }));
const AWARD_LABEL = { potm: 'POTM', attacker: 'best attacker', midfielder: 'best midfielder', defender: 'best defender', any: 'an award' };

// Finds items in the words, longest match first, consuming what it matches. A span that
// could be two people (two Jos, neither given a surname) is reported, not guessed.
function findSpans(words, table, used) {
  const found = [];
  const ambiguous = [];
  let i = 0;
  while (i < words.length) {
    if (used[i]) {
      i += 1;
      continue;
    }
    let best = null;
    for (let k = Math.min(4, words.length - i); k >= 1; k--) {
      if (used.slice(i, i + k).some(Boolean)) continue;
      const span = words.slice(i, i + k).join(' ');
      const hits = [];
      table.forEach(({ item, aliases }) => {
        const a = aliases.find((x) => x.words.join(' ') === span);
        if (a) hits.push({ item, exact: a.exact });
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
    if (pick.length === 1) found.push({ start: i, len: best.k, item: pick[0].item });
    else ambiguous.push({ text: best.span, options: pick.map((h) => h.item) });
    for (let j = i; j < i + best.k; j++) used[j] = true;
    i += best.k;
  }
  return { found, ambiguous };
}

// --- when ----------------------------------------------------------------------------------

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_RE = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*';
const DAY_RE = '(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}(?:/\\d{2,4})?|\\d{1,2}(?:st|nd|rd|th)?\\s+' + MONTH_RE + '(?:\\s+\\d{4})?|' + MONTH_RE + '\\s+\\d{1,2}(?:st|nd|rd|th)?(?:\\s+\\d{4})?)';
const WHEN_RE = '(' + DAY_RE + '|' + MONTH_RE + '(?:\\s+\\d{4})?|\\d{4})';
const pad = (n) => String(n).padStart(2, '0');
const WORD_NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

function monthIndex(s) {
  const i = MONTHS.findIndex((m) => m.startsWith(s.slice(0, 3)));
  return i;
}

function lastDay(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

// "4/9", "4/9/26", "2026-09-04", "4th september", "september 4 2026", "september", "2026".
function parseWhen(expr, today) {
  const s = expr.trim();
  const ty = Number(today.slice(0, 4));
  const tm = Number(today.slice(5, 7)) - 1;
  let m;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) return { from: s, to: s, kind: 'day', label: s };
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/))) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : ty;
    const iso = y + '-' + pad(m[2]) + '-' + pad(m[1]);
    return { from: iso, to: iso, kind: 'day', label: iso };
  }
  if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)(?:\s+(\d{4}))?$/)) || (m = s.match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?$/))) {
    const dayFirst = /^\d/.test(s);
    const d = Number(dayFirst ? m[1] : m[2]);
    const mi = monthIndex(dayFirst ? m[2] : m[1]);
    if (mi < 0) return null;
    const y = m[3] ? Number(m[3]) : mi <= tm ? ty : ty - 1;
    const iso = y + '-' + pad(mi + 1) + '-' + pad(d);
    return { from: iso, to: iso, kind: 'day', label: iso };
  }
  if ((m = s.match(/^([a-z]+)(?:\s+(\d{4}))?$/))) {
    const mi = monthIndex(m[1]);
    if (mi < 0) return null;
    const y = m[2] ? Number(m[2]) : mi <= tm ? ty : ty - 1;
    return { from: y + '-' + pad(mi + 1) + '-01', to: y + '-' + pad(mi + 1) + '-' + pad(lastDay(y, mi)), kind: 'month', label: cap(MONTHS[mi]) + (m[2] ? ' ' + m[2] : '') };
  }
  if ((m = s.match(/^(\d{4})$/))) return { from: s + '-01-01', to: s + '-12-31', kind: 'year', label: s };
  return null;
}

const dayBefore = (iso) => {
  const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)) - 1);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
};

function findWhen(text, today) {
  let rest = text;
  const when = { from: null, to: null, exact: null, last: null, bits: [] };
  const take = (re, fn) => {
    const m = rest.match(re);
    if (!m) return;
    const w = fn(m);
    if (w !== false) rest = rest.replace(m[0], ' ');
  };
  take(new RegExp('\\b(since|from|after|starting)\\s+' + WHEN_RE, 'i'), (m) => {
    const w = parseWhen(m[2], today);
    if (!w) return false;
    when.from = w.from;
    when.bits.push('since ' + w.label);
    return true;
  });
  take(new RegExp('\\b(before|until|till|up to|through)\\s+' + WHEN_RE, 'i'), (m) => {
    const w = parseWhen(m[2], today);
    if (!w) return false;
    when.to = m[1] === 'before' ? dayBefore(w.from) : w.to;
    when.bits.push(m[1] + ' ' + w.label);
    return true;
  });
  take(new RegExp('\\b(in|during|over)\\s+(' + MONTH_RE + '(?:\\s+\\d{4})?|\\d{4})\\b', 'i'), (m) => {
    const w = parseWhen(m[2], today);
    if (!w) return false;
    when.from = w.from;
    when.to = w.to;
    when.bits.push('in ' + w.label);
    return true;
  });
  take(new RegExp('\\b(?:on\\s+)?' + DAY_RE + '\\b', 'i'), (m) => {
    const w = parseWhen(m[0].replace(/^on\s+/, ''), today);
    if (!w || w.kind !== 'day') return false;
    when.exact = w.from;
    when.bits.push(w.label);
    return true;
  });
  take(/\blast\s+(\d+|two|three|four|five|six|seven|eight|nine|ten)\s+(nights?|weeks?|sessions?)\b/, (m) => {
    when.last = WORD_NUM[m[1]] || Number(m[1]);
    when.bits.push('last ' + plural(when.last, 'night'));
    return true;
  });
  take(/\b(last (night|week|time|session|outing)|latest|most recent(ly)?|yesterday)\b/, () => {
    when.last = 1;
    when.bits.push('last night');
    return true;
  });
  return { rest, when };
}

// --- what is being asked --------------------------------------------------------------

const FOLLOW = /^(and|also|plus|what about|how about|now|then|ok|so)\b\s*/;
const VERSUS = /\b(vs|v|versus|against)\b/;
const PRONOUN = /\b(he|she|they|him|her|them|his|hers|their|theirs|that player|those two|the pair|the same)\b/;
const TOGETHER_WORD = /\b(together|with each other|same side|alongside|teammates|team mates)\b/;

const INTENT = {
  streak: /\b(streak|streaks|run|form|last (five|5|three|3|few) (games|matches|results)?|in a row|recent form|lately|hot|cold)\b/,
  attendance: /\b(nights?|attendance|turn(ed|s)? out|turnout|regular|regulars|missed|absent|seen|showed up|turn up|appearances?)\b/,
  goals: /\b(goals?|scoring|scored|biggest|heaviest|clean sheets?|average goals|margin|conceded|thrash\w*|hammer\w*)\b/,
  scores: /\b(scores?|scorelines?|results?|what happened|how did|how was|recap|rundown)\b/,
  ratings: /\b(ratings?|ovr|overall|rated|stats?|strongest|weakest|highest rated|lowest rated|pace|shooting|passing|defending|physical|dribbling|stamina|goalkeeping|vision|positioning|fastest|quickest|slowest|improved|improvement|improving|progress|progressed|dropped|declined|regressed|climbed|risen)\b/,
  partners: /\b(partners?|team ?mates?|best with|worst with|wins? (the )?most with|plays? (best |most |well )?with|line(s|d)? up with|alongside most|who does \w+ play with|combination)\b/,
  opponents: /\b(opponents?|rivals?|nemesis|bogey|beat(s|en)? (the )?most|lose[sd]? to|lost to (the )?most|loses? to|plays? against most|against most|who beats?)\b/,
  honours: /\b(honours?|honors?|winner|winners|champion|champions|won the (season|league|title)|trophy|title|season winner)\b/,
  roster: /\b(who (supports?|follows?|is a fan)|supporters?|fans?|roster|squad|how many players|list (of )?players|which players)\b/,
  summary: /\b(how many|how often|how much|count|total|totals|summary|overview|we|us|our|overall|played)\b/,
};
const SUPER_DESC = /\b(most|highest|top|best|biggest|longest|strongest|hottest|greatest|leading|leader)\b/;
const SUPER_ASC = /\b(least|fewest|lowest|worst|shortest|weakest|coldest|bottom)\b/;
const TOP_N = /\b(?:top|first|best|worst)\s+(\d+|two|three|four|five|six|seven|eight|nine|ten)\b|\b(\d+|two|three|four|five|six|seven|eight|nine|ten)\s+(?:best|worst|most|top)\b/;

// Measures a ranking of everyone can be by. The first that matches a word in the question
// wins; "best"/"worst" alone means the record.
const MEASURES = [
  { key: 'potm', re: /\b(potm|potms)\b/, label: 'POTM awards' },
  { key: 'attacker', re: /\b(best attacker|attacker award)\b/, label: 'best attacker awards' },
  { key: 'midfielder', re: /\b(best midfielder|midfielder award)\b/, label: 'best midfielder awards' },
  { key: 'defender', re: /\b(best defender|defender award)\b/, label: 'best defender awards' },
  { key: 'total', re: /\b(nominations?|awards?|nominated|gongs?)\b/, label: 'nominations' },
  { key: 'cleanSheets', re: /\bclean sheets?\b/, label: 'clean sheets' },
  { key: 'run', re: /\b(streak|run|form|hottest|coldest|in a row)\b/, label: 'current run' },
  { key: 'won', re: /\b(won|wins|win|victories|winning|winners?)\b/, label: 'wins' },
  { key: 'lost', re: /\b(lost|losses|loses|defeats|losing|losers?)\b/, label: 'losses' },
  { key: 'pct', re: /\b(record|records|win ratio|ratio|pct|percentage|successful|success rate)\b/, label: 'win ratio' },
  { key: 'goalsFor', re: /\b(goals?|scoring|scored)\b/, label: 'goals by their sides' },
  { key: 'games', re: /\b(matches|games)\b/, label: 'matches' },
  { key: 'nights', re: /\b(nights?|attendance|appearances?|turn(ed|s)? out|turnout|regular|regulars|played|seen)\b/, label: 'nights' },
];
const STAT_WORDS = {
  Pace: /\b(pace|fastest|quickest|slowest|speed)\b/,
  Shooting: /\b(shooting|shot|finisher|finishing)\b/,
  Passing: /\b(passing|passer)\b/,
  Defending: /\b(defending|tackl\w*)\b/,
  Physical: /\b(physical|physicality|strength)\b/,
  Dribbling: /\b(dribbling|dribbler)\b/,
  Stamina: /\b(stamina|fittest|fitness|engine)\b/,
  Goalkeeping: /\b(goalkeeping|handling)\b/,
  Vision: /\b(vision)\b/,
  Positioning: /\b(positioning)\b/,
};

// --- the data, sliced --------------------------------------------------------------------

const onSide = (list, id) => (list || []).some((p) => p.id === id);
const allOn = (list, ids) => ids.every((id) => onSide(list, id));
const everyIn = (ids, set) => ids.every((id) => set.has(id));

// Walks every match once and hands back the ones that matter, newest first (weeks are
// newest first; within a week the later match comes first too).
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

function record(list) {
  const won = list.filter((m) => m.result === 'won').length;
  const lost = list.filter((m) => m.result === 'lost').length;
  const decided = won + lost;
  return { won, lost, pct: decided ? won / decided : null };
}

function runOf(list) {
  const decided = list.filter((m) => m.result === 'won' || m.result === 'lost');
  if (!decided.length) return null;
  let run = 0;
  for (const m of decided) {
    if (m.result !== decided[0].result) break;
    run += 1;
  }
  return { kind: decided[0].result, run };
}

// One row per player over a slice of weeks: everything a ranking or a listing might need.
function rowsFor(weeks, roster) {
  return roster.map((p) => {
    const id = p.id;
    const list = scan(weeks, (m) => (onSide(m.red, id) ? { side: 'red' } : onSide(m.blue, id) ? { side: 'blue' } : null));
    const r = record(list);
    const scored = list.filter((m) => m.gf != null);
    const row = {
      p,
      id,
      name: null,
      nights: weeks.filter((w) => weekPlayerIds(w).some((x) => x.id === id)).length,
      games: list.length,
      won: r.won,
      lost: r.lost,
      pct: r.pct,
      potm: 0,
      attacker: 0,
      midfielder: 0,
      defender: 0,
      total: 0,
      cleanSheets: scored.filter((m) => m.ga === 0).length,
      goalsFor: scored.reduce((s, m) => s + m.gf, 0),
      goalsAgainst: scored.reduce((s, m) => s + m.ga, 0),
      run: runOf(list),
      ovr: overall(p),
      stats: p.stats,
      firstOvr: null, // what they were rated at the oldest snapshot in the slice
      last: null,
    };
    for (let i = weeks.length - 1; i >= 0; i--) {
      const snap = weeks[i].ratings && weeks[i].ratings[id];
      if (snap && snap.ovr != null) {
        row.firstOvr = snap.ovr;
        row.firstDate = weeks[i].date;
        break;
      }
    }
    weeks.forEach((w) => {
      AWARDS.forEach(([k]) => {
        if (w.awards && w.awards[k] === id) {
          row[k] += 1;
          row.total += 1;
        }
      });
      if (!row.last && weekPlayerIds(w).some((x) => x.id === id)) row.last = w.date;
    });
    return row;
  });
}

// --- answers for a subject ----------------------------------------------------------

function solo(p, weeks, players, only) {
  const id = p.id;
  const nights = weeks.filter((w) => weekPlayerIds(w).some((x) => x.id === id));
  const all = scan(weeks, (m) => (onSide(m.red, id) ? { side: 'red' } : onSide(m.blue, id) ? { side: 'blue' } : null));
  const matches = only ? all.filter((m) => m.result === only) : all;
  const r = record(all);
  const awards = [];
  AWARDS.forEach(([k, label]) => {
    const n = weeks.filter((w) => w.awards && w.awards[k] === id).length;
    if (n) awards.push({ key: k, label: k === 'potm' ? 'POTM' : cap(label.replace('Best ', '')), n });
  });
  const name = nameOf(p, players);
  let headline;
  if (!all.length) headline = name + ' has not played a match' + (only ? '' : ' yet') + '.';
  else if (only) headline = name + ' has ' + only + ' ' + matches.length + ' of ' + plural(all.length, 'match', 'matches') + ' (' + r.won + ' won, ' + r.lost + ' lost).';
  else headline = name + ' has turned out ' + plural(nights.length, 'night') + ' and played ' + plural(all.length, 'match', 'matches') + ': ' + r.won + ' won, ' + r.lost + ' lost' + (r.pct != null ? ' (' + fmtPct(r.pct) + ')' : '') + '.';
  const facts = [
    ['Nights', nights.length],
    ['Matches', all.length],
    ['Won', r.won],
    ['Lost', r.lost],
    ['PCT', fmtPct(r.pct) || '–'],
    ['Nominations', awards.length ? awards.map((a) => a.n + ' ' + a.label).join(' · ') : 'none'],
  ];
  // Who they line up with, and against, most often.
  const withCount = new Map();
  const vsCount = new Map();
  all.forEach((x) => {
    const mine = x.m[x.side] || [];
    const theirs = x.m[x.side === 'red' ? 'blue' : 'red'] || [];
    mine.forEach((o) => o.id !== id && withCount.set(o.id, (withCount.get(o.id) || 0) + 1));
    theirs.forEach((o) => vsCount.set(o.id, (vsCount.get(o.id) || 0) + 1));
  });
  const top = (map) => {
    const [bestId, n] = [...map.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    const who = players.find((x) => x.id === bestId);
    return who ? nameOf(who, players) + ' · ' + plural(n, 'match', 'matches') : null;
  };
  const w = top(withCount);
  const v = top(vsCount);
  if (w) facts.push(['Most often alongside', w]);
  if (v) facts.push(['Most often against', v]);
  if (nights.length) facts.push(['Last played', nights[0].date]);
  return { mode: 'solo', headline, facts, matches, sided: all, ids: [id], groups: [[id]], who: name, names: [name], player: p };
}

function together(group, weeks, players, only) {
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
    h2h = { aWins: split.filter((m) => m.winner && onSide(m.m[m.winner], a)).length, bWins: split.filter((m) => m.winner && onSide(m.m[m.winner], b)).length };
  }
  let headline;
  if (only) {
    const n = same.filter((m) => m.result === only).length;
    headline = who + ' have ' + only + ' ' + n + ' of the ' + plural(same.length, 'match', 'matches') + ' they played on the same side.';
  } else if (!same.length && !split.length) headline = who + ' have not been on the pitch together yet.';
  else headline = who + ' have been on the same side ' + plural(same.length, 'time') + (same.length ? ' — ' + r.won + ' won, ' + r.lost + ' lost' : '') + ' — and on opposite sides ' + plural(split.length, 'time') + (h2h && split.length ? ' (' + names[0] + ' ' + h2h.aWins + ', ' + names[1] + ' ' + h2h.bWins + ')' : '') + '.';
  const facts = [
    ['Nights all turned out', nights.length],
    ['Same side', plural(same.length, 'match', 'matches')],
    ['Record together', same.length ? r.won + '–' + r.lost + (r.pct != null ? ' · ' + fmtPct(r.pct) : '') : '–'],
    ['Opposite sides', plural(split.length, 'match', 'matches')],
  ];
  if (h2h) facts.push(['Head to head', split.length ? names[0] + ' ' + h2h.aWins + ' · ' + names[1] + ' ' + h2h.bWins : '–']);
  if (same.length) facts.push(['Last on the same side', same[0].date]);
  const matches = only ? same.filter((m) => m.result === only) : [...same, ...split].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.n - a.n));
  return { mode: 'together', headline, facts, matches, sided: same, ids, groups: [ids], who, names };
}

function versus(a, b, weeks, players, only) {
  const A = a.map((p) => p.id);
  const B = b.map((p) => p.id);
  const meetings = scan(weeks, (m) => (allOn(m.red, A) && allOn(m.blue, B) ? { side: 'red' } : allOn(m.blue, A) && allOn(m.red, B) ? { side: 'blue' } : null));
  const r = record(meetings);
  const an = joinNames(a.map((p) => nameOf(p, players)));
  const bn = joinNames(b.map((p) => nameOf(p, players)));
  const have = a.length > 1 ? ' have' : ' has';
  let headline;
  if (only === 'won') headline = an + have + ' beaten ' + bn + ' ' + plural(r.won, 'time') + ' in ' + plural(meetings.length, 'meeting') + '.';
  else if (only === 'lost') headline = an + have + ' lost to ' + bn + ' ' + plural(r.lost, 'time') + ' in ' + plural(meetings.length, 'meeting') + '.';
  else
    headline = meetings.length
      ? an + have + ' faced ' + bn + ' ' + plural(meetings.length, 'time') + ': ' + (r.won === r.lost ? 'level at ' + r.won + '–' + r.lost : r.won > r.lost ? r.won + '–' + r.lost + ' to ' + an : r.lost + '–' + r.won + ' to ' + bn) + '.'
      : an + have + ' not faced ' + bn + ' yet.';
  const facts = [
    ['Meetings', meetings.length],
    [an + ' won', r.won],
    [bn + ' won', r.lost],
  ];
  if (meetings.length) facts.push(['Last meeting', meetings[0].date]);
  return { mode: 'versus', headline, facts, matches: only ? meetings.filter((m) => m.result === only) : meetings, sided: meetings, ids: [...A, ...B], groups: [A, B], who: an, names: [an, bn] };
}

// --- extra sections on a subject -----------------------------------------------------

function formSection(list, who) {
  const decided = list.filter((m) => m.result === 'won' || m.result === 'lost');
  if (!decided.length) return { title: 'Form', line: 'No decided matches to read a run from yet.', facts: [] };
  const cur = runOf(decided);
  const longest = (kind) => {
    let best = 0;
    let c = 0;
    decided
      .slice()
      .reverse()
      .forEach((m) => {
        c = m.result === kind ? c + 1 : 0;
        best = Math.max(best, c);
      });
    return best;
  };
  const last = decided.slice(0, 5).reverse();
  return {
    title: 'Form',
    line: who + (cur.kind === 'won' ? ' won' : ' lost') + ' the last ' + (cur.run === 1 ? 'match' : cur.run + ' in a row') + '.',
    form: last.map((m) => (m.result === 'won' ? 'W' : 'L')),
    facts: [
      ['Current run', (cur.kind === 'won' ? 'W' : 'L') + cur.run],
      ['Longest winning run', longest('won')],
      ['Longest losing run', longest('lost')],
      ['Last ' + last.length, last.map((m) => (m.result === 'won' ? 'W' : 'L')).join(' ')],
    ],
  };
}

function attendanceSection(ids, weeks, who, since) {
  const dates = weeks.map((w) => w.date);
  const present = weeks.map((w) => everyIn(ids, new Set(weekPlayerIds(w).map((x) => x.id))));
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
  if (since) facts.push(['Since ' + since, plural(present.filter((p, i) => p && dates[i] >= since).length, 'night')]);
  const have = ids.length > 1 ? 'have' : 'has';
  return {
    title: 'Attendance',
    line: who + (current ? ' ' + have + ' turned out the last ' + (current === 1 ? 'night' : current + ' nights running') : ' missed the last night') + ' — ' + nights + ' of ' + plural(dates.length, 'night') + ' recorded.',
    facts,
  };
}

function goalsSection(list, who) {
  const scored = list.filter((m) => m.gf != null);
  if (!scored.length) return { title: 'Goals', line: 'No scored matches yet.', facts: [] };
  const gf = scored.reduce((s, m) => s + m.gf, 0);
  const ga = scored.reduce((s, m) => s + m.ga, 0);
  const byMargin = scored.slice().sort((a, b) => b.gf - b.ga - (a.gf - a.ga));
  const best = byMargin[0];
  const worst = byMargin[byMargin.length - 1];
  const high = scored.slice().sort((a, b) => b.gf + b.ga - (a.gf + a.ga))[0];
  // Goals are recorded for a side, never for a scorer: every number here is what the
  // side a player was on scored or let in, and scores read from that side's point of view.
  const theirs = (m) => m.gf + '–' + m.ga + ' on ' + (m.side === 'red' ? 'Red' : 'Blue') + ' · ' + m.date;
  const facts = [
    ['Their side scored', gf],
    ['Their side conceded', ga],
    ['Per match', (gf / scored.length).toFixed(1) + ' for · ' + (ga / scored.length).toFixed(1) + ' against'],
    ['Clean sheets (side)', scored.filter((m) => m.ga === 0).length],
  ];
  if (best.gf > best.ga) facts.push(['Biggest win', theirs(best)]);
  if (worst.gf < worst.ga) facts.push(['Heaviest defeat', theirs(worst)]);
  facts.push(['Highest-scoring', theirs(high)]);
  const side = / and /.test(who) ? who + '’s side' : who + '’s side';
  return {
    title: 'Goals',
    line: 'Across ' + plural(scored.length, 'match', 'matches') + ', ' + side + ' scored ' + gf + ' and conceded ' + ga + (best.gf > best.ga ? '; the biggest win was ' + best.gf + '–' + best.ga + ' on ' + best.date : '') + '. Goals count for the side, not the scorer.',
    facts,
  };
}

function awardsSection(ids, weeks, players, who) {
  const rows = [];
  ids.forEach((id) => {
    const p = players.find((x) => x.id === id);
    AWARDS.forEach(([k, label]) => {
      const nights = weeks.filter((w) => w.awards && w.awards[k] === id).map((w) => w.date);
      if (nights.length) rows.push({ name: (ids.length > 1 ? nameOf(p, players) + ' · ' : '') + (k === 'potm' ? 'POTM' : label), value: plural(nights.length, 'time'), nights });
    });
  });
  const total = rows.reduce((s, r) => s + r.nights.length, 0);
  const potm = rows.filter((r) => /POTM/.test(r.name)).reduce((s, r) => s + r.nights.length, 0);
  return {
    title: 'Awards',
    line: total ? who + (ids.length > 1 ? ' have' : ' has') + ' ' + plural(total, 'nomination') + (potm ? ', ' + plural(potm, 'POTM award') : '') + '.' : who + (ids.length > 1 ? ' have' : ' has') + ' not been nominated yet.',
    facts: rows.map((r) => [r.name, r.value + ' · ' + r.nights.slice(0, 3).join(', ') + (r.nights.length > 3 ? ' …' : '')]),
  };
}

function ratingsSection(p, weeks, players, showValues) {
  const name = nameOf(p, players);
  if (!showValues) return { title: 'Ratings', line: 'Ratings are only shown when signed in.', facts: [] };
  const ovr = overall(p);
  const top = STATS.map((k) => [k, Number(p.stats[k]) || 0]).sort((a, b) => b[1] - a[1]);
  const facts = [
    ['OVR', ovr],
    ['Position', p.pos + ((p.alt || []).length ? ' · also ' + p.alt.join(', ') : '')],
    ['Best at', top.slice(0, 3).map(([k, v]) => ABBR[k] + ' ' + v).join(' · ')],
    ['Weakest', top.slice(-2).map(([k, v]) => ABBR[k] + ' ' + v).join(' · ')],
    ['All ten', STATS.map((k) => ABBR[k] + ' ' + (Number(p.stats[k]) || 0)).join(' · ')],
  ];
  // The oldest snapshot in the slice says what they were rated then.
  const snaps = weeks.filter((w) => w.ratings && w.ratings[p.id]);
  let line = name + ' is rated ' + ovr + ' overall as a ' + p.pos.toLowerCase() + '.';
  if (snaps.length) {
    const first = snaps[snaps.length - 1];
    const was = first.ratings[p.id].ovr;
    const delta = ovr - was;
    facts.push(['Rated on ' + first.date, was]);
    facts.push(['Change since', delta === 0 ? 'none' : (delta > 0 ? '+' : '') + delta]);
    const moved = STATS.map((k) => [k, (Number(p.stats[k]) || 0) - (Number(first.ratings[p.id].stats && first.ratings[p.id].stats[k]) || 0)]).filter(([, d]) => d !== 0).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    if (moved.length) facts.push(['Biggest moves', moved.slice(0, 3).map(([k, d]) => ABBR[k] + ' ' + (d > 0 ? '+' : '') + d).join(' · ')]);
    if (delta !== 0) line = name + ' is rated ' + ovr + ' overall, ' + (delta > 0 ? 'up ' : 'down ') + Math.abs(delta) + ' since ' + first.date + '.';
  }
  return { title: 'Ratings', line, facts };
}

// Who a player lines up with, or against, and how that goes.
function companySection(p, weeks, players, kind, text) {
  const id = p.id;
  const map = new Map();
  weeks.forEach((w) =>
    (w.matches || []).forEach((m) => {
      const o = outcome(m);
      if (o === 'off') return;
      const mine = onSide(m.red, id) ? 'red' : onSide(m.blue, id) ? 'blue' : null;
      if (!mine) return;
      const list = kind === 'partners' ? m[mine] : m[mine === 'red' ? 'blue' : 'red'];
      (list || []).forEach((x) => {
        if (x.id === id) return;
        const e = map.get(x.id) || { id: x.id, games: 0, won: 0, lost: 0 };
        e.games += 1;
        if (o === mine) e.won += 1;
        else if (o === 'red' || o === 'blue') e.lost += 1;
        map.set(x.id, e);
      });
    })
  );
  const rows = [...map.values()].map((e) => ({ ...e, pct: e.won + e.lost ? e.won / (e.won + e.lost) : null, name: players.find((x) => x.id === e.id) ? nameOf(players.find((x) => x.id === e.id), players) : 'Unknown' }));
  const name = nameOf(p, players);
  if (!rows.length) return { title: kind === 'partners' ? 'Partners' : 'Opponents', line: name + ' has not played yet.', facts: [] };
  let sortBy = 'games';
  if (kind === 'partners' && /\b(best|well|successful)\b/.test(text)) sortBy = 'pct';
  else if (kind === 'partners' && /\b(win|wins|won)\b/.test(text)) sortBy = 'won';
  else if (kind === 'partners' && /\b(worst|lose|loses|lost)\b/.test(text)) sortBy = 'lost';
  else if (kind === 'opponents' && /\b(beat|beats|beaten|win|wins|won)\b/.test(text) && !/\b(lose|loses|lost|beats \w+|who beats)\b/.test(text)) sortBy = 'won';
  else if (kind === 'opponents' && /\b(lose|loses|lost|nemesis|bogey|who beats|beats \w+)\b/.test(text)) sortBy = 'lost';
  else if (/\b(best|worst)\b/.test(text)) sortBy = 'pct';
  const asc = /\b(worst|least|fewest)\b/.test(text) && sortBy === 'pct';
  const sorted = rows.slice().sort((a, b) => {
    if (sortBy === 'pct') {
      const av = a.games >= 2 ? a.pct : -1;
      const bv = b.games >= 2 ? b.pct : -1;
      return (asc ? av - bv : bv - av) || b.games - a.games || a.name.localeCompare(b.name);
    }
    return b[sortBy] - a[sortBy] || b.games - a.games || a.name.localeCompare(b.name);
  });
  const top = sorted[0];
  const title = kind === 'partners' ? 'Partners' : 'Opponents';
  const rec = top.won + '–' + top.lost + ' in ' + plural(top.games, 'match', 'matches');
  const line =
    sortBy === 'games'
      ? name + ' has played most often ' + (kind === 'partners' ? 'alongside ' : 'against ') + top.name + ' (' + rec + ').'
      : sortBy === 'won'
        ? name + (kind === 'partners' ? ' wins most with ' + top.name : ' beats ' + top.name + ' most') + ' (' + rec + ').'
        : sortBy === 'lost'
          ? name + (kind === 'partners' ? ' loses most with ' : ' loses most to ') + top.name + ' (' + rec + ').'
          : name + ' has the ' + (asc ? 'worst' : 'best') + ' record ' + (kind === 'partners' ? 'with ' : 'against ') + top.name + ' (' + rec + ').';
  return { title, line, facts: [], table: { title: kind === 'partners' ? 'Alongside' : 'Against', rows: sorted.slice(0, 12).map((r) => ({ name: r.name, value: r.won + '–' + r.lost + ' in ' + r.games + (r.pct != null ? ' · ' + fmtPct(r.pct) : '') })) } };
}

// --- answers about everyone --------------------------------------------------------------

function ranking(rows, measure, dir, n, players, scopeLabel) {
  const value = (r) => (measure.key === 'run' ? (r.run ? (r.run.kind === 'won' ? r.run.run : -r.run.run) : null) : measure.key === 'delta' ? (r.firstOvr == null ? null : r.ovr - r.firstOvr) : measure.stat ? Number(r.stats[measure.stat]) || 0 : measure.key === 'pct' ? (r.won + r.lost >= 2 ? r.pct : null) : r[measure.key]);
  const fmt = (r) => {
    const v = value(r);
    if (v == null) return '–';
    if (measure.key === 'run') return (r.run.kind === 'won' ? 'W' : 'L') + r.run.run;
    if (measure.key === 'delta') return (v > 0 ? '+' : '') + v + ' · ' + r.firstOvr + ' → ' + r.ovr + ' since ' + r.firstDate;
    if (measure.key === 'pct') return fmtPct(v) + ' · ' + r.won + '–' + r.lost;
    if (measure.key === 'nights') return v + (scopeLabel ? ' / ' + scopeLabel : '');
    return String(v);
  };
  const asc = dir === 'asc';
  const sorted = rows
    .slice()
    .sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (av == null || bv == null) return av == null && bv == null ? a.name.localeCompare(b.name) : av == null ? 1 : -1;
      return (asc ? av - bv : bv - av) || b.games - a.games || a.name.localeCompare(b.name);
    })
    .map((r) => ({ name: r.name, value: fmt(r) }));
  const top = sorted[0];
  const label = measure.label;
  const topRow = top && rows.find((r) => r.name === top.name);
  const topText = measure.key === 'nights' && topRow ? topRow.nights + ' of ' + plural(scopeLabel || 0, 'night') : top && top.value;
  const headline = !top || value(topRow) == null
    ? 'Nothing to rank by ' + label + ' yet.'
    : measure.key === 'delta'
      ? (asc ? 'Biggest drop: ' : 'Most improved: ') + top.name + ', ' + topText + '.'
      : (measure.key === 'pct' || measure.stat || measure.key === 'ovr' ? (asc ? 'Lowest ' : 'Best ') : asc ? 'Fewest ' : 'Most ') + label + ': ' + top.name + (measure.key === 'pct' || measure.key === 'run' || measure.stat || measure.key === 'ovr' ? ', ' + topText : ' with ' + topText) + '.';
  return { headline: headline.replace('Best win ratio', 'Best record').replace('Lowest win ratio', 'Worst record'), table: { title: cap(label), rows: sorted.slice(0, n || 12) } };
}

function overview(weeks, rows) {
  const all = scan(weeks, () => ({ side: 'red' }));
  const scored = all.filter((m) => m.gf != null);
  const red = scored.filter((m) => m.gf > m.ga).length;
  const blue = scored.filter((m) => m.ga > m.gf).length;
  const goals = scored.reduce((s, m) => s + m.gf + m.ga, 0);
  const used = rows.filter((r) => r.nights > 0);
  const mostNights = rows.slice().sort((a, b) => b.nights - a.nights || a.name.localeCompare(b.name))[0];
  const mostPotm = rows.slice().sort((a, b) => b.potm - a.potm || a.name.localeCompare(b.name))[0];
  const leader = rows.filter((r) => r.games >= 1 && r.pct != null).sort((a, b) => b.pct - a.pct || b.games - a.games || a.name.localeCompare(b.name))[0];
  const headline = weeks.length
    ? plural(weeks.length, 'night') + ' and ' + plural(all.length, 'match', 'matches') + ' recorded: Red ' + red + ', Blue ' + blue + (goals ? ', ' + plural(goals, 'goal') : '') + '.'
    : 'Nothing recorded in that slice.';
  const facts = [
    ['Nights', weeks.length],
    ['Matches', all.length],
    ['Red wins', red],
    ['Blue wins', blue],
    ['Goals', goals + (scored.length ? ' · ' + (goals / scored.length).toFixed(1) + ' per match' : '')],
    ['Players used', used.length],
  ];
  if (mostNights && mostNights.nights) facts.push(['Most nights', mostNights.name + ' · ' + mostNights.nights]);
  if (mostPotm && mostPotm.potm) facts.push(['Most POTMs', mostPotm.name + ' · ' + mostPotm.potm]);
  if (leader) facts.push(['Best record', leader.name + ' · ' + leader.won + '–' + leader.lost + ' · ' + fmtPct(leader.pct)]);
  return { headline, facts };
}

function nightSummary(w, players, showValues) {
  const list = scan([w], (m) => ({ side: 'none', note: 'RED ' + (m.red || []).map((p) => shortName(p.name)).join(', ') + ' · BLUE ' + (m.blue || []).map((p) => shortName(p.name)).join(', ') }));
  const scored = list.filter((m) => m.score);
  const red = scored.filter((m) => m.winner === 'red').length;
  const blue = scored.filter((m) => m.winner === 'blue').length;
  const squad = weekPlayerIds(w);
  const facts = [
    ['Matches', list.length],
    ['Red wins', red],
    ['Blue wins', blue],
    ['Players', squad.length],
  ];
  if (w.venue) facts.push(['Venue', w.venue]);
  AWARDS.forEach(([k, label]) => {
    const id = w.awards && w.awards[k];
    if (id == null) return;
    const p = squad.find((x) => x.id === id) || players.find((x) => x.id === id);
    facts.push([k === 'potm' ? 'POTM' : label, p ? shortName(p.name) : 'Unknown']);
  });
  if (showValues && w.ratings && Object.keys(w.ratings).length) {
    const avg = (m, side) => {
      const vals = (m[side] || []).map((p) => w.ratings[p.id] && w.ratings[p.id].ovr).filter((v) => v != null);
      return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
    };
    const pairs = [];
    (w.matches || []).forEach((m, i) => {
      const r = avg(m, 'red');
      const b = avg(m, 'blue');
      if (r == null || b == null || pairs.some((x) => x.r === r && x.b === b)) return;
      pairs.push({ i, r, b });
    });
    pairs.forEach(({ i, r, b }) => facts.push(['Sides rated' + (pairs.length > 1 ? ' (match ' + (i + 1) + ')' : ''), 'Red ' + r + ' · Blue ' + b + (r === b ? ' · level' : ' · ' + (r > b ? 'Red' : 'Blue') + ' by ' + Math.abs(r - b))]));
  }
  const headline = w.date + (w.venue ? ' at ' + w.venue : '') + ': ' + plural(list.length, 'match', 'matches') + (scored.length ? ' — Red ' + red + ', Blue ' + blue + ', scores ' + scored.map((m) => m.score).join(', ') : '') + '.';
  return { headline, facts, matches: list };
}

function awardsList(weeks, players) {
  const rows = [];
  weeks.forEach((w) => {
    AWARDS.forEach(([k, label]) => {
      const id = w.awards && w.awards[k];
      if (id == null) return;
      const p = weekPlayerIds(w).find((x) => x.id === id) || players.find((x) => x.id === id);
      rows.push({ name: w.date + ' · ' + (k === 'potm' ? 'POTM' : label.replace('Best ', '')), value: p ? shortName(p.name) : 'Unknown' });
    });
  });
  const potm = weeks.map((w) => w.awards && w.awards.potm).filter((v) => v != null);
  const headline = rows.length
    ? (weeks.length === 1 ? 'On ' + weeks[0].date + ': ' : plural(weeks.length, 'night') + ', ' + plural(rows.length, 'nomination') + '. ') + (weeks.length === 1 ? rows.map((r) => r.name.split(' · ')[1] + ' ' + r.value).join(', ') + '.' : 'Latest POTM: ' + (rows.find((r) => /POTM/.test(r.name)) || { value: 'none' }).value + '.')
    : 'No nominations saved for ' + (weeks.length === 1 ? 'that night' : 'those nights') + '.';
  return { headline, facts: [], table: rows.length ? { title: 'Nominations', rows } : null, potm };
}

function honoursAnswer(season, seasons, weeks, players, today) {
  if (!season) return { headline: 'No seasons set up yet — create one from the Seasons button.', facts: [] };
  const sw = weeksIn(weeks, String(season.id), seasons);
  const finished = isFinished(season, seasons, today);
  const facts = [];
  if (finished) {
    const h = season.honours || {};
    const best = bestPlayer(sw, players);
    HONOURS.forEach(([key, label]) => {
      const p = key === 'player' ? best && players.find((x) => x.id === best.id) : h[key] != null ? players.find((x) => x.id === h[key]) : null;
      facts.push([label, p ? p.name : 'Not yet named']);
    });
    const winner = h.winner != null ? players.find((x) => x.id === h.winner) : null;
    return { headline: season.name + ': ' + (winner ? winner.name + ' won it' : 'the winner is not yet named') + (best ? ', ' + nameOf(players.find((x) => x.id === best.id), players) + ' best player with ' + plural(best.potm, 'POTM') : '') + '.', facts };
  }
  const fr = frontRunners(sw, players);
  HONOURS.forEach(([key, label]) => {
    const f = fr[key];
    facts.push([label + ' (front runner)', f ? nameOf(f.row.p || players.find((x) => x.id === f.row.id), players) + ' · ' + lead(f) : 'Nobody yet']);
  });
  const w = fr.winner;
  return { headline: season.name + ' is still in progress' + (w ? ' — ' + nameOf(players.find((x) => x.id === w.row.id), players) + ' leads the table (' + w.row.won + '–' + w.row.lost + ').' : '.'), facts };
}

// --- parsing -------------------------------------------------------------------------------

function parse(text, data, context) {
  const { players, seasons, today } = data;
  const folded = fold(text);
  const follow = FOLLOW.test(folded);
  let rest = folded.replace(FOLLOW, '');
  const q = { follow, pronoun: false, allTime: false, season: null, when: null, venue: null, teamSize: null, names: [], groups: [], clubs: [], positions: [], award: null, only: null, intent: {}, superlative: null, topN: null, measure: null, stat: null, ambiguous: [], text: folded };

  if (/\b(all time|all-time|ever|overall|in total|whole history|every season)\b/.test(rest)) {
    q.allTime = true;
    rest = rest.replace(/\b(all time|all-time|ever|in total|whole history|every season)\b/g, ' ');
  }
  const sorted = sortSeasons(seasons);
  const cur = currentSeason(seasons, today);
  if (/\bthis season\b/.test(rest) && cur) {
    q.season = cur;
    rest = rest.replace(/\bthis season\b/, ' ');
  } else if (/\b(last|previous) season\b/.test(rest) && cur) {
    const i = sorted.findIndex((s) => s.id === cur.id);
    q.season = sorted[i - 1] || null;
    rest = rest.replace(/\b(last|previous) season\b/, ' ');
  }
  sorted
    .slice()
    .sort((a, b) => fold(b.name).length - fold(a.name).length)
    .forEach((s) => {
      const f = fold(s.name);
      if (f && new RegExp('(^|\\s)' + f.replace(/[/-]/g, '\\$&') + '(\\s|$)').test(rest)) {
        q.season = s;
        rest = rest.replace(f, ' ');
      }
    });
  rest = rest.replace(/\bseason\b/g, ' ');

  const whenFound = findWhen(rest, today);
  rest = whenFound.rest;
  q.when = whenFound.when;

  const venues = [...new Set(data.weeks.map((w) => fold(w.venue)).filter(Boolean))];
  venues.forEach((v) => {
    const re = new RegExp('\\b(?:at|in)\\s+' + v.replace(/[/-]/g, '\\$&') + '\\b');
    if (re.test(rest)) {
      q.venue = v;
      rest = rest.replace(re, ' ');
    }
  });
  const ts = rest.match(/\b([56]|five|six)\s*-?\s*a\s*-?\s*sides?\b|\b([56])s\b/);
  if (ts) {
    const v = ts[1] || ts[2];
    q.teamSize = v === 'five' ? 5 : v === 'six' ? 6 : Number(v);
    rest = rest.replace(ts[0], ' ');
  }

  // Names, clubs, positions and award phrases, consuming the words they use.
  const words = rest.split(' ');
  const used = words.map((w) => !w);
  const playerTable = players.map((p) => ({ item: p, aliases: playerAliases(p) }));
  const ps = findSpans(words, playerTable, used);
  q.ambiguous = ps.ambiguous;
  const aw = findSpans(words, awardTable, used);
  const cs = findSpans(words, clubTable, used);
  const pos = findSpans(words, positionTable, used);
  q.clubs = cs.found.map((f) => f.item);
  q.positions = pos.found.map((f) => f.item);

  // Which side of a "vs" each name falls on.
  const vsIdx = words.map((w, i) => (!used[i] && VERSUS.test(w) ? i : -1)).filter((i) => i >= 0);
  const sideOf = (start) => vsIdx.filter((i) => i < start).length;
  const bySide = new Map();
  ps.found.forEach((f) => {
    const s = sideOf(f.start);
    if (!bySide.has(s)) bySide.set(s, []);
    if (!bySide.get(s).includes(f.item)) bySide.get(s).push(f.item);
  });
  q.groups = [...bySide.entries()].sort((a, b) => a[0] - b[0]).map(([, g]) => g);
  q.names = q.groups.flat();
  q.opensWithVersus = vsIdx.length > 0 && ps.found.length > 0 && vsIdx[0] < ps.found[0].start;

  // An award phrase next to a name is a filter: the nights that player won it. On its
  // own it is a measure to rank by, or a listing.
  if (aw.found.length) {
    const a = aw.found[0];
    const near = ps.found.filter((f) => Math.abs(f.start - a.start) <= 6).sort((x, y) => Math.abs(x.start - a.start) - Math.abs(y.start - a.start))[0];
    const who = near ? near.item : ps.found.length === 1 ? ps.found[0].item : null;
    q.award = { key: a.item, player: a.item === 'any' ? null : who };
  }

  const left = words.filter((w, i) => !used[i]).join(' ');
  q.left = left;
  q.pronoun = PRONOUN.test(left);
  Object.keys(INTENT).forEach((k) => {
    q.intent[k] = INTENT[k].test(left);
  });
  if (q.season && /\b(won|win|wins|winner|champion)\b/.test(left) && !SUPER_DESC.test(left) && !SUPER_ASC.test(left)) q.intent.honours = true;
  if (q.award && !q.award.player) q.intent.awards = true;
  if (q.award && q.award.key === 'any' && q.names.length) q.award = null;
  if (SUPER_ASC.test(left)) q.superlative = 'asc';
  else if (SUPER_DESC.test(left)) q.superlative = 'desc';
  const tn = left.match(TOP_N);
  if (tn) q.topN = WORD_NUM[tn[1] || tn[2]] || Number(tn[1] || tn[2]);
  const statKey = Object.keys(STAT_WORDS).find((k) => STAT_WORDS[k].test(left));
  if (statKey) q.stat = statKey;
  q.measure = MEASURES.find((m) => m.re.test(left)) || null;
  if (q.measure && ['won', 'lost', 'goalsFor', 'games'].includes(q.measure.key) && /\b(biggest|heaviest|largest|highest|margin|thrash\w*|hammer\w*|scoring)\b/.test(left)) q.measure = null;
  if (q.award && !q.award.player) q.measure = MEASURES.find((m) => m.key === (q.award.key === 'any' ? 'total' : q.award.key));
  if (/\b(won|win|wins|victor\w*|beat|beaten)\b/.test(left)) q.only = 'won';
  else if (/\b(lost|lose|loses|losing|defeat\w*)\b/.test(left)) q.only = 'lost';
  return q;
}

// --- putting it together ---------------------------------------------------------------

function sliceWeeks(q, data, subjectIds) {
  const { weeks, seasons, pickerKey } = data;
  const bits = [];
  let out;
  const explicit = q.allTime || q.season || q.when.from || q.when.to || q.when.exact || q.when.last;
  if (q.season) {
    out = weeksIn(weeks, String(q.season.id), seasons);
    bits.push(q.season.name);
  } else if (explicit || !pickerKey || pickerKey === ALL) {
    out = weeks;
    if (q.allTime) bits.push('all time');
  } else {
    out = weeksIn(weeks, pickerKey, seasons);
    bits.push(labelFor(pickerKey, seasons));
  }
  if (q.when.from) out = out.filter((w) => w.date >= q.when.from);
  if (q.when.to) out = out.filter((w) => w.date <= q.when.to);
  if (q.when.exact) out = out.filter((w) => w.date === q.when.exact);
  bits.push(...q.when.bits);
  if (q.venue) {
    out = out.filter((w) => fold(w.venue) === q.venue);
    bits.push('at ' + cap(q.venue));
  }
  if (q.teamSize) {
    out = out.filter((w) => (w.teamSize || 5) === q.teamSize);
    bits.push(q.teamSize + '-a-side');
  }
  if (q.when.last) {
    const mine = subjectIds && subjectIds.length ? out.filter((w) => everyIn(subjectIds, new Set(weekPlayerIds(w).map((x) => x.id)))) : out;
    out = mine.slice(0, q.when.last);
  }
  return { weeks: out, bits };
}

export function ask(text, data, context) {
  const raw = String(text || '').trim();
  if (!raw) return { kind: 'empty' };
  const { players, showValues, today, seasons } = data;
  const q = parse(raw, data, context);
  if (q.ambiguous.length) return { kind: 'ambiguous', which: q.ambiguous };

  // Follow-ups: no new names, or a leading "and"/"what about", or a pronoun.
  const byId = (id) => players.find((p) => p.id === id);
  const prev = context && context.groups ? context.groups.map((g) => g.map(byId).filter(Boolean)).filter((g) => g.length) : null;
  const prevFlat = prev ? prev.flat() : [];
  const isFollow = !!prev && !q.superlative && !q.topN && (q.follow || q.pronoun || (!q.names.length && !q.clubs.length && !q.positions.length && (q.intent.streak || q.intent.attendance || q.intent.goals || q.intent.awards || q.intent.ratings || q.intent.partners || q.intent.opponents || q.intent.scores || VERSUS.test(q.left) || TOGETHER_WORD.test(q.left) || q.only || (q.award && !q.award.player))));
  // The slice carries over unless the follow-up names its own.
  if (isFollow && context.scope && !q.season && !q.allTime && !q.when.from && !q.when.to && !q.when.exact && !q.when.last) {
    q.season = context.scope.season ? seasons.find((s) => String(s.id) === String(context.scope.season)) || null : null;
    q.allTime = context.scope.allTime;
    q.when = { ...q.when, ...context.scope.when };
    q.venue = q.venue || context.scope.venue;
    q.teamSize = q.teamSize || context.scope.teamSize;
  }
  if (q.award && q.award.key !== 'any' && !q.award.player && (q.pronoun || (isFollow && prevFlat.length === 1))) q.award = { ...q.award, player: prevFlat[0] };
  if (q.award && q.award.key === 'any' && isFollow && prevFlat.length) q.award = null;

  // Work out the subject groups.
  let groups = q.groups;
  if (isFollow && prev) {
    if (q.names.length) {
      const base = prevFlat.filter((p) => !q.names.includes(p));
      if (q.opensWithVersus && base.length) groups = [base, q.names];
      else groups = [[...base, ...q.names]];
    } else if (VERSUS.test(q.left) && prevFlat.length >= 2) groups = prev.length >= 2 ? prev : [[prevFlat[0]], prevFlat.slice(1)];
    else if (TOGETHER_WORD.test(q.left) && prevFlat.length >= 2) groups = [prevFlat];
    else if (!q.clubs.length && !q.positions.length) groups = prev;
  }
  if (groups.length >= 2) {
    const a = groups[0];
    const b = groups.slice(1).flat().filter((p) => !a.includes(p));
    groups = b.length ? [a, b] : [a];
  }
  const subjectIds = groups.flat().map((p) => p.id);

  const { weeks: sliced0, bits } = sliceWeeks(q, data, subjectIds.length ? subjectIds : q.award && q.award.player ? [q.award.player.id] : null);
  let sliced = sliced0;
  if (q.award && q.award.player) {
    const keys = q.award.key === 'any' ? AWARDS.map(([k]) => k) : [q.award.key];
    sliced = sliced.filter((w) => w.awards && keys.some((k) => w.awards[k] === q.award.player.id));
    bits.push(plural(sliced.length, 'night') + ' ' + nameOf(q.award.player, players) + ' was ' + AWARD_LABEL[q.award.key]);
    // Asking about the award winner alone is asking about them on those nights.
    if (!groups.length) groups = [[q.award.player]];
  }
  const rosterNote = [];
  let roster = players;
  if (q.clubs.length) {
    roster = roster.filter((p) => q.clubs.some((c) => c.code === p.club));
    rosterNote.push(q.clubs.map((c) => c.name).join(' and ') + ' fans');
  }
  if (q.positions.length) {
    roster = roster.filter((p) => q.positions.includes(p.pos));
    rosterNote.push(q.positions.map((p) => p.toLowerCase() + 's').join(' and '));
  }
  const only = groups.length && !q.superlative && !q.intent.partners && !q.intent.opponents ? q.only : null;
  if (only) bits.push('matches ' + only);

  let answer = null;
  if (groups.length === 2) answer = versus(groups[0], groups[1], sliced, players, only);
  else if (groups.length === 1) answer = groups[0].length === 1 ? solo(groups[0][0], sliced, players, only) : together(groups[0], sliced, players, only);

  const sections = [];
  let table = null;
  let matches = answer ? answer.matches : [];
  if (answer) {
    const us = answer.mode === 'versus' ? answer.names[0] : answer.who;
    const them = answer.mode === 'versus' ? answer.names[1] : null;
    matches = matches.map((m) => (m.side === 'red' || m.side === 'blue' ? { ...m, us, them } : m));
  }
  let headline;
  let facts;
  let sub = null;

  if (answer) {
    headline = answer.headline;
    facts = answer.facts;
    if (q.award && q.award.player && answer.mode === 'solo' && answer.player.id === q.award.player.id) {
      const n = sliced.length;
      headline = n
        ? answer.who + ' was ' + AWARD_LABEL[q.award.key] + ' on ' + plural(n, 'night') + ': ' + plural(answer.sided.length, 'match', 'matches') + (n === 1 ? ' on it, ' : ' on them, ') + answer.facts[2][1] + ' won, ' + answer.facts[3][1] + ' lost.'
        : answer.who + ' has not been ' + AWARD_LABEL[q.award.key] + ' yet.';
    } else if (q.award && q.award.player && sliced.length) headline = 'On the ' + plural(sliced.length, 'night') + ' ' + nameOf(q.award.player, players) + ' was ' + AWARD_LABEL[q.award.key] + ': ' + headline;
    const who = answer.mode === 'versus' ? answer.names[0] + ' against ' + answer.names[1] : answer.who;
    if (q.intent.streak) sections.push(formSection(answer.sided, who));
    if (q.intent.attendance && answer.mode !== 'versus') sections.push(attendanceSection(answer.ids, sliced, answer.who, q.when.from));
    if (q.intent.goals) sections.push(goalsSection(answer.sided, answer.mode === 'versus' ? answer.names[0] : who));
    if ((q.intent.awards || (q.award && !q.award.player)) && !(q.award && q.award.player) && answer.mode !== 'versus') sections.push(awardsSection(answer.ids, sliced, players, answer.who));
    if (q.intent.ratings && answer.mode === 'solo') sections.push(ratingsSection(answer.player, sliced, players, showValues));
    if (q.intent.ratings && answer.mode !== 'solo') {
      const ps = answer.ids.map(byId).filter(Boolean);
      const lineOf = () => {
        const sorted = ps.slice().sort((a, b) => overall(b) - overall(a));
        return sorted.map((p) => nameOf(p, players) + ' ' + overall(p)).join(' · ') + (sorted.length > 1 ? ' — ' + nameOf(sorted[0], players) + ' is the higher rated.' : '.');
      };
      sections.push({
        title: 'Ratings',
        line: showValues ? lineOf() : 'Ratings are only shown when signed in.',
        facts: showValues ? STATS.map((k) => [ABBR[k], ps.map((p) => nameOf(p, players) + ' ' + (Number(p.stats[k]) || 0)).join(' · ')]) : [],
      });
    }
    if (q.intent.partners && answer.mode === 'solo') sections.push(companySection(answer.player, sliced, players, 'partners', q.left));
    if (q.intent.opponents && answer.mode === 'solo') sections.push(companySection(answer.player, sliced, players, 'opponents', q.left));
    // A follow-up that only asks for more leads with that, not the count the thread has.
    if (sections.length && sections[0].line && !(q.award && q.award.player)) {
      sub = headline;
      headline = sections[0].line;
    }
  } else {
    // Nobody named: the question is about everyone, or a night, or a season's honours.
    const rows = rowsFor(sliced, roster).map((r) => ({ ...r, name: nameOf(r.p, players) }));
    const night = sliced.length === 1 && (q.when.exact || q.when.last === 1);
    if (q.intent.honours && !q.superlative && (q.season || !q.measure || /\b(honours?|honors?|winner|champion|title|trophy)\b/.test(q.left))) {
      const h = honoursAnswer(q.season || currentSeason(seasons, today), seasons, data.weeks, players, today);
      headline = h.headline;
      facts = h.facts;
    } else if (night && (q.intent.awards || (q.award && !q.award.player))) {
      const a = awardsList(sliced, players);
      headline = a.headline;
      facts = a.facts;
      table = a.table;
    } else if (night && !q.superlative && !q.measure && !q.intent.ratings) {
      const s = nightSummary(sliced[0], players, showValues);
      headline = s.headline;
      facts = s.facts;
      matches = s.matches;
      q.intent.scores = true; // a night's line-ups and scores are the answer, so show them
    } else if (!sliced.length && (q.when.exact || q.when.last)) {
      headline = 'Nothing recorded for ' + (q.when.bits[0] || 'that') + '.';
      facts = [];
    } else if (q.intent.ratings || q.stat) {
      if (!showValues) {
        headline = 'Ratings are only shown when signed in.';
        facts = [];
      } else {
        const moved = /\b(improved|improvement|progress|progressed|changed|moved|risen|rise|climbed|dropped|drop|fallen|fell|declined|up|down)\b/.test(q.left);
        const measure = moved ? { key: 'delta', label: 'improvement' } : q.stat ? { key: 'stat', stat: q.stat, label: q.stat.toLowerCase() } : { key: 'ovr', label: 'overall rating' };
        const r = ranking(rows, measure, q.superlative === 'asc' || /\b(slowest|weakest|lowest|dropped|drop|fallen|fell|declined|down)\b/.test(q.left) ? 'asc' : 'desc', q.topN, players);
        headline = r.headline;
        facts = [];
        table = r.table;
      }
    } else if ((q.intent.roster || rosterNote.length) && !q.measure && !q.superlative) {
      const list = rows.slice().sort((a, b) => b.nights - a.nights || a.name.localeCompare(b.name));
      headline = rosterNote.length
        ? list.length
          ? plural(list.length, 'player') + ' — ' + rosterNote.join(', ') + ': ' + joinNames(list.map((r) => r.name)) + '.'
          : 'Nobody on the roster is ' + (q.clubs.length ? 'a ' + q.clubs.map((c) => c.name).join(' or ') + ' fan' : 'a ' + q.positions.join(' or ').toLowerCase()) + ' yet.'
        : plural(list.length, 'player') + ' on the roster, ' + list.filter((r) => r.nights).length + ' of whom have played.';
      facts = [];
      table = list.length ? { title: 'Nights · record', rows: list.map((r) => ({ name: r.name, value: r.nights + ' · ' + r.won + '–' + r.lost })) } : null;
    } else if ((q.superlative || (q.measure && (rosterNote.length || /\b(who|which|whos|whose)\b/.test(q.left)))) && !(q.intent.goals && !q.measure)) {
      const measure = q.measure || (q.superlative === 'asc' && /\b(worst|lowest)\b/.test(q.left) ? MEASURES.find((m) => m.key === 'pct') : /\bbest\b/.test(q.left) ? MEASURES.find((m) => m.key === 'pct') : MEASURES.find((m) => m.key === 'nights'));
      if (measure.key === 'nights' && q.when.from && /\b(since)\b/.test(q.text) && /\b(not|hasnt|havent|no)\b/.test(q.text)) {
        // "who hasn't played since September?"
        const all = rowsFor(data.weeks, roster).map((r) => ({ ...r, name: nameOf(r.p, players) }));
        const missing = all.filter((r) => !r.last || r.last < q.when.from);
        headline = missing.length ? joinNames(missing.map((r) => r.name)) + (missing.length === 1 ? ' has' : ' have') + ' not played since ' + q.when.from + '.' : 'Everyone on the roster has played since ' + q.when.from + '.';
        facts = [];
        table = { title: 'Last turned out', rows: missing.map((r) => ({ name: r.name, value: r.last || 'never' })) };
        bits.length = 0;
      } else {
        const r = ranking(rows, measure, q.superlative || 'desc', q.topN, players, sliced.length);
        headline = r.headline;
        facts = [];
        table = r.table;
        if (measure.key === 'goalsFor') sub = 'Goals are recorded for the side, not the scorer — this counts what the sides each player was on scored.';
        if (measure.key === 'cleanSheets') sub = 'A clean sheet is the side’s — this counts matches each player’s side kept one.';
      }
    } else if (q.intent.summary && !q.superlative && !q.intent.goals) {
      const o = overview(sliced, rows);
      headline = o.headline;
      facts = o.facts;
    } else if (q.intent.goals) {
      const all = scan(sliced, () => ({ side: 'red' }));
      const scored = all.filter((m) => m.gf != null);
      if (!scored.length) {
        headline = 'No scored matches yet.';
        facts = [];
      } else {
        const goals = scored.reduce((s, m) => s + m.gf + m.ga, 0);
        const big = scored.slice().sort((a, b) => Math.abs(b.gf - b.ga) - Math.abs(a.gf - a.ga))[0];
        const high = scored.slice().sort((a, b) => b.gf + b.ga - (a.gf + a.ga))[0];
        const bigSide = big.gf > big.ga ? big.m.red : big.m.blue;
        headline = 'Biggest win so far: ' + Math.max(big.gf, big.ga) + '–' + Math.min(big.gf, big.ga) + ' to ' + (big.gf > big.ga ? 'Red' : 'Blue') + ' on ' + big.date + (bigSide.length ? ', a side of ' + joinNames(bigSide.map((p) => shortName(p.name))) : '') + '.';
        facts = [['Matches scored', scored.length], ['Goals', goals], ['Per match', (goals / scored.length).toFixed(1)], ['Highest-scoring', high.score + ' · ' + high.date], ['Biggest margin', big.score + ' · ' + big.date]];
        table = { title: 'Winning side that day', rows: bigSide.map((p) => ({ name: shortName(p.name), value: '' })) };
      }
    } else if (q.intent.streak) {
      const r = ranking(rows, MEASURES.find((m) => m.key === 'run'), 'desc', q.topN, players);
      headline = r.headline.replace('Most current run', 'Hottest streak');
      facts = [];
      table = r.table;
    } else if (q.intent.attendance) {
      const r = ranking(rows, MEASURES.find((m) => m.key === 'nights'), 'desc', q.topN, players, sliced.length);
      headline = r.headline;
      facts = [];
      table = r.table;
    } else if (q.intent.scores && sliced.length) {
      const s = nightSummary(sliced[0], players, showValues);
      q.intent.scores = true;
      headline = 'Latest night — ' + s.headline;
      facts = s.facts;
      matches = s.matches;
    } else if (q.intent.summary || q.when.from || q.when.to || q.season || q.allTime || q.venue || q.teamSize) {
      const o = overview(sliced, rows);
      headline = o.headline;
      facts = o.facts;
    } else return { kind: 'nobody' };
    if (rosterNote.length) bits.push(rosterNote.join(', '));
  }

  const mode = answer ? answer.mode : 'everyone';
  const subject = answer ? { groups: answer.groups, mode } : context && context.groups ? { groups: context.groups, mode: context.mode } : { groups: [], mode };
  const scope = { season: q.season ? q.season.id : null, allTime: q.allTime, when: { from: q.when.from, to: q.when.to, exact: null, last: null, bits: q.when.bits.filter((b) => !/^last|^\d{4}-/.test(b)) }, venue: q.venue, teamSize: q.teamSize };
  return {
    kind: 'answer',
    mode,
    headline,
    sub,
    facts: facts || [],
    sections,
    table,
    matches,
    bits,
    expand: q.intent.scores || (q.award && !!q.award.player && !!answer),
    subject: { ...subject, scope },
    names: answer ? answer.names : [],
  };
}

// Ready-made questions, from the real data, so the examples teach what the box can do.
export function examples(data) {
  const { players, weeks, seasons, showValues } = data;
  const games = new Map();
  (weeks || []).forEach((w) => weekPlayerIds(w).forEach((p) => games.set(p.id, (games.get(p.id) || 0) + 1)));
  const top = players
    .slice()
    .sort((x, y) => (games.get(y.id) || 0) - (games.get(x.id) || 0) || x.name.localeCompare(y.name))
    .slice(0, 3);
  const n = (p) => nameOf(p, players);
  const out = [];
  if (top.length >= 2) out.push(n(top[0]) + ' with ' + n(top[1]), n(top[0]) + ' vs ' + n(top[1]));
  if (top.length >= 1) {
    const potm = (weeks || []).find((w) => w.awards && w.awards.potm != null);
    const winner = potm && players.find((p) => p.id === potm.awards.potm);
    out.push(winner ? 'scores where ' + n(winner) + ' was POTM' : n(top[0]) + '’s form');
    out.push('who does ' + n(top[0]) + ' win most with?');
  }
  out.push('who has the most POTMs?', 'which defender has the best record?', 'last night', 'biggest win');
  if (seasons && seasons.length) out.push('who won ' + sortSeasons(seasons)[0].name + '?');
  const fan = players.find((p) => p.club);
  if (fan) out.push('who supports ' + CLUBS.find((c) => c.code === fan.club).name + '?');
  if (showValues && top.length) out.push('who has the highest pace?');
  return out.slice(0, 10);
}

// What to ask next, given what was just answered.
export function followUps(answer, showValues) {
  if (!answer || answer.kind !== 'answer') return [];
  const has = (t) => (answer.sections || []).some((s) => s.title === t);
  const out = [];
  if (answer.mode === 'together' && answer.subject.groups[0] && answer.subject.groups[0].length === 2) out.push('and against?');
  if (answer.mode === 'versus') out.push('and together?');
  if (answer.mode !== 'everyone') {
    if (!has('Form')) out.push('streak?');
    if (!has('Goals')) out.push('goals?');
    if (answer.mode !== 'versus' && !has('Attendance')) out.push('nights?');
    if (answer.mode !== 'versus' && !has('Awards')) out.push('awards?');
    if (answer.mode === 'solo' && !has('Partners')) out.push('partners?');
    if (answer.mode === 'solo' && !has('Opponents')) out.push('opponents?');
    if (answer.mode === 'solo' && showValues && !has('Ratings')) out.push('ratings?');
  }
  return out;
}
