// FUFA team balancer: stats model, position-weighted overall, balancing algorithm.

export const STATS = ['Pace', 'Shooting', 'Passing', 'Defending', 'Physical', 'Dribbling'];

export const ABBR = {
  Pace: 'PAC',
  Shooting: 'SHO',
  Passing: 'PAS',
  Defending: 'DEF',
  Physical: 'PHY',
  Dribbling: 'DRI',
};

export const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Striker', 'Any'];

export const SHORT = { Goalkeeper: 'GK', Defender: 'DEF', Midfielder: 'MID', Striker: 'ST', Any: 'FLEX' };

export const WEIGHTS = {
  Goalkeeper: { Pace: 0.1, Shooting: 0.05, Passing: 0.2, Defending: 0.35, Physical: 0.25, Dribbling: 0.05 },
  Defender: { Pace: 0.2, Shooting: 0.05, Passing: 0.15, Defending: 0.3, Physical: 0.25, Dribbling: 0.05 },
  Midfielder: { Pace: 0.15, Shooting: 0.1, Passing: 0.3, Defending: 0.1, Physical: 0.15, Dribbling: 0.2 },
  Striker: { Pace: 0.25, Shooting: 0.3, Passing: 0.05, Defending: 0.05, Physical: 0.15, Dribbling: 0.2 },
  Any: { Pace: 1 / 6, Shooting: 1 / 6, Passing: 1 / 6, Defending: 1 / 6, Physical: 1 / 6, Dribbling: 1 / 6 },
};

export const DEFAULT_STATS = { Pace: 60, Shooting: 60, Passing: 60, Defending: 60, Physical: 60, Dribbling: 60 };

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

export function ovrTotal(t) {
  return t.reduce((s, p) => s + overall(p), 0);
}

export function ovrAvg(t) {
  return t.length ? ovrTotal(t) / t.length : 0;
}

export function countPos(t, pos) {
  return t.filter((p) => p.pos === pos).length;
}

function cost(a, b) {
  let c = Math.abs(ovrAvg(a) - ovrAvg(b)) * 1.6;
  STATS.forEach((k) => {
    c += Math.abs(statAvg(a, k) - statAvg(b, k)) * 0.35;
  });
  ['Defender', 'Midfielder', 'Striker'].forEach((pos) => {
    c += Math.abs(countPos(a, pos) - countPos(b, pos)) * 3.5;
  });
  return c;
}

// Balance delta as a 0-100 readout: 100 = perfectly level sides.
export function balanceScore(a, b) {
  return Math.max(0, Math.round(100 - cost(a, b) * 1.2));
}

// Each side must field a keeper: best two goalkeepers, falling back to anyone who
// can also play there, then to the best defenders.
function pickKeepers(players) {
  const byOvr = (x, y) => overall(y) - overall(x);
  let cand = players.filter((p) => p.pos === 'Goalkeeper').sort(byOvr);
  if (cand.length < 2) {
    cand = cand.concat(
      players.filter((p) => !cand.includes(p) && (p.alt || []).includes('Goalkeeper')).sort(byOvr)
    );
  }
  if (cand.length < 2) {
    cand = cand.concat(
      players.filter((p) => !cand.includes(p)).sort((x, y) => (y.stats.Defending || 0) - (x.stats.Defending || 0))
    );
  }
  return [cand[0], cand[1]];
}

export function balance(pool, size, seed) {
  const players = pool.slice();
  if (players.length < 2) return { red: players.slice(0, 1), blue: [] };
  const [gkA, gkB] = pickKeepers(players);
  const flip = seed % 2 === 1;
  const red = [flip ? gkB : gkA];
  const blue = [flip ? gkA : gkB];
  const rest = players.filter((p) => p !== gkA && p !== gkB).sort((x, y) => overall(y) - overall(x));
  // Light shuffle within equal-strength neighbours so reshuffle gives a genuinely different split.
  for (let i = 0; i < rest.length - 1; i++) {
    if (Math.abs(overall(rest[i]) - overall(rest[i + 1])) <= 3 && Math.random() < 0.5) {
      const t = rest[i];
      rest[i] = rest[i + 1];
      rest[i + 1] = t;
    }
  }
  rest.forEach((p) => {
    let target;
    if (red.length >= size) target = blue;
    else if (blue.length >= size) target = red;
    else target = ovrTotal(red) <= ovrTotal(blue) ? red : blue;
    target.push(p);
  });
  // Best-improvement pairwise swaps, keepers held in place.
  for (let pass = 0; pass < 200; pass++) {
    let best = null;
    let bestC = cost(red, blue);
    for (let i = 1; i < red.length; i++) {
      for (let j = 1; j < blue.length; j++) {
        const r2 = red.slice();
        const b2 = blue.slice();
        const t = r2[i];
        r2[i] = b2[j];
        b2[j] = t;
        const c = cost(r2, b2);
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
  return { red, blue };
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
