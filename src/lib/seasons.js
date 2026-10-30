// A season is a name and the date it starts. A week belongs to the latest season that
// had started by its date, so seasons never need an end date and never overlap; a week
// before the first season is simply "earlier". Removing a season deletes nothing — its
// weeks fall to the season before.

export const ALL = 'all';
export const EARLIER = 'earlier';

export function sortSeasons(seasons) {
  return (seasons || []).slice().sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}

export function seasonOf(seasons, date) {
  let hit = null;
  sortSeasons(seasons).forEach((s) => {
    if (s.start <= date) hit = s;
  });
  return hit;
}

// The season we are in today, or the most recent one if today is before all of them.
export function currentSeason(seasons, today) {
  const sorted = sortSeasons(seasons);
  return seasonOf(sorted, today) || sorted[0] || null;
}

// Keys travel through a <select>, which hands back strings, so every comparison with
// a season id goes through String() — a number on one side and "2" on the other once
// made the picker fall silently back to the current season.
const same = (id, key) => String(id) === String(key);

export function weeksIn(weeks, key, seasons) {
  if (key === ALL || key == null) return weeks;
  if (key === EARLIER) return weeks.filter((w) => !seasonOf(seasons, w.date));
  return weeks.filter((w) => {
    const s = seasonOf(seasons, w.date);
    return s && same(s.id, key);
  });
}

// What the picker offers: newest season first, then "earlier" if anything predates the
// first season, then everything.
export function seasonOptions(seasons, weeks) {
  const sorted = sortSeasons(seasons);
  const out = sorted
    .slice()
    .reverse()
    .map((s) => ({ key: String(s.id), label: s.name }));
  if (sorted.length && weeks.some((w) => !seasonOf(sorted, w.date))) out.push({ key: EARLIER, label: 'Before ' + sorted[0].name });
  out.push({ key: ALL, label: 'All time' });
  return out;
}

export function labelFor(key, seasons) {
  if (key === ALL || key == null) return 'All time';
  if (key === EARLIER) {
    const first = sortSeasons(seasons)[0];
    return first ? 'Before ' + first.name : 'Earlier';
  }
  const s = (seasons || []).find((x) => same(x.id, key));
  return s ? s.name : 'All time';
}

// The minimum matches to place in the table for a season picker key. Only a real season
// has one; "all time" and "before the first season" never do.
export function minGamesFor(key, seasons) {
  if (key === ALL || key === EARLIER || key == null) return 0;
  const s = (seasons || []).find((x) => same(x.id, key));
  return s ? s.minGames || 0 : 0;
}

// How many more matches a table row needs to qualify, 0 once it has.
export const shortOf = (row, min) => Math.max(0, (min || 0) - (row ? row.games : 0));

export const matchWord = (n) => n + ' match' + (n === 1 ? '' : 'es');
export const moreMatches = (n) => n + ' more match' + (n === 1 ? '' : 'es');

// The completed season a date falls in, if any. Its nights are locked.
export function completedFor(seasons, date) {
  const s = seasonOf(seasons, date);
  return s && s.completed ? s : null;
}

export function nextSeasonId(seasons) {
  return Math.max(0, ...(seasons || []).map((s) => Number(s.id) || 0)) + 1;
}

// "2026/27" for a start in the second half of the year, "2026" otherwise — a starting
// suggestion the organiser can overtype.
export function suggestName(startISO) {
  const y = Number((startISO || '').slice(0, 4));
  const m = Number((startISO || '').slice(5, 7));
  if (!y) return '';
  return m >= 7 ? y + '/' + String(y + 1).slice(2) : String(y);
}
