// The team formula: every number and switch that decides how strong a player counts and
// how a split is judged. There is one per format — 5, 6 and 7-a-side — and they all travel
// with the shared document so every device balances the same way. The one for the format
// on the board is the active one, which the model and the results nudge read from.
//
// The model reads the active formula rather than taking it as an argument, so the many
// places that ask for a player's OVR don't all need threading through. Previews that need
// a formula other than the saved one use `withFormula`, which swaps it in for one
// synchronous call and puts it back.
import { STATS } from './stats.js';

export const DEFAULT_FORMULA = {
  // Percent of each stat in a player's OVR, by main position. Each row adds up to 100.
  weights: {
    Goalkeeper: { Pace: 5, Shooting: 2, Passing: 8, Defending: 12, Physical: 10, Dribbling: 2, Stamina: 6, Goalkeeping: 38, Vision: 5, Positioning: 12 },
    Defender: { Pace: 14, Shooting: 2, Passing: 10, Defending: 24, Physical: 18, Dribbling: 3, Stamina: 8, Goalkeeping: 1, Vision: 5, Positioning: 15 },
    Midfielder: { Pace: 9, Shooting: 8, Passing: 22, Defending: 6, Physical: 7, Dribbling: 13, Stamina: 9, Goalkeeping: 1, Vision: 15, Positioning: 10 },
    Striker: { Pace: 17, Shooting: 24, Passing: 2, Defending: 1, Physical: 9, Dribbling: 14, Stamina: 7, Goalkeeping: 1, Vision: 8, Positioning: 17 },
    Any: { Pace: 11, Shooting: 11, Passing: 11, Defending: 11, Physical: 11, Dribbling: 11, Stamina: 11, Goalkeeping: 1, Vision: 11, Positioning: 11 },
  },
  // What a split costs: per point of average-strength gap, per point of gap on each stat,
  // per extra DEF/MID/ST on one side. `scale` turns cost into the 0–100 balance score.
  cost: { level: 1.6, mix: 0.35, positions: 3.5, scale: 1.2 },
  // How much each stat's gap counts within the stat mix, relative to the others. Only the
  // proportions matter: they are scaled to average 1, so the mix's share stays its share.
  stress: Object.fromEntries(STATS.map((k) => [k, 1])),
  results: { light: 4, strong: 8, draws: 6, record: 0.6, form: 5 },
  search: { starts: 32, near: 0.3 },
  suggest: { games: 8, z: 2, odds: 4, size: 20, cap: 8 },
  switches: { keepersOut: false, nudgeStats: false, odds: false, flex: false },
};

export const POSITION_KEYS = ['Goalkeeper', 'Defender', 'Midfielder', 'Striker', 'Any'];

// Bounds for every editable number. Anything out of range — a hand-edited file, an older
// app — is pulled back inside rather than trusted.
export const RANGES = {
  cost: { level: [0, 6], mix: [0, 1.5], positions: [0, 12], scale: [0.4, 3] },
  results: { light: [0, 10], strong: [0, 16], draws: [0, 20], record: [0, 1], form: [3, 10] },
  search: { starts: [4, 96], near: [0, 2] },
  stress: Object.fromEntries(STATS.map((k) => [k, [0, 3]])),
  suggest: { games: [3, 30], z: [1, 3.5], odds: [1, 10], size: [5, 40], cap: [2, 16] },
};

const num = (v, [lo, hi], d) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};

const round2 = (n) => Math.round(n * 100) / 100;
const round3 = (n) => Math.round(n * 1000) / 1000;

// A position's weights as whole percentages that add to exactly 100.
export function toHundred(row) {
  const raw = STATS.map((k) => Math.max(0, Number(row && row[k]) || 0));
  const sum = raw.reduce((s, x) => s + x, 0);
  if (!sum) return Object.fromEntries(STATS.map((k, i) => [k, i < 10 ? 10 : 0]));
  const exact = raw.map((x) => (x * 100) / sum);
  const out = exact.map(Math.floor);
  let left = 100 - out.reduce((s, x) => s + x, 0);
  exact
    .map((x, i) => [x - Math.floor(x), i])
    .sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => {
      if (left > 0) {
        out[i] += 1;
        left -= 1;
      }
    });
  return Object.fromEntries(STATS.map((k, i) => [k, out[i]]));
}

function cleanGroup(raw, key) {
  const d = DEFAULT_FORMULA[key];
  const r = RANGES[key];
  const out = {};
  Object.keys(d).forEach((k) => {
    out[k] = round3(num(raw && raw[k], r[k], d[k]));
  });
  return out;
}

