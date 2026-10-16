// FUFA team balancer: stats model, position-weighted overall, balancing algorithm.
import { cleanClub } from './clubs.js';

export const STATS = [
  'Pace',
  'Shooting',
  'Passing',
  'Defending',
  'Physical',
  'Dribbling',
  'Stamina',
  'Goalkeeping',
  'Vision',
  'Positioning',
];

export const ABBR = {
  Pace: 'PAC',
  Shooting: 'SHO',
  Passing: 'PAS',
  Defending: 'DEF',
  Physical: 'PHY',
  Dribbling: 'DRI',
  Stamina: 'STA',
  // GKP, not GK — GK is already the shorthand for the goalkeeper position.
  Goalkeeping: 'GKP',
  Vision: 'VIS',
  Positioning: 'POS',
};

export const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Striker', 'Any'];

export const SHORT = { Goalkeeper: 'GK', Defender: 'DEF', Midfielder: 'MID', Striker: 'ST', Any: 'FLEX' };

// Each row sums to 1. Goalkeeping carries the keeper's rating and stays a token weight
// outfield — in 5-a-side someone usually ends up in goal, but it shouldn't sway their OVR.
// Positioning counts for every role; vision is weighted towards the players who create.
export const WEIGHTS = {
  Goalkeeper: { Pace: 0.05, Shooting: 0.02, Passing: 0.08, Defending: 0.12, Physical: 0.1, Dribbling: 0.02, Stamina: 0.06, Goalkeeping: 0.38, Vision: 0.05, Positioning: 0.12 },
  Defender: { Pace: 0.14, Shooting: 0.02, Passing: 0.1, Defending: 0.24, Physical: 0.18, Dribbling: 0.03, Stamina: 0.08, Goalkeeping: 0.01, Vision: 0.05, Positioning: 0.15 },
  Midfielder: { Pace: 0.09, Shooting: 0.08, Passing: 0.22, Defending: 0.06, Physical: 0.07, Dribbling: 0.13, Stamina: 0.09, Goalkeeping: 0.01, Vision: 0.15, Positioning: 0.1 },
  Striker: { Pace: 0.17, Shooting: 0.24, Passing: 0.02, Defending: 0.01, Physical: 0.09, Dribbling: 0.14, Stamina: 0.07, Goalkeeping: 0.01, Vision: 0.08, Positioning: 0.17 },
  Any: { Pace: 0.11, Shooting: 0.11, Passing: 0.11, Defending: 0.11, Physical: 0.11, Dribbling: 0.11, Stamina: 0.11, Goalkeeping: 0.01, Vision: 0.11, Positioning: 0.11 },
};

export const DEFAULT_STAT = 60;

export const DEFAULT_STATS = STATS.reduce((o, k) => ({ ...o, [k]: DEFAULT_STAT }), {});

// A player saved before a stat or field existed has no value for it. Fill the gaps rather
// than letting `overall()` read undefined as zero and quietly tank everyone's rating.
export function normalizePlayer(p) {
  const stats = {};
  STATS.forEach((k) => {
    const v = Number(p && p.stats ? p.stats[k] : undefined);
    stats[k] = Number.isFinite(v) ? v : DEFAULT_STAT;
  });
  const nicknames = Array.isArray(p && p.nicknames)
    ? p.nicknames.map((n) => String(n).trim()).filter(Boolean)
    : [];
  return { ...p, alt: Array.isArray(p && p.alt) ? p.alt : [], nicknames, club: cleanClub(p && p.club), stats };
}

export function overall(p) {
  const w = WEIGHTS[p.pos] || WEIGHTS.Any;
  return Math.round(STATS.reduce((s, k) => s + (Number(p.stats[k]) || 0) * w[k], 0));
}

function avg(list, fn) {
  return list.length ? list.reduce((s, p) => s + fn(p), 0) / list.length : 0;
}

export function statAvg(t, k) {
  return avg(t, (p) => Number(p.stats[k]) || 0);
}

// `sf` is how strong a player counts as: their rating by default, or a rating nudged by
// their results when the balancer is asked to take those into account.
export function ovrTotal(t, sf = overall) {
  return t.reduce((s, p) => s + sf(p), 0);
}

export function ovrAvg(t, sf = overall) {
  return t.length ? ovrTotal(t, sf) / t.length : 0;
}

export function countPos(t, pos) {
  return t.filter((p) => p.pos === pos).length;
}

function cost(a, b, sf = overall) {
  let c = Math.abs(ovrAvg(a, sf) - ovrAvg(b, sf)) * 1.6;
  STATS.forEach((k) => {
    c += Math.abs(statAvg(a, k) - statAvg(b, k)) * 0.35;
  });
  ['Defender', 'Midfielder', 'Striker'].forEach((pos) => {
    c += Math.abs(countPos(a, pos) - countPos(b, pos)) * 3.5;
  });
  return c;
}

// Balance delta as a 0-100 readout: 100 = perfectly level sides.
export function balanceScore(a, b, sf = overall) {
  return Math.max(0, Math.round(100 - cost(a, b, sf) * 1.2));
}

// Each side must field a keeper: best two goalkeepers, falling back to anyone who
// can also play there, then to the best goalkeeping rating in the pool.
function pickKeepers(players, sf = overall) {
  const byOvr = (x, y) => sf(y) - sf(x);
  let cand = players.filter((p) => p.pos === 'Goalkeeper').sort(byOvr);
  if (cand.length < 2) {
    cand = cand.concat(
      players.filter((p) => !cand.includes(p) && (p.alt || []).includes('Goalkeeper')).sort(byOvr)
    );
  }
  if (cand.length < 2) {
    cand = cand.concat(
      players.filter((p) => !cand.includes(p)).sort((x, y) => (y.stats.Goalkeeping || 0) - (x.stats.Goalkeeping || 0))
    );
  }
  return [cand[0], cand[1]];
}

