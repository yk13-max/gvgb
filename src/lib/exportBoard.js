import { downloadBlob } from './download.js';
import { ABBR, STATS, balanceScore, overall, ovrAvg, ovrTotal, statAvg } from './model.js';
import { initials, shortName } from './names.js';
import { drawFacts, layoutFacts } from './drawFacts.js';
import { drawBadge, loadBadges } from './badges.js';


const COLS = { red: '#c2402c', blue: '#2f66cf' };
const LEAD = { red: '#e0644d', blue: '#5b8ee8' };
const MUTED = 'rgba(255,255,255,0.55)';
const SUMMARY_H = 190;

// The balance readout as a strip under the pitch, so a shared image carries the
// numbers the panel shows on screen.
function drawSummary(g, W, top, teams) {
  const { red, blue } = teams;
  g.fillStyle = '#232c38';
  g.fillRect(0, top, W, SUMMARY_H);
  g.strokeStyle = 'rgba(255,255,255,0.16)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, top + 0.5);
  g.lineTo(W, top + 0.5);
  g.stroke();
  g.textBaseline = 'alphabetic';

  const pad = 20;
  const sides = [
    ['RED', red, 'left', pad, COLS.red],
    ['BLUE', blue, 'right', W - pad, COLS.blue],
  ];
  sides.forEach(([label, list, align, x, color]) => {
    g.textAlign = align;
    g.font = 'bold 20px "Barlow Condensed",sans-serif';
    g.fillStyle = color;
    g.fillText(label, x, top + 32);
    g.font = 'bold 30px "JetBrains Mono",monospace';
    g.fillStyle = '#fff';
    g.fillText(ovrAvg(list).toFixed(1), x, top + 66);
    g.font = '600 11px Inter,sans-serif';
    g.fillStyle = MUTED;
    g.fillText('AVG OVR · TOTAL ' + ovrTotal(list), x, top + 84);
  });

  g.textAlign = 'center';
  g.font = 'bold 30px "JetBrains Mono",monospace';
  g.fillStyle = '#fff';
  g.fillText(String(balanceScore(red, blue)), W / 2, top + 66);
  g.font = '600 11px Inter,sans-serif';
  g.fillStyle = MUTED;
  g.fillText('BALANCE /100', W / 2, top + 84);

  g.strokeStyle = 'rgba(255,255,255,0.12)';
  g.beginPath();
  g.moveTo(pad, top + 100.5);
  g.lineTo(W - pad, top + 100.5);
  g.stroke();

  // One column per stat: label, then each side's average with the leader highlighted.
  const cw = W / STATS.length;
  STATS.forEach((k, i) => {
    const cx = cw * i + cw / 2;
    const r = statAvg(red, k);
    const b = statAvg(blue, k);
    g.textAlign = 'center';
    g.font = '600 10px Inter,sans-serif';
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.fillText(ABBR[k], cx, top + 124);
    g.font = '500 15px "JetBrains Mono",monospace';
    g.fillStyle = r >= b ? LEAD.red : MUTED;
    g.fillText(String(Math.round(r)), cx, top + 148);
    g.fillStyle = b >= r ? LEAD.blue : MUTED;
    g.fillText(String(Math.round(b)), cx, top + 172);
  });
}

// The pre-match strip: talking points for the group chat, under everything else.
// The board is 760px wide and shown at phone width, so text is scaled up — a little, so up
// to eight talking points fit without making the image too tall for a chat preview.
const FS = 1.15;
const FPAD = 22;
const FGAP = 18; // between the two columns
const FONT = 'Inter,sans-serif';

const MAX_RATIO = 1.5; // height to width, at most
const SIDE = 130; // the favourite column beside the pitch

function wrapWords(g, text, width) {
  const out = [];
  let line = '';
  text.split(' ').forEach((w) => {
    const next = line ? line + ' ' + w : w;
    if (line && g.measureText(next).width > width) {
      out.push(line);
      line = w;
    } else line = next;
  });
  if (line) out.push(line);
  return out;
}