export function cleanFormula(raw) {
  const f = raw && typeof raw === 'object' ? raw : {};
  const weights = {};
  POSITION_KEYS.forEach((pos) => {
    weights[pos] = toHundred((f.weights && f.weights[pos]) || DEFAULT_FORMULA.weights[pos]);
  });
  const sw = f.switches || {};
  const out = {
    weights,
    cost: cleanGroup(f.cost, 'cost'),
    stress: cleanGroup(f.stress, 'stress'),
    results: cleanGroup(f.results, 'results'),
    search: cleanGroup(f.search, 'search'),
    suggest: cleanGroup(f.suggest, 'suggest'),
    switches: Object.fromEntries(Object.keys(DEFAULT_FORMULA.switches).map((k) => [k, sw[k] === true])),
  };
  out.search.starts = Math.round(out.search.starts);
  out.results.form = Math.round(out.results.form);
  out.suggest.games = Math.round(out.suggest.games);
  // Who saved it and why. Kept with the formula so the page can say where it came from.
  if (f.meta && typeof f.meta === 'object') {
    const m = f.meta;
    out.meta = {
      note: typeof m.note === 'string' ? m.note.slice(0, 140) : '',
      by: typeof m.by === 'string' ? m.by.slice(0, 40) : '',
      on: typeof m.on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.on) ? m.on : '',
    };
  }
  return out;
}

// The formula without who-saved-it, for comparing two formulas by what they do.
export function bare(f) {
  const { meta, ...rest } = f || {};
  return rest;
}

export const sameFormula = (a, b) => JSON.stringify(bare(cleanFormula(a))) === JSON.stringify(bare(cleanFormula(b)));

// --- 5-a-side ------------------------------------------------------------------------------
//
// Five a side is a smaller pitch with more running per player, so its formula leans on
// pace and stamina: five points more of each in every outfield position's OVR (taken from
// the other stats in proportion), and gaps in either counting double in the stat mix.

const BOOST = 5;
const OUTFIELD = ['Defender', 'Midfielder', 'Striker', 'Any'];

function lift(row) {
  const up = ['Pace', 'Stamina'];
  const want = Object.fromEntries(up.map((k) => [k, Math.min(100, row[k] + BOOST)]));
  const others = STATS.filter((k) => !up.includes(k));
  const rest = others.reduce((sum, k) => sum + row[k], 0);
  const left = 100 - want.Pace - want.Stamina;
  const scaled = Object.fromEntries(others.map((k) => [k, rest ? (row[k] * left) / rest : left / others.length]));
  return toHundred({ ...scaled, ...want });
}

export function boostFor5(f) {
  const base = cleanFormula(bare(f));
  const weights = { ...base.weights };
  OUTFIELD.forEach((pos) => {
    weights[pos] = lift(base.weights[pos]);
  });
  return cleanFormula({ ...base, weights, stress: { ...base.stress, Pace: 2, Stamina: 2 } });
}

export const DEFAULT_FORMULA_5 = boostFor5(DEFAULT_FORMULA);

export const FORMATS = [5, 6, 7];
export const toFormat = (n) => (FORMATS.includes(Number(n)) ? Number(n) : 5);

export const defaultFor = (size) => (size === 5 ? DEFAULT_FORMULA_5 : cleanFormula(DEFAULT_FORMULA));

export const isDefault = (f, size = 6) => sameFormula(f, defaultFor(size));

// A document's formulas. `formula` is the 6-a-side one (it was the only one before there
// were more). Until the others are first saved they work out from it: 5-a-side as the
// 6-a-side formula with the 5-a-side lean on top, 7-a-side as the 6-a-side formula as it
// stands — so any change already made carries over.
export function formulasOf(doc) {
  const six = cleanFormula(doc && doc.formula);
  const five = doc && doc.formula5 ? cleanFormula(doc.formula5) : boostFor5(six);
  const seven = doc && doc.formula7 ? cleanFormula(doc.formula7) : cleanFormula(bare(six));
  return { 5: five, 6: six, 7: seven };
}

// --- the active formula ------------------------------------------------------------------

let byFormat = { 5: DEFAULT_FORMULA_5, 6: cleanFormula(DEFAULT_FORMULA), 7: cleanFormula(DEFAULT_FORMULA) };
// Until the app says which format is on the board, the original (6-a-side) formula.
let active = byFormat[6];

export const formula = () => active;

// The formula for a format, for things that look back at matches played in either.
export const formulaFor = (size) => byFormat[toFormat(size)];

export function setFormulas(all, size) {
  byFormat = { 5: all[5], 6: all[6], 7: all[7] || all[6] };
  active = formulaFor(size);
}

export function setFormula(f) {
  active = f || cleanFormula(DEFAULT_FORMULA);
}

