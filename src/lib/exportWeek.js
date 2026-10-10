import { downloadBlob } from './download.js';
import { shortName } from './names.js';
import { AWARDS, lineupLabel, lineups, outcome, tally, weekPlayerIds } from './weeks.js';
import { formatDate } from './whatsapp.js';

// A night's results as one image: the scores, who was nominated, and who turned out.
// Drawn on a canvas rather than screenshotted so it reads the same on every phone.

const W = 760;
const PAD = 34;
const COL = {
  bg: '#1a222c',
  panel: '#232c38',
  line: 'rgba(255,255,255,0.14)',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.55)',
  faint: 'rgba(255,255,255,0.38)',
  red: '#e0644d',
  blue: '#5b8ee8',
  gold: '#e8b73a',
};

const DISPLAY = '"Barlow Condensed",sans-serif';
const BODY = 'Inter,sans-serif';
const MONO = '"JetBrains Mono",monospace';

// Measuring and drawing read the same numbers, so the canvas is exactly as tall as what
// goes on it. Getting these out of step is how an image ends up with a band of dead
// space at the bottom.
const HEAD_H = 150;
const LABEL_H = 34; // a section label plus the gap under it
const MATCH_H = 54;
const NIGHT_H = 92;
const AWARD_H = 42;
const LINE_H = 24;
const GAP = 12;
const SIDE_LABEL_W = 56; // room for "RED" / "BLUE" before the names
const GROUP_LABEL_H = 22; // "All 3 matches" above a line-up
const GROUP_GAP = 14;

function wrap(g, text, maxWidth) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  words.forEach((w) => {
    const next = line ? line + ' ' + w : w;
    if (line && g.measureText(next).width > maxWidth) {
      lines.push(line);
      line = w;
    } else line = next;
  });
  if (line) lines.push(line);
  return lines;
}

// Draws the label and returns the y the section's first row starts at.
function sectionLabel(g, text, y) {
  g.textAlign = 'left';
  g.font = '600 12px ' + BODY;
  g.fillStyle = COL.faint;
  g.fillText(text.toUpperCase(), PAD, y + 14);
  return y + LABEL_H;
}

// Laid out twice: once to measure so the canvas is exactly tall enough, once to draw.
function layout(week) {
  const t = tally([week]);
  const squad = weekPlayerIds(week);
  const awards = AWARDS.filter(([k]) => week.awards && week.awards[k] != null);
  const nameOf = (id) => {
    const p = squad.find((x) => x.id === id);
    if (p) return shortName(p.name);
    return week.ratings && week.ratings[id] ? shortName(week.ratings[id].name) : '—';
  };
  return { t, squad, awards, nameOf };
}

