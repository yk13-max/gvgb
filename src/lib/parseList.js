// Pull player names out of a pasted WhatsApp signup list.

const norm = (s) => s.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();

function lev(a, b) {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i].concat(Array(n).fill(0)));
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[m][n];
}

export function parseList(raw) {
  const out = [];
  raw.split(/\r?\n/).forEach((line) => {
    let s = line.replace(/[‎‏]/g, '').trim();
    s = s.replace(/^[\s\-–•*·>]+/, '').replace(/^\(?\d{1,2}\s*[.)\-:]\s*/, '');
    if (/^\[?\d{1,2}[:/]\d{2}/.test(s)) return; // chat timestamps
    if (/https?:|@|\+\d{6,}/.test(s)) return;
    let pos = null;
    const tag = s.match(/\(([^)]*)\)|\b(gk|keeper|goalie)\b/i);
    if (tag) {
      const t = (tag[1] || tag[2] || '').toLowerCase();
      if (/gk|keep|goal/.test(t)) pos = 'Goalkeeper';
      else if (/def|cb|rb|lb/.test(t)) pos = 'Defender';
      else if (/mid|cm|dm/.test(t)) pos = 'Midfielder';
      else if (/st|str|fw|att/.test(t)) pos = 'Striker';
    }
    s = s.replace(/\([^)]*\)/g, '').replace(/\b(gk|keeper|goalie|in|out|maybe|paid|confirmed|yes)\b/gi, '');
    s = s.replace(/[^A-Za-z'’\-\s.]/g, '').replace(/\s+/g, ' ').trim();
    if (!s || s.length < 2 || s.length > 28) return;
    if (s.split(' ').length > 4) return;
    if (/^(team|red|blue|list|players|squad|a side|side|pitch|time|date|location|whos|who is|line up|lineup)$/i.test(s)) return;
    // Lines that read like admin chatter rather than a name come in pre-skipped.
    const suspect =
      /\d/.test(line.replace(/^[\s\-–•*·>]*\(?\d{1,2}\s*[.)\-:]?\s*/, '')) ||
      /\b(mon|tue|tues|wed|thu|thur|fri|sat|sun|am|pm|pitch|match|game|week|kick|off|court|astro|book|paid|cash|fee)\b/i.test(line);
    out.push({
      raw: line.trim(),
      name: s.split(' ').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '),
      pos,
      suspect,
    });
  });
  return out;
}

function scoreAgainst(candidate, n, first) {
  const pn = norm(candidate);
  if (!pn) return 0;
  const pf = pn.split(' ')[0];
  if (pn === n) return 100;
  if (pf === first && (n.split(' ').length === 1 || pn.split(' ').length === 1)) return 88;
  if (pn.startsWith(n) || n.startsWith(pn)) return 80;
  const d = lev(pn, n);
  if (d <= 2 && Math.max(pn.length, n.length) > 4) return 74 - d * 4;
  if (lev(pf, first) <= 1) return 66;
  return 0;
}

// Fuzzy match a pasted name against the saved roster — "Jo" should find "Jo Reyes".
// Nicknames are matched alongside the real name, so whatever the group calls someone
// in the chat still lands on the right player.
export function bestMatch(name, players) {
  const n = norm(name);
  const first = n.split(' ')[0];
  let best = null;
  let bestScore = 0;
  players.forEach((p) => {
    const sc = [p.name, ...(p.nicknames || [])].reduce(
      (top, candidate) => Math.max(top, scoreAgainst(candidate, n, first)),
      0
    );
    if (sc > bestScore) {
      bestScore = sc;
      best = p;
    }
  });
  return bestScore >= 66 ? best : null;
}
