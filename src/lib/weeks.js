import { STATS, overall } from './model.js';

// A game week is one session: a date, and the one or more matches played on it.
// Awards are nominated per week, and each week keeps a snapshot of the ratings its
// players carried at the time, so later tweaks stay visible as a difference.

export const EMPTY_AWARDS = { attacker: null, midfielder: null, defender: null, potm: null };

export const AWARDS = [
  ['attacker', 'Best attacker', 'Striker'],
  ['midfielder', 'Best midfielder', 'Midfielder'],
  ['defender', 'Best defender', 'Defender'],
  ['potm', 'Overall POTM', null],
];

let seq = 0;
function uid() {
  seq += 1;
  return Date.now() * 1000 + (seq % 1000);
}

export function matchPlayerIds(m) {
  return [...(m.red || []), ...(m.blue || [])].map((p) => p.id);
}

export function weekPlayerIds(w) {
  const seen = new Set();
  const out = [];
  (w.matches || []).forEach((m) =>
    [...(m.red || []), ...(m.blue || [])].forEach((p) => {
      if (seen.has(p.id)) return;
      seen.add(p.id);
      out.push(p);
    })
  );
  return out;
}

// Ratings as they stand right now, for the players who turned out.
export function snapshotRatings(players, ids) {
  const out = {};
  ids.forEach((id) => {
    const p = players.find((x) => x.id === id);
    if (!p) return;
    const stats = {};
    STATS.forEach((k) => {
      stats[k] = Number(p.stats[k]) || 0;
    });
    out[id] = { name: p.name, pos: p.pos, ovr: overall(p), stats };
  });
  return out;
}

function normalizeMatch(m) {
  return {
    id: m.id || uid(),
    played: m.played !== false,
    redScore: m.redScore == null ? null : Number(m.redScore),
    blueScore: m.blueScore == null ? null : Number(m.blueScore),
    red: Array.isArray(m.red) ? m.red : [],
    blue: Array.isArray(m.blue) ? m.blue : [],
  };
}

// Accepts week-shaped entries and the flat one-match-per-entry history this app
// saved before weeks existed. Flat entries sharing a date become one week.
export function toWeeks(history) {
  if (!Array.isArray(history)) return [];
  const byDate = new Map();

  const weekFor = (date, seed) => {
    let w = byDate.get(date);
    if (!w) {
      w = {
        id: seed.id || uid(),
        date,
        venue: seed.venue || '',
        teamSize: seed.teamSize || 5,
        matches: [],
        awards: { ...EMPTY_AWARDS, ...(seed.awards || {}) },
        ratings: seed.ratings && typeof seed.ratings === 'object' ? seed.ratings : {},
      };
      byDate.set(date, w);
    }
    return w;
  };

  history.forEach((entry) => {
    if (!entry || !entry.date) return;
    const w = weekFor(entry.date, entry);
    if (Array.isArray(entry.matches)) {
      entry.matches.forEach((m) => w.matches.push(normalizeMatch(m)));
      if (entry.venue && !w.venue) w.venue = entry.venue;
      Object.keys(EMPTY_AWARDS).forEach((k) => {
        if (w.awards[k] == null && entry.awards && entry.awards[k] != null) w.awards[k] = entry.awards[k];
      });
      Object.assign(w.ratings, entry.ratings || {});
    } else {
      w.matches.push(normalizeMatch(entry));
    }
  });

  return [...byDate.values()].filter((w) => w.matches.length).sort((a, b) => (a.date < b.date ? 1 : -1));
}

// The date on a match decides its week: editing it moves the match, creating or
// merging weeks as needed, and emptied weeks disappear.
export function putMatch(weeks, { date, venue, teamSize, match, players }) {
  const m = normalizeMatch(match);
  const stripped = weeks.map((w) => ({ ...w, matches: w.matches.filter((x) => x.id !== m.id) }));
  const idx = stripped.findIndex((w) => w.date === date);
  let next;
  if (idx >= 0) {
    const w = stripped[idx];
    const existed = weeks.find((x) => x.id === w.id);
    const hadIt = existed && existed.matches.some((x) => x.id === m.id);
    const matches = hadIt
      ? existed.matches.map((x) => (x.id === m.id ? m : x))
      : [...w.matches, m];
    next = stripped.map((x, i) => (i === idx ? { ...x, venue: venue || x.venue, matches } : x));
  } else {
    next = [
      ...stripped,
      {
        id: uid(),
        date,
        venue: venue || '',
        teamSize,
        matches: [m],
        awards: { ...EMPTY_AWARDS },
        ratings: {},
      },
    ];
  }

  // Top the snapshot up for anyone new to this week, leaving existing entries alone
  // so the record of what they were rated stays put.
  return next
    .filter((w) => w.matches.length)
    .map((w) => {
      if (w.date !== date) return w;
      const missing = weekPlayerIds(w)
        .map((p) => p.id)
        .filter((id) => !w.ratings[id]);
      return missing.length ? { ...w, ratings: { ...w.ratings, ...snapshotRatings(players, missing) } } : w;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function outcome(m) {
  if (!m.played) return 'off';
  if (m.redScore == null || m.blueScore == null) return 'noscore';
  if (m.redScore > m.blueScore) return 'red';
  if (m.blueScore > m.redScore) return 'blue';
  return 'draw';
}

export function tally(weeks) {
  const s = { weeks: weeks.length, played: 0, off: 0, red: 0, blue: 0, draw: 0, goalsRed: 0, goalsBlue: 0 };
  weeks.forEach((w) =>
    w.matches.forEach((m) => {
      const o = outcome(m);
      if (o === 'off') {
        s.off += 1;
        return;
      }
      s.played += 1;
      if (o === 'red' || o === 'blue' || o === 'draw') {
        s[o] += 1;
        s.goalsRed += m.redScore;
        s.goalsBlue += m.blueScore;
      }
    })
  );
  return s;
}

// What changed between a week's snapshot and a player's ratings now.
export function ratingDiff(snap, player) {
  if (!player) return { ovrNow: null, changed: [] };
  const changed = STATS.map((k) => ({ k, was: Number(snap.stats[k]) || 0, now: Number(player.stats[k]) || 0 })).filter(
    (d) => d.was !== d.now
  );
  return { ovrNow: overall(player), changed };
}
