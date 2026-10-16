import { downloadBlob } from './download.js';
import { shortName } from './names.js';
import { AWARDS, lineupLabel, lineups, outcome, tally, weekPlayerIds } from './weeks.js';
import { formatDate } from './whatsapp.js';
import { drawFacts, factsHeight, layoutFacts } from './drawFacts.js';
import { postMatchFacts } from './facts.js';

// A night's results as one image: the scores, who was nominated, and the sides.
//
// Laid out at phone width, in the sizes a phone's own UI uses, then rendered at 3×. A
// chat app shows an image at screen width, so a card designed for 390 points reads at
// exactly these sizes on the phone it was made for — no squinting at 7px names — and
// stays sharp on a desktop, where it is simply large.

const W = 390;
const SCALE = 3;
const PAD = 20;
const COL = {
  bg: '#1a222c',
  panel: '#232c38',
  line: 'rgba(255,255,255,0.14)',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.6)',
  faint: 'rgba(255,255,255,0.42)',
  red: '#e0644d',
  blue: '#5b8ee8',
  gold: '#e8b73a',
  brand: '#4b9e5f',
};

// One face — the app's own body font — for everything. The condensed display face read
// as stretched at phone sizes, and a monospace fallback, if the web font had not been
// fetched in time, read worse. Numbers are centred on fixed positions, so they do not
// need a monospace to line up.
const FONT = 'Inter,sans-serif';
const DISPLAY = FONT;
const BODY = FONT;
const MONO = FONT;

// Canvas only uses a web font that has already been fetched; otherwise it silently
// substitutes. Ask for every weight the image uses before drawing a pixel, and give up
// waiting after a moment so a slow font server can never block a share.
const WEIGHTS = [400, 500, 600, 700];
function fontsReady() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const loads = WEIGHTS.map((w) => document.fonts.load(w + ' 16px Inter').catch(() => null));
  return Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 1500))]);
}

// Measuring and drawing read the same numbers, so the canvas is exactly as tall as what
// goes on it. Getting these out of step is how an image ends up with a band of dead
// space at the bottom.
const HEAD_H = 118;
const LABEL_H = 26; // a section label plus the gap under it
const MATCH_H = 62; // a 54pt row plus its gap
const NIGHT_H = 76;
const AWARD_H = 48; // a 42pt row plus its gap
const LINE_H = 17; // the line-ups are reference, so they sit smaller than the results
const GAP = 10;
const SIDE_LABEL_W = 38; // room for "RED" / "BLUE" before the names
const GROUP_LABEL_H = 16; // "All 3 matches" above a line-up
const GROUP_GAP = 8;

// Wraps a list of names, breaking only between names — "Tom B" is one thing and must
// not come apart across a line.
function wrapNames(g, names, maxWidth) {
  const lines = [];
  let line = '';
  names.forEach((n) => {
    const next = line ? line + ', ' + n : n;
    if (line && g.measureText(next).width > maxWidth) {
      lines.push(line);
      line = n;
    } else line = next;
  });
  if (line) lines.push(line);
  return lines;
}

// Draws the label and returns the y the section's first row starts at.
function sectionLabel(g, text, y) {
  g.textAlign = 'left';
  g.font = '600 11px ' + BODY;
  g.fillStyle = COL.faint;
  g.fillText(text.toUpperCase(), PAD, y + 12);
  return y + LABEL_H;
}