function draw(week) {
  const { t, squad, awards, nameOf } = layout(week);
  const measure = document.createElement('canvas').getContext('2d');

  // --- measure the block whose height depends on the names in it ---
  // The sides, stated once per distinct pair. Five games between the same ten names is
  // one entry, not five; the match rows above carry the scores.
  const names = (list) => list.map((p) => shortName(p.name)).join(', ');
  measure.font = '400 15px ' + BODY;
  const sideW = W - PAD * 2 - SIDE_LABEL_W;
  const groups = lineups(week).map((g) => ({
    label: lineupLabel(g, week.matches.length),
    red: wrap(measure, names(g.red), sideW),
    blue: wrap(measure, names(g.blue), sideW),
  }));
  const groupH = (g) => GROUP_LABEL_H + (g.red.length + g.blue.length) * LINE_H + GROUP_GAP;

  const matchesH = LABEL_H + week.matches.length * MATCH_H + GAP;
  const nightH = t.played > 0 ? NIGHT_H : 0;
  const awardsH = awards.length ? LABEL_H + awards.length * AWARD_H + GAP : 0;
  const sidesH = groups.length ? LABEL_H + groups.reduce((sum, g) => sum + groupH(g), 0) - GROUP_GAP : 0;
  const H = HEAD_H + matchesH + nightH + awardsH + sidesH + PAD;

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = COL.bg;
  g.fillRect(0, 0, W, H);
  g.textBaseline = 'alphabetic';

  // --- header ---
  g.textAlign = 'left';
  g.font = 'bold 30px ' + DISPLAY;
  g.fillStyle = '#4b9e5f';
  g.fillText('FUFA', PAD, 52);
  const brand = g.measureText('FUFA').width;
  g.fillStyle = COL.text;
  g.fillText('RESULTS', PAD + brand + 16, 52);

  g.font = 'bold 44px ' + DISPLAY;
  g.fillStyle = COL.text;
  g.fillText(formatDate(week.date), PAD, 104);

  const detail = [
    week.venue,
    week.teamSize + '-a-side',
    squad.length + ' players',
    week.matches.length + (week.matches.length === 1 ? ' match' : ' matches'),
  ].filter(Boolean);
  g.font = '500 14px ' + BODY;
  g.fillStyle = COL.muted;
  g.fillText(detail.join('  ·  '), PAD, 130);

  let y = HEAD_H;

  // --- matches ---
  y = sectionLabel(g, week.matches.length === 1 ? 'The match' : 'The matches', y);
  week.matches.forEach((m, i) => {
    const o = outcome(m);
    g.fillStyle = COL.panel;
    g.fillRect(PAD, y, W - PAD * 2, 46);
    // A thin bar in the winner's colour, so the result reads before the numbers do.
    g.fillStyle = o === 'red' ? COL.red : o === 'blue' ? COL.blue : COL.line;
    g.fillRect(PAD, y, 4, 46);

    g.textAlign = 'left';
    g.font = '600 12px ' + BODY;
    g.fillStyle = COL.faint;
    g.fillText('MATCH ' + (i + 1), PAD + 20, y + 28);

    if (o === 'off' || o === 'noscore') {
      g.textAlign = 'center';
      g.font = '500 17px ' + BODY;
      g.fillStyle = COL.muted;
      g.fillText(o === 'off' ? 'Called off' : 'No score', W / 2, y + 29);
    } else {
      const mid = W / 2;
      g.textAlign = 'right';
      g.font = 'bold 17px ' + DISPLAY;
      g.fillStyle = COL.red;
      g.fillText('RED', mid - 74, y + 29);
      g.textAlign = 'left';
      g.fillStyle = COL.blue;
      g.fillText('BLUE', mid + 74, y + 29);

      g.textAlign = 'center';
      g.font = 'bold 26px ' + MONO;
      g.fillStyle = o === 'red' ? COL.red : COL.muted;
      g.fillText(String(m.redScore), mid - 32, y + 31);
      g.fillStyle = COL.faint;
      g.font = '400 20px ' + MONO;
      g.fillText('–', mid, y + 30);
      g.font = 'bold 26px ' + MONO;
      g.fillStyle = o === 'blue' ? COL.blue : COL.muted;
      g.fillText(String(m.blueScore), mid + 32, y + 31);

      g.textAlign = 'right';
      g.font = '600 12px ' + BODY;
      g.fillStyle = COL.faint;
      g.fillText(o === 'draw' ? 'DRAW' : o.toUpperCase() + ' WIN', W - PAD - 16, y + 28);
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
      [String(t.draw), 'DRAWS'],
    ];
    const cw = (W - PAD * 2) / cells.length;
    cells.forEach(([value, label], i) => {
      const cx = PAD + cw * i + cw / 2;
      g.textAlign = 'center';
      g.font = 'bold 28px ' + MONO;
      g.fillStyle = i === 1 ? COL.red : i === 2 ? COL.blue : COL.text;
      g.fillText(value, cx, y + 36);
      g.font = '600 11px ' + BODY;
      g.fillStyle = COL.faint;
      g.fillText(label, cx, y + 56);
    });
    y += NIGHT_H;
  }

  // --- nominations ---
  if (awards.length) {
    y = sectionLabel(g, 'Nominations', y);
    awards.forEach(([k, label]) => {
      const potm = k === 'potm';
      g.fillStyle = potm ? 'rgba(232,183,58,0.12)' : COL.panel;
      g.fillRect(PAD, y, W - PAD * 2, 36);
      if (potm) {
        g.fillStyle = COL.gold;
        g.fillRect(PAD, y, 4, 36);
      }
      g.textAlign = 'left';
      g.font = '600 13px ' + BODY;
      g.fillStyle = potm ? COL.gold : COL.muted;
      g.fillText(label.toUpperCase(), PAD + 20, y + 23);
      g.textAlign = 'right';
      g.font = 'bold 22px ' + DISPLAY;
      g.fillStyle = potm ? COL.gold : COL.text;
      g.fillText(nameOf(week.awards[k]), W - PAD - 16, y + 25);
      y += AWARD_H;
    });
    y += GAP;
  }

  // --- the sides ---
  if (groups.length) {
    y = sectionLabel(g, groups.length === 1 ? 'Line-up' : 'Line-ups', y);
    groups.forEach((grp, gi) => {
      g.textAlign = 'left';
      g.font = '600 11px ' + BODY;
      g.fillStyle = COL.faint;
      g.fillText(grp.label.toUpperCase(), PAD, y + 12);
      y += GROUP_LABEL_H;
      [
        ['RED', COL.red, grp.red],
        ['BLUE', COL.blue, grp.blue],
      ].forEach(([side, color, lines]) => {
        g.textAlign = 'left';
        g.font = 'bold 15px ' + DISPLAY;
        g.fillStyle = color;
        g.fillText(side, PAD, y + 16);
        g.font = '400 15px ' + BODY;
        g.fillStyle = COL.text;
        lines.forEach((line) => {
          g.fillText(line, PAD + SIDE_LABEL_W, y + 16);
          y += LINE_H;
        });
      });
      if (gi < groups.length - 1) y += GROUP_GAP;
    });
  }

  return c;
}

export function exportWeek(week) {
  const canvas = draw(week);
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