// The favourite, as a column beside the pitch: who it is in words at the top, and under
// it a bar that runs the length of the pitch, Blue's end at the top and Red's at the
// bottom like the sides themselves, split at each side's chance. The side that isn't
// favourite is dimmed. Words, never numbers — the image goes to everyone.
function drawFavourite(g, fav, x, y, w, h) {
  const tone = fav.side ? LEAD[fav.side] : '#e8b73a';
  const pad = 14;
  g.fillStyle = '#1f2833';
  g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(255,255,255,0.16)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x + 0.5, y);
  g.lineTo(x + 0.5, y + h);
  g.stroke();

  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillStyle = tone;
  g.font = '700 12px ' + FONT;
  g.fillText('FAVOURITE', x + pad, y + 30);
  const who = fav.side ? (fav.side === 'red' ? 'RED' : 'BLUE') : 'LEVEL';
  let size = 40;
  g.font = 'bold ' + size + 'px "Barlow Condensed",sans-serif';
  while (size > 24 && g.measureText(who).width > w - pad * 2) {
    size -= 2;
    g.font = 'bold ' + size + 'px "Barlow Condensed",sans-serif';
  }
  g.fillText(who, x + pad, y + 70);
  g.font = '600 16px ' + FONT;
  g.fillStyle = '#ffffff';
  // Broken by hand where the column would split a phrase badly.
  const lines = fav.side ? wrapWords(g, fav.how, w - pad * 2) : ['Too close', 'to call'];
  lines.forEach((l, i) => g.fillText(l, x + pad, y + 96 + i * 21));

  const bw = 22;
  const bx = x + (w - bw) / 2;
  const top = y + 96 + lines.length * 21 + 34;
  const bottom = y + h - 44;
  const bh = bottom - top;
  // Blue holds the top of the bar, Red the bottom: the split sits at Blue's share.
  const cut = top + bh * Math.max(0.04, Math.min(0.96, 1 - fav.p));
  const seg = (y0, y1, colour, round) => {
    const r = bw / 2;
    g.fillStyle = colour;
    g.beginPath();
    if (round === 'top') {
      g.moveTo(bx, y1);
      g.lineTo(bx, y0 + r);
      g.arcTo(bx, y0, bx + r, y0, r);
      g.arcTo(bx + bw, y0, bx + bw, y0 + r, r);
      g.lineTo(bx + bw, y1);
    } else {
      g.moveTo(bx, y0);
      g.lineTo(bx + bw, y0);
      g.lineTo(bx + bw, y1 - r);
      g.arcTo(bx + bw, y1, bx + bw - r, y1, r);
      g.arcTo(bx, y1, bx, y1 - r, r);
      g.lineTo(bx, y0);
    }
    g.closePath();
    g.fill();
  };
  const dim = (sideName) => (fav.side && fav.side !== sideName ? 0.45 : 1);
  g.globalAlpha = dim('blue');
  seg(top, cut, COLS.blue, 'top');
  g.globalAlpha = dim('red');
  seg(cut, bottom, COLS.red, 'bottom');
  g.globalAlpha = 1;
  // halfway, so a lean is visible even when it is small
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.fillRect(bx - 6, top + bh / 2 - 1, bw + 12, 2);
  // the marker where the two chances meet
  g.fillStyle = '#ffffff';
  g.fillRect(bx - 8, cut - 2.5, bw + 16, 5);
  g.textAlign = 'center';
  g.font = 'bold 18px "Barlow Condensed",sans-serif';
  g.fillStyle = COLS.blue;
  g.fillText('BLUE', x + w / 2, top - 10);
  g.fillStyle = COLS.red;
  g.fillText('RED', x + w / 2, bottom + 24);
  g.textAlign = 'left';
}

