import { downloadBlob } from './download.js';
import { shortName } from './names.js';
import { formatDate } from './whatsapp.js';
import { drawFacts, factsHeight, layoutFacts } from './drawFacts.js';
import { tableFacts } from './facts.js';
import { drawBadge, loadBadges } from './badges.js';
import { matchWord } from './seasons.js';

// The league table as one image, with a few talking points under it, laid out at phone
// width and rendered at 3× like the results card. It never gets taller than 2:3, so a
// chat app shows it whole: rows shrink a little to fit, and past that the table stops
// with "and N more".

const W = 390;
const SCALE = 3;
const PAD = 18;
const MAX_H = W * 1.5;
const FONT = 'Inter,sans-serif';
const COL = {
  bg: '#1a222c',
  panel: '#232c38',
  line: 'rgba(255,255,255,0.12)',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.6)',
  faint: 'rgba(255,255,255,0.38)',
  win: '#4fb26b',
  loss: '#e0644d',
  gold: '#e8b73a',
  brand: '#4b9e5f',
};
const HEAD_H = 72;
const COLHEAD_H = 20;
const FACT_S = 0.82;
const LABEL_H = 18;

function fontsReady() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const loads = [400, 500, 600, 700].map((w) => document.fonts.load(w + ' 16px Inter').catch(() => null));
  return Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 1500))]);
}

// Positions shown: qualified players ranked, ties sharing a number; the rest unranked.
function ranks(rows) {
  let rank = 0;
  let seen = 0;
  let prev = null;
  return rows.map((r) => {
    if (r.short) return null;
    seen += 1;
    const key = r.pct == null ? 'none' : r.pct.toFixed(3);
    if (key !== prev) {
      rank = seen;
      prev = key;
    }
    return rank;
  });
}