// Tries a formula for one synchronous call. It stands in for every format meanwhile, so a
// preview that looks back at past matches judges them all by the formula being tried.
export function withFormula(f, fn) {
  const was = active;
  const wasBoth = byFormat;
  active = f;
  byFormat = { 5: f, 6: f, 7: f };
  try {
    return fn();
  } finally {
    active = was;
    byFormat = wasBoth;
  }
}

// --- helpers for the editor -------------------------------------------------------------

// Raise or lower one stat's weight and spread the difference across the others in
// proportion, so the position still adds up to 100.
export function setWeight(row, stat, value) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const others = STATS.filter((k) => k !== stat);
  const rest = others.reduce((s, k) => s + row[k], 0);
  const target = 100 - v;
  const scaled = {};
  others.forEach((k) => {
    scaled[k] = rest > 0 ? (row[k] * target) / rest : target / others.length;
  });
  // Whole numbers that still add to the target, biggest remainders first.
  const floors = Object.fromEntries(others.map((k) => [k, Math.floor(scaled[k])]));
  let left = target - others.reduce((s, k) => s + floors[k], 0);
  others
    .slice()
    .sort((a, b) => scaled[b] - Math.floor(scaled[b]) - (scaled[a] - Math.floor(scaled[a])))
    .forEach((k) => {
      if (left > 0) {
        floors[k] += 1;
        left -= 1;
      }
    });
  return { ...floors, [stat]: v };
}

// The three things a split is judged on, as shares of 100. Each is what one "unit" of
// imbalance costs: a point of average-strength gap, a point across every stat at once, and
// one player out of place. Their total sets how harsh the balancer is, and the share bar
// keeps that total while moving weight between them.
export function shares(cost) {
  const parts = [cost.level, cost.mix * STATS.length, cost.positions];
  const total = parts.reduce((s, x) => s + x, 0) || 1;
  return { level: (parts[0] / total) * 100, mix: (parts[1] / total) * 100, positions: (parts[2] / total) * 100, total };
}

export function fromShares(cost, s) {
  const { total } = shares(cost);
  return {
    ...cost,
    level: round2((s.level / 100) * total),
    mix: Math.round(((s.mix / 100) * total * 1000) / STATS.length) / 1000,
    positions: round2((s.positions / 100) * total),
  };
}

// Plain-words names for everything editable, used by the change list and the log.
export const LABELS = {
  'cost.level': 'Level share',
  'cost.mix': 'Stat mix share',
  'cost.positions': 'Positions share',
  'cost.scale': 'Score strictness',
  ...Object.fromEntries(STATS.map((k) => ['stress.' + k, k + ' in the stat mix'])),
  'results.light': 'Light nudge (points)',
  'results.strong': 'Strong nudge (points)',
  'results.draws': 'Pretend draws',
  'results.record': 'Record vs form',
  'results.form': 'Form window (matches)',
  'search.starts': 'Starts tried',
  'search.near': 'Near-equal margin',
  'suggest.games': 'Matches before a suggestion',
  'suggest.z': 'How sure (z)',
  'suggest.odds': 'Odds scale',
  'suggest.size': 'Suggestion size',
  'suggest.cap': 'Biggest suggestion',
  'switches.keepersOut': 'Leave keepers out of stat mix',
  'switches.nudgeStats': 'Results nudge sees stats too',
  'switches.odds': 'Nudge accounts for teammates',
  'switches.flex': 'Count FLEX and second positions',
};

const POS_NAME = { Goalkeeper: 'GK', Defender: 'DEF', Midfielder: 'MID', Striker: 'ST', Any: 'FLEX' };

// Every difference between two formulas, as { key, label, from, to }.
export function diffFormula(a, b) {
  const out = [];
  POSITION_KEYS.forEach((pos) => {
    STATS.forEach((k) => {
      if (a.weights[pos][k] !== b.weights[pos][k]) {
        out.push({ key: 'weights.' + pos + '.' + k, label: POS_NAME[pos] + ' · ' + k, from: a.weights[pos][k] + '%', to: b.weights[pos][k] + '%', group: 'weights' });
      }
    });
  });
  ['cost', 'stress', 'results', 'search', 'suggest', 'switches'].forEach((g) => {
    Object.keys(a[g]).forEach((k) => {
      if (a[g][k] !== b[g][k]) {
        const show = (v) => (typeof v === 'boolean' ? (v ? 'On' : 'Off') : g === 'stress' ? '×' + v : String(v));
        out.push({ key: g + '.' + k, label: LABELS[g + '.' + k] || k, from: show(a[g][k]), to: show(b[g][k]), group: g });
      }
    });
  });
  return out;
}