// Board -> PNG, drawn directly so the export matches what's on screen.
function drawBoard(teams, pos, showRatings, showSummary, facts = [], badges = {}, fav = null) {
  const W = 760;
  // Pin positions are a percentage of the pitch, so the pitch keeps its height and
  // the summary strip extends the canvas below it.
  // Shorter than a real pitch's proportions: a chat app crops a tall image in its
  // preview, and positions are percentages, so the pins simply sit closer. Shorter
  // again when talking points go underneath, to leave them room.
  // With the favourite on, the pitch narrows and the favourite stands in a column to
  // its right, the full height of the pitch, leaving the strip below for talking points.
  const strip = facts.length > 0;
  const H = strip || fav ? 780 : 860;
  const PW = fav ? W - SIDE : W;
  const c = document.createElement('canvas');
  const measure = c.getContext('2d');
  // The facts sit two to a row, so four of them take two rows rather than four. The
  // whole image stays within MAX_RATIO (2:3, a tall phone photo) so WhatsApp shows it
  // without much cropping: rows are added, strongest first, while they still fit.
  const colW = (W - FPAD * 2 - FGAP) / 2;
  const cells = facts.map((f) => layoutFacts(measure, [f], colW - 12 * FS, FS, FONT)[0]);
  const head = FPAD + 20 * FS;
  const foot = FPAD / 2;
  let room = W * MAX_RATIO - H - (showSummary ? SUMMARY_H : 0) - head - foot;
  const rows = [];
  for (let i = 0; i < cells.length; i += 2) {
    const r = cells.slice(i, i + 2);
    const h = Math.max(...r.map((x) => x.h));
    if (h > room) break;
    rows.push(r);
    room -= h;
  }
  const rowsH = rows.reduce((sum, r) => sum + Math.max(...r.map((x) => x.h)), 0);
  const factsH = strip ? head + rowsH + foot : 0;
  c.width = W;
  c.height = H + (showSummary ? SUMMARY_H : 0) + factsH;
  const g = c.getContext('2d');
  g.fillStyle = '#1a222c';
  g.fillRect(0, 0, PW, H);
  g.strokeStyle = 'rgba(255,255,255,0.28)';
  g.lineWidth = 2;
  const m = PW * 0.025;
  const r = { x: m, y: H * 0.025, w: PW - 2 * m, h: H - 2 * (H * 0.025) };
  g.strokeRect(r.x, r.y, r.w, r.h);
  g.beginPath();
  g.moveTo(r.x, H / 2);
  g.lineTo(r.x + r.w, H / 2);
  g.stroke();
  g.beginPath();
  g.arc(PW / 2, H / 2, PW * 0.11, 0, Math.PI * 2);
  g.stroke();
  [1, -1].forEach((s) => {
    const top = s === 1 ? r.y : r.y + r.h;
    g.strokeRect(PW * 0.22, s === 1 ? top : top - H * 0.13, PW * 0.56, H * 0.13);
    g.strokeRect(PW * 0.36, s === 1 ? top : top - H * 0.055, PW * 0.28, H * 0.055);
  });
  const cols = COLS;
  // Pins sized for a phone: the image is shown at about half its width, so these read
  // as a comfortable 19pt disc and 11pt name. Each name sits on a dark tab so it stays
  // legible across the pitch lines.
  const PIN = 38;
  ['red', 'blue'].forEach((t) =>
    teams[t].forEach((p) => {
      const c0 = pos[p.id] || { x: 50, y: t === 'red' ? 70 : 30 };
      const x = (c0.x / 100) * PW;
      const y = (c0.y / 100) * H;
      g.beginPath();
      g.arc(x, y, PIN, 0, Math.PI * 2);
      g.fillStyle = cols[t];
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = 3;
      g.stroke();
      g.fillStyle = '#fff';
      g.font = 'bold 30px "Barlow Condensed",sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(initials(p.name), x, y + 2);
      if (p.club) drawBadge(g, p.club, badges[p.club], x + PIN * 0.98, y - PIN * 0.86, 30); // on the shoulder, clear of the initials

      const label = showRatings ? shortName(p.name) + '  ' + overall(p) : shortName(p.name);
      g.font = '700 22px Inter,sans-serif';
      const tw = g.measureText(label).width + 16;
      // Kept on the canvas: a pin near the edge pulls its name inwards.
      const lx = Math.max(tw / 2 + 4, Math.min(PW - tw / 2 - 4, x));
      const ly = Math.min(H - 18, y + PIN + 20);
      g.fillStyle = 'rgba(10,14,20,0.72)';
      const rx = lx - tw / 2;
      const ry = ly - 15;
      const rw = tw;
      const rh = 30;
      const rr = 8;
      g.beginPath();
      g.moveTo(rx + rr, ry);
      g.arcTo(rx + rw, ry, rx + rw, ry + rh, rr);
      g.arcTo(rx + rw, ry + rh, rx, ry + rh, rr);
      g.arcTo(rx, ry + rh, rx, ry, rr);
      g.arcTo(rx, ry, rx + rw, ry, rr);
      g.fill();
      g.fillStyle = '#fff';
      g.fillText(label, lx, ly + 1);
    })
  );
  g.textAlign = 'left';
  g.font = 'bold 22px "Barlow Condensed",sans-serif';
  g.fillStyle = cols.blue;
  g.fillText('BLUE', 16, 26);
  g.fillStyle = cols.red;
  g.fillText('RED', 16, H - 18);
  if (fav) drawFavourite(g, fav, PW, 0, SIDE, H);
  if (showSummary) drawSummary(g, W, H, teams);
  if (strip) {
    const top = H + (showSummary ? SUMMARY_H : 0);
    g.fillStyle = '#1f2833';
    g.fillRect(0, top, W, factsH);
    g.strokeStyle = 'rgba(255,255,255,0.16)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, top + 0.5);
    g.lineTo(W, top + 0.5);
    g.stroke();
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.font = '700 ' + 11 * FS + 'px ' + FONT;
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.fillText('PRE-MATCH', FPAD, top + FPAD + 12 * FS);
    let y = top + FPAD + 20 * FS;
    rows.forEach((r) => {
      r.forEach((cell, i) => drawFacts(g, [cell], FPAD + i * (colW + FGAP), y, colW, FS, FONT));
      y += Math.max(...r.map((x) => x.h));
    });
  }
  return c;
}

// Canvas silently substitutes a web font that has not been fetched yet. Ask for the
// faces the board uses first; stop waiting after a moment rather than block the share.
function fontsReady() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const want = ['bold 30px "Barlow Condensed"', '700 22px Inter', '600 12px Inter', '500 21px Inter', '700 14px Inter', 'bold 30px "JetBrains Mono"', '500 15px "JetBrains Mono"'];
  const loads = want.map((f) => document.fonts.load(f).catch(() => null));
  return Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 1500))]);
}

export async function exportBoard(teams, pos, { ratings = true, summary = false, facts = [], favourite = null } = {}) {
  const [, badges] = await Promise.all([fontsReady(), loadBadges([...(teams.red || []), ...(teams.blue || [])])]);
  const canvas = drawBoard(teams, pos, ratings, summary, facts, badges, favourite);
  const filename = 'fufa-teams.png';
  canvas.toBlob((blob) => {
    if (!blob) return;
    const file = new File([blob], filename, { type: 'image/png' });
    // On phones a download is often a dead end — hand the image to the share sheet
    // (WhatsApp, Photos) when the browser supports it, and fall back to a download.
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'FUFA teams' }).catch(() => downloadBlob(blob, filename));
    } else {
      downloadBlob(blob, filename);
    }
  }, 'image/png');
}