// One go at a split: deal the outfield players out greedily, then swap pairs while any
// swap helps. Fast, but it can stop at a split that is only locally best.
function attempt(rest0, gks, size, sf, mix) {
  const red = [gks[0]];
  const blue = [gks[1]];
  const rest = rest0.slice();
  if (mix === 'light') {
    // Light shuffle within equal-strength neighbours, as the balancer always has.
    for (let i = 0; i < rest.length - 1; i++) {
      if (Math.abs(sf(rest[i]) - sf(rest[i + 1])) <= 3 && Math.random() < 0.5) {
        const t = rest[i];
        rest[i] = rest[i + 1];
        rest[i + 1] = t;
      }
    }
  } else if (mix === 'full') {
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = rest[i];
      rest[i] = rest[j];
      rest[j] = t;
    }
  }
  rest.forEach((p) => {
    let target;
    if (red.length >= size) target = blue;
    else if (blue.length >= size) target = red;
    else target = ovrTotal(red, sf) <= ovrTotal(blue, sf) ? red : blue;
    target.push(p);
  });
  // Best-improvement pairwise swaps, keepers held in place.
  let bestC = cost(red, blue, sf);
  for (let pass = 0; pass < 200; pass++) {
    let best = null;
    for (let i = 1; i < red.length; i++) {
      for (let j = 1; j < blue.length; j++) {
        const r2 = red.slice();
        const b2 = blue.slice();
        const t = r2[i];
        r2[i] = b2[j];
        b2[j] = t;
        const c = cost(r2, b2, sf);
        if (c < bestC - 0.001) {
          bestC = c;
          best = [i, j];
        }
      }
    }
    if (!best) break;
    const t = red[best[0]];
    red[best[0]] = blue[best[1]];
    blue[best[1]] = t;
  }
  return { red, blue, c: bestC };
}

const ATTEMPTS = 32;
const NEAR = 0.3; // splits this close to the best are as good as each other

// Many starts, the best kept. A single greedy-then-swap pass can settle on a split that
// a different start beats, so the balancer tries a few dozen and picks among the best —
// at random among near-equals, so Reshuffle still gives a genuinely different split.
export function balance(pool, size, seed, sf = overall) {
  const players = pool.slice();
  if (players.length < 2) return { red: players.slice(0, 1), blue: [] };
  const [gkA, gkB] = pickKeepers(players, sf);
  const flip = seed % 2 === 1;
  const gks = [flip ? gkB : gkA, flip ? gkA : gkB];
  const rest = players.filter((p) => p !== gkA && p !== gkB).sort((x, y) => sf(y) - sf(x));
  const tries = [];
  for (let k = 0; k < ATTEMPTS; k++) tries.push(attempt(rest, gks, size, sf, k === 0 ? 'light' : 'full'));
  const best = Math.min(...tries.map((t) => t.c));
  const seen = new Set();
  const near = tries.filter((t) => {
    if (t.c > best + NEAR) return false;
    const key = t.red.map((p) => p.id).sort((x, y) => x - y).join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const pick = near[Math.floor(Math.random() * near.length)];
  return { red: pick.red, blue: pick.blue };
}

const ROW = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Any: 2, Striker: 3 };
const DEPTH = [94, 82, 70, 58];
const SOLO_X = [50, 40, 60, 50];

// Pins are ~58px tall; keep them apart in % terms so nothing collides at small pitch sizes.
export function relax(pos) {
  const ids = Object.keys(pos);
  const MINY = 15;
  const MINX = 21;
  for (let it = 0; it < 80; it++) {
    let moved = false;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos[ids[i]];
        const b = pos[ids[j]];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (Math.abs(dx) >= MINX || Math.abs(dy) >= MINY) continue;
        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
          b.x += 1;
          continue;
        }
        const needY = (MINY - Math.abs(dy)) / 2 + 0.4;
        const sy = dy >= 0 ? 1 : -1;
        a.y = Math.max(7.5, Math.min(92.5, a.y - needY * sy));
        b.y = Math.max(7.5, Math.min(92.5, b.y + needY * sy));
        const needX = ((MINX - Math.abs(dx)) / 2) * 0.35;
        const sx = dx >= 0 ? 1 : -1;
        a.x = Math.max(8, Math.min(92, a.x - needX * sx));
        b.x = Math.max(8, Math.min(92, b.x + needX * sx));
        moved = true;
      }
    }
    if (!moved) break;
  }
  return pos;
}

// Freeform placement: pins land near their position band, jittered rather than in a strict formation.
export function layout(team, side) {
  const rows = {};
  team.forEach((p) => {
    const r = ROW[p.pos] != null ? ROW[p.pos] : 2;
    (rows[r] = rows[r] || []).push(p);
  });
  const out = {};
  Object.keys(rows).forEach((r) => {
    const list = rows[r];
    const n = list.length;
    list.forEach((p, i) => {
      const x = n === 1 ? SOLO_X[r] || 50 : 14 + i * (72 / (n - 1));
      const jx = n === 1 ? 0 : (Math.random() - 0.5) * 6;
      const jy = (Math.random() - 0.5) * (r === '0' ? 1.5 : 4);
      const d = DEPTH[r] + jy;
      out[p.id] = {
        x: Math.max(9, Math.min(91, x + jx)),
        y: Math.max(7.5, Math.min(92.5, side === 'red' ? d : 100 - d)),
      };
    });
  });
  return out;
}
