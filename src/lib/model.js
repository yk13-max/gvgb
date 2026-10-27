// FUFA team balancer: stats model, position-weighted overall, balancing algorithm.
import { cleanClub } from './clubs.js';
import { formula } from './formula.js';
import { STATS } from './stats.js';

export { STATS };

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

// How each stat feeds a position's OVR, as whole percentages that add to 100. They live in
// the team formula, so the organisers can change them; the defaults are in formula.js.
// Goalkeeping carries the keeper's rating and stays a token weight outfield.
export function weightsFor(pos) {
  const w = formula().weights;
  return w[pos] || w.Any;
}

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
  const w = weightsFor(p.pos);
  // Each weight as a fraction, summed in the same order as always: the same sum to the
  // last bit, so nobody's rating moves by a rounding hair when nothing has been changed.
  return Math.round(STATS.reduce((s, k) => s + (Number(p.stats[k]) || 0) * (w[k] / 100), 0));
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

const OUTFIELD = ['Defender', 'Midfielder', 'Striker'];

// How much of each outfield position a player counts as when the sides' shapes are
// compared. Normally their main position, whole. With the FLEX switch on, a FLEX player
// counts as half a midfielder, and a player with second positions counts two-thirds for
// their main one with the last third shared across the others.
export function posShare(p) {
  const out = { Defender: 0, Midfielder: 0, Striker: 0 };
  if (!formula().switches.flex) {
    if (p.pos in out) out[p.pos] = 1;
    return out;
  }
  if (p.pos === 'Any') {
    out.Midfielder = 0.5;
    return out;
  }
  if (!(p.pos in out)) return out;
  const alts = (p.alt || []).filter((a) => a in out && a !== p.pos);
  out[p.pos] = alts.length ? 2 / 3 : 1;
  alts.forEach((a) => {
    out[a] += 1 / 3 / alts.length;
  });
  return out;
}

function shapeOf(t, pos) {
  return t.reduce((s, p) => s + posShare(p)[pos], 0);
}

// A side's average on one stat, as the balancer sees it. The switches can leave listed
// keepers out, and let the results nudge move every stat as well as the OVR.
function mixAvg(t, k, sf) {
  const sw = formula().switches;
  const list = sw.keepersOut ? t.filter((p) => p.pos !== 'Goalkeeper') : t;
  const nudge = sw.nudgeStats && sf !== overall;
  return avg(list, (p) => (Number(p.stats[k]) || 0) + (nudge ? sf(p) - overall(p) : 0));
}

// What a split costs, in three parts: the gap in average strength, the gap on each stat,
// and how differently the sides are shaped. The weights are the team formula's.
export function costParts(a, b, sf = overall) {
  const w = formula().cost;
  const level = Math.abs(ovrAvg(a, sf) - ovrAvg(b, sf)) * w.level;
  // Each stat's gap counts by its stress, scaled to average 1, so leaning on pace and
  // stamina takes weight from the other stats rather than adding to the mix as a whole.
  const stress = formula().stress;
  const mean = STATS.reduce((sum, k) => sum + stress[k], 0) / STATS.length || 1;
  let mix = 0;
  STATS.forEach((k) => {
    mix += Math.abs(mixAvg(a, k, sf) - mixAvg(b, k, sf)) * w.mix * (stress[k] / mean);
  });
  let positions = 0;
  OUTFIELD.forEach((pos) => {
    positions += Math.abs(shapeOf(a, pos) - shapeOf(b, pos)) * w.positions;
  });
  return { level, mix, positions };
}

function cost(a, b, sf = overall) {
  const c = costParts(a, b, sf);
  return c.level + c.mix + c.positions;
}

// Balance delta as a 0-100 readout: 100 = perfectly level sides.
export function balanceScore(a, b, sf = overall) {
  return Math.max(0, Math.round(100 - cost(a, b, sf) * formula().cost.scale));
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
function attempt(rest0, gks, size, sf, mix, rng) {
  const red = [gks[0]];
  const blue = [gks[1]];
  const rest = rest0.slice();
  if (mix === 'light') {
    // Light shuffle within equal-strength neighbours, as the balancer always has.
    for (let i = 0; i < rest.length - 1; i++) {
      if (Math.abs(sf(rest[i]) - sf(rest[i + 1])) <= 3 && rng() < 0.5) {
        const t = rest[i];
        rest[i] = rest[i + 1];
        rest[i + 1] = t;
      }
    }
  } else if (mix === 'full') {
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
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

// Many starts, the best kept. A single greedy-then-swap pass can settle on a split that
// a different start beats, so the balancer tries a few dozen and picks among the best —
// at random among near-equals, so Reshuffle still gives a genuinely different split. How
// many starts, and how near counts as equal, are the team formula's. `rng` is only passed
// by previews that need the same answer twice.
export function balance(pool, size, seed, sf = overall, rng = Math.random) {
  const { starts, near: margin } = formula().search;
  const players = pool.slice();
  if (players.length < 2) return { red: players.slice(0, 1), blue: [] };
  const [gkA, gkB] = pickKeepers(players, sf);
  const flip = seed % 2 === 1;
  const gks = [flip ? gkB : gkA, flip ? gkA : gkB];
  const rest = players.filter((p) => p !== gkA && p !== gkB).sort((x, y) => sf(y) - sf(x));
  const tries = [];
  for (let k = 0; k < starts; k++) tries.push(attempt(rest, gks, size, sf, k === 0 ? 'light' : 'full', rng));
  const best = Math.min(...tries.map((t) => t.c));
  const seen = new Set();
  const near = tries.filter((t) => {
    if (t.c > best + margin) return false;
    const key = t.red.map((p) => p.id).sort((x, y) => x - y).join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const pick = near[Math.floor(rng() * near.length)];
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