function draw(rows, { title, sub, min }, facts, badges) {
  const measure = document.createElement('canvas').getContext('2d');
  const factLayout = facts.length ? layoutFacts(measure, facts, W - PAD * 2 - 12 * FACT_S, FACT_S, FONT) : [];
  const factsH = factLayout.length ? LABEL_H + factsHeight(factLayout) + 4 : 0;
  const splitAt = rows.findIndex((r) => r.short);
  const hasSplit = splitAt > 0;
  const room = MAX_H - HEAD_H - COLHEAD_H - factsH - PAD - (hasSplit ? 18 : 0);
  // Rows between 20 and 25pt; if even 20 won't fit, the table stops early.
  const rowH = Math.max(20, Math.min(25, room / Math.max(1, rows.length)));
  let shown = rows.length;
  if (rows.length * rowH > room) shown = Math.max(1, Math.floor(room / rowH) - 1);
  const more = rows.length - shown;
  const visible = rows.slice(0, shown);
  const splitShown = hasSplit && splitAt < shown;
  const tableH = COLHEAD_H + visible.length * rowH + (splitShown ? 18 : 0) + (more ? rowH : 0);
  const H = Math.ceil(HEAD_H + tableH + factsH + PAD);

  const c = document.createElement('canvas');
  c.width = W * SCALE;
  c.height = H * SCALE;
  const g = c.getContext('2d');
  g.scale(SCALE, SCALE);
  g.fillStyle = COL.bg;
  g.fillRect(0, 0, W, H);

  // Header
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  g.font = '800 12px ' + FONT;
  g.fillStyle = COL.brand;
  g.fillText('FUFA', PAD, 24);
  g.font = '700 20px ' + FONT;
  g.fillStyle = COL.text;
  g.fillText(title, PAD, 46);
  g.font = '500 11px ' + FONT;
  g.fillStyle = COL.muted;
  g.fillText(sub, PAD, 60);

  // Columns: position, name, games, W–L, PCT, POTM, form
  const X = { pos: PAD + 10, name: PAD + 26, g: 206, wl: 240, pct: 282, potm: 316, form: 336 };
  let y = HEAD_H;
  g.fillStyle = COL.panel;
  g.fillRect(PAD - 6, y, W - PAD * 2 + 12, tableH);
  g.font = '700 9px ' + FONT;
  g.fillStyle = COL.faint;
  g.textAlign = 'center';
  g.fillText('#', X.pos, y + 13);
  g.fillText('G', X.g, y + 13);
  g.fillText('W–L', X.wl, y + 13);
  g.fillText('PCT', X.pct, y + 13);
  g.fillText('POTM', X.potm, y + 13);
  g.textAlign = 'left';
  g.fillText('PLAYER', X.name, y + 13);
  g.fillText('LAST 5', X.form, y + 13);
  y += COLHEAD_H;

  const pos = ranks(rows);
  visible.forEach((r, i) => {
    if (splitShown && i === splitAt) {
      g.fillStyle = COL.line;
      g.fillRect(PAD - 6, y + 1, W - PAD * 2 + 12, 1);
      g.font = '700 8.5px ' + FONT;
      g.fillStyle = COL.faint;
      g.textAlign = 'left';
      g.fillText('NOT YET QUALIFIED · NEEDS ' + matchWord(min).toUpperCase(), X.name, y + 13);
      y += 18;
    }
    const mid = y + rowH / 2 + 4;
    const dim = r.short > 0;
    if (i % 2 === 1) {
      g.fillStyle = 'rgba(255,255,255,0.03)';
      g.fillRect(PAD - 6, y, W - PAD * 2 + 12, rowH);
    }
    g.textAlign = 'center';
    g.font = '700 11px ' + FONT;
    g.fillStyle = dim ? COL.faint : pos[i] === 1 ? COL.gold : COL.muted;
    g.fillText(dim ? '–' : String(pos[i]), X.pos, mid);
    let nx = X.name;
    if (r.club && badges[r.club] !== undefined) {
      drawBadge(g, r.club, badges[r.club], nx + 6, mid - 4, 10);
      nx += 16;
    }
    g.textAlign = 'left';
    g.font = (pos[i] === 1 ? '700' : '600') + ' 12px ' + FONT;
    g.fillStyle = dim ? COL.muted : COL.text;
    let label = shortName(r.name);
    while (g.measureText(label).width > X.g - 16 - nx && label.length > 3) label = label.slice(0, -2) + '…';
    g.fillText(label, nx, mid);
    g.textAlign = 'center';
    g.font = '500 11px ' + FONT;
    g.fillStyle = dim ? COL.faint : COL.muted;
    g.fillText(String(r.games), X.g, mid);
    g.fillStyle = dim ? COL.faint : COL.text;
    g.fillText(r.won + '–' + r.lost, X.wl, mid);
    g.font = '600 11px ' + FONT;
    g.fillText(r.pct == null ? '–' : r.pct.toFixed(3).replace(/^0/, ''), X.pct, mid);
    g.font = '500 11px ' + FONT;
    g.fillStyle = r.potm ? COL.gold : COL.faint;
    g.fillText(String(r.potm || 0), X.potm, mid);
    (r.form || []).forEach((f, k) => {
      g.fillStyle = f === 'W' ? COL.win : COL.loss;
      g.globalAlpha = dim ? 0.5 : 1;
      g.fillRect(X.form + k * 7, mid - 8, 5.5, 10);
      g.globalAlpha = 1;
    });
    y += rowH;
  });
  if (more) {
    g.textAlign = 'left';
    g.font = '500 10.5px ' + FONT;
    g.fillStyle = COL.faint;
    g.fillText('and ' + more + ' more', X.name, y + rowH / 2 + 4);
    y += rowH;
  }

  if (factLayout.length) {
    y += 14;
    g.textAlign = 'left';
    g.font = '700 9px ' + FONT;
    g.fillStyle = COL.faint;
    g.fillText('TALKING POINTS', PAD, y);
    y += LABEL_H - 6;
    drawFacts(g, factLayout, PAD, y, W - PAD * 2, FACT_S, FONT);
  }
  return c;
}

// `rows` is the table as the page shows it (qualified first, each row's `short` set).
export async function exportTable(rows, { seasonLabel, weeks = 0, min = 0, completedOn = null, facts = true } = {}) {
  await fontsReady();
  const badges = await loadBadges(rows);
  const title = 'League table' + (seasonLabel ? ' · ' + seasonLabel : '');
  const sub = (completedOn ? 'Final table · completed ' + formatDate(completedOn) : weeks + ' week' + (weeks === 1 ? '' : 's') + ' played') + (min ? ' · ' + matchWord(min) + ' to take a place' : '');
  const canvas = draw(rows, { title, sub, min }, facts ? tableFacts(rows, { min }) : [], badges);
  const name = 'fufa-table' + (seasonLabel ? '-' + seasonLabel.replace(/[^\w-]+/g, '-') : '') + '.png';
  canvas.toBlob((blob) => {
    if (!blob) return;
    const file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'FUFA · ' + title }).catch(() => downloadBlob(blob, name));
    } else {
      downloadBlob(blob, name);
    }
  }, 'image/png');
}