function draw(week, facts = []) {
  const t = tally([week]);
  const squad = weekPlayerIds(week);
  const awards = AWARDS.filter(([k]) => week.awards && week.awards[k] != null);
  const nameOf = (id) => {
    const p = squad.find((x) => x.id === id);
    if (p) return shortName(p.name);
    return week.ratings && week.ratings[id] ? shortName(week.ratings[id].name) : '—';
  };

  // --- measure the block whose height depends on the names in it ---
  // The sides, stated once per distinct pair. Five games between the same ten names is
  // one entry, not five; the match rows above carry the scores.
  const measure = document.createElement('canvas').getContext('2d');
  const names = (list) => list.map((p) => shortName(p.name));
  measure.font = '400 13px ' + BODY;
  const sideW = W - PAD * 2 - SIDE_LABEL_W;
  const groups = lineups(week).map((g) => ({
    label: lineupLabel(g, week.matches.length),
    red: wrapNames(measure, names(g.red), sideW),
    blue: wrapNames(measure, names(g.blue), sideW),
  }));
  const groupH = (g) => GROUP_LABEL_H + (g.red.length + g.blue.length) * LINE_H + GROUP_GAP;

  const matchesH = LABEL_H + week.matches.length * MATCH_H + GAP;
  const nightH = t.played > 0 ? NIGHT_H : 0;
  const awardsH = awards.length ? LABEL_H + awards.length * AWARD_H + GAP : 0;
  const sidesH = groups.length ? LABEL_H + groups.reduce((sum, g) => sum + groupH(g), 0) - GROUP_GAP : 0;
  // Talking points: what the night meant, against everything before it.
  const factLayout = facts.length ? layoutFacts(measure, facts, W - PAD * 2 - 12, 1, BODY) : [];
  const factsH = factLayout.length ? LABEL_H + factsHeight(factLayout) + GAP : 0;
  const H = HEAD_H + matchesH + nightH + awardsH + factsH + sidesH + PAD;

  const c = document.createElement('canvas');
  c.width = W * SCALE;
  c.height = H * SCALE;
  const g = c.getContext('2d');
  g.scale(SCALE, SCALE);
  g.fillStyle = COL.bg;
  g.fillRect(0, 0, W, H);
  g.textBaseline = 'alphabetic';

  // --- header ---
  g.textAlign = 'left';
  g.font = 'bold 18px ' + DISPLAY;
  g.fillStyle = COL.brand;
  g.fillText('FUFA', PAD, 38);
  const brand = g.measureText('FUFA').width;
  g.fillStyle = COL.text;
  g.fillText('RESULTS', PAD + brand + 8, 38);

  g.font = 'bold 34px ' + DISPLAY;
  g.fillStyle = COL.text;
  g.fillText(formatDate(week.date), PAD, 78);

  const detail = [
    week.venue,
    week.teamSize + '-a-side',
    squad.length + ' players',
    week.matches.length + (week.matches.length === 1 ? ' match' : ' matches'),
  ].filter(Boolean);
  g.font = '500 12px ' + BODY;
  g.fillStyle = COL.muted;
  g.fillText(detail.join('  ·  '), PAD, 100);

  let y = HEAD_H;

  // --- matches ---
  y = sectionLabel(g, week.matches.length === 1 ? 'The match' : 'The matches', y);
  week.matches.forEach((m, i) => {
    const o = outcome(m);
    const rowH = MATCH_H - 8;
    g.fillStyle = COL.panel;
    g.fillRect(PAD, y, W - PAD * 2, rowH);
    // A thin bar in the winner's colour, so the result reads before the numbers do.
    g.fillStyle = o === 'red' ? COL.red : o === 'blue' ? COL.blue : o === 'draw' ? COL.gold : COL.line;
    g.fillRect(PAD, y, 3, rowH);

    // Left: which match, and how it went. Right of centre: the score itself. Nothing on
    // the far right — at phone width a third column is what makes rows crowded.
    g.textAlign = 'left';
    g.font = '600 11px ' + BODY;
    g.fillStyle = COL.text;
    g.fillText('MATCH ' + (i + 1), PAD + 14, y + 24);
    g.font = '500 10px ' + BODY;
    g.fillStyle = COL.faint;
    g.fillText(
      o === 'red' ? 'Red win' : o === 'blue' ? 'Blue win' : o === 'draw' ? 'Draw' : o === 'off' ? 'Called off' : 'No score',
      PAD + 14,
      y + 40
    );

    if (o !== 'off' && o !== 'noscore') {
      const mid = W / 2 + 36;
      g.textAlign = 'right';
      g.font = 'bold 14px ' + DISPLAY;
      g.fillStyle = COL.red;
      g.fillText('RED', mid - 54, y + 33);
      g.textAlign = 'left';
      g.fillStyle = COL.blue;
      g.fillText('BLUE', mid + 54, y + 33);

      g.textAlign = 'center';
      g.font = 'bold 28px ' + MONO;
      g.fillStyle = o === 'red' ? COL.red : COL.text;
      g.fillText(String(m.redScore), mid - 26, y + 36);
      g.fillStyle = COL.faint;
      g.font = '400 18px ' + MONO;
      g.fillText('–', mid, y + 34);
      g.font = 'bold 28px ' + MONO;
      g.fillStyle = o === 'blue' ? COL.blue : COL.text;
      g.fillText(String(m.blueScore), mid + 26, y + 36);
    }
    y += MATCH_H;
  });
  y += GAP;

  // --- the night in numbers ---
  if (t.played > 0) {
    const cells = [
      [t.goalsRed + '–' + t.goalsBlue, 'GOALS R–B'],
      [String(t.red), 'RED WINS'],
      [String(t.blue), 'BLUE WINS'],
    ];
    const cw = (W - PAD * 2) / cells.length;
    cells.forEach(([value, label], i) => {
      const cx = PAD + cw * i + cw / 2;
      g.textAlign = 'center';
      g.font = 'bold 26px ' + MONO;
      g.fillStyle = i === 1 ? COL.red : i === 2 ? COL.blue : COL.text;
      g.fillText(value, cx, y + 34);
      g.font = '600 10px ' + BODY;
      g.fillStyle = COL.faint;
      g.fillText(label, cx, y + 52);
    });
    y += NIGHT_H;
  }

  // --- nominations ---
  if (awards.length) {
    y = sectionLabel(g, 'Nominations', y);
    awards.forEach(([k, label]) => {
      const potm = k === 'potm';
      const rowH = AWARD_H - 6;
      g.fillStyle = potm ? 'rgba(232,183,58,0.14)' : COL.panel;
      g.fillRect(PAD, y, W - PAD * 2, rowH);
      if (potm) {
        g.fillStyle = COL.gold;
        g.fillRect(PAD, y, 3, rowH);
      }
      g.textAlign = 'left';
      g.font = '600 11px ' + BODY;
      g.fillStyle = potm ? COL.gold : COL.muted;
      g.fillText(label.toUpperCase(), PAD + 14, y + 26);
      g.textAlign = 'right';
      g.font = 'bold 20px ' + DISPLAY;
      g.fillStyle = potm ? COL.gold : COL.text;
      g.fillText(nameOf(week.awards[k]), W - PAD - 14, y + 28);
      y += AWARD_H;
    });
    y += GAP;
  }

  // --- talking points ---
  if (factLayout.length) {
    y = sectionLabel(g, 'Talking points', y);
    y = drawFacts(g, factLayout, PAD, y, W - PAD * 2, 1, BODY);
    y += GAP;
  }

  // --- the sides ---
  if (groups.length) {
    y = sectionLabel(g, groups.length === 1 ? 'Line-up' : 'Line-ups', y);
    groups.forEach((grp, gi) => {
      g.textAlign = 'left';
      g.font = '600 10px ' + BODY;
      g.fillStyle = COL.faint;
      g.fillText(grp.label.toUpperCase(), PAD, y + 11);
      y += GROUP_LABEL_H;
      [
        ['RED', COL.red, grp.red],
        ['BLUE', COL.blue, grp.blue],
      ].forEach(([side, color, lines]) => {
        g.textAlign = 'left';
        g.font = 'bold 11px ' + DISPLAY;
        g.fillStyle = color;
        g.fillText(side, PAD, y + 13);
        g.font = '400 13px ' + BODY;
        g.fillStyle = COL.text;
        lines.forEach((line) => {
          g.fillText(line, PAD + SIDE_LABEL_W, y + 13);
          y += LINE_H;
        });
      });
      if (gi < groups.length - 1) y += GROUP_GAP;
    });
  }

  return c;
}

// `ctx` carries the rest of the history, so the card can say what the night meant:
// streaks, records, table movement and upsets.
export async function exportWeek(week, ctx = {}) {
  await fontsReady();
  const facts = ctx.facts === false || !ctx.weeks ? [] : postMatchFacts(week, ctx.weeks, ctx.players || [], { seasons: ctx.seasons || [] });
  const canvas = draw(week, facts);
  const name = 'fufa-results-' + (week.date || 'week') + '.png';
  canvas.toBlob((blob) => {
    if (!blob) return;
    const file = new File([blob], name, { type: 'image/png' });
    // On a phone a download is often a dead end — hand it to the share sheet when
    // there is one, the same way the board export does.
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator
        .share({ files: [file], title: 'FUFA results · ' + formatDate(week.date) })
        .catch(() => downloadBlob(blob, name));
    } else {
      downloadBlob(blob, name);
    }
  }, 'image/png');
}
