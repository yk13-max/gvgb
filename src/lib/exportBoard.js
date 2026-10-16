import { downloadBlob } from './download.js';
import { ABBR, STATS, balanceScore, overall, ovrAvg, ovrTotal, statAvg } from './model.js';
import { initials, shortName } from './names.js';
import { drawFacts, layoutFacts } from './drawFacts.js';

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
const FS = 1.4; // the board is 760px wide and shown at phone width, so text is scaled up
const FPAD = 22;
const FGAP = 18; // between the two columns
const FONT = 'Inter,sans-serif';

// Board -> PNG, drawn directly so the export matches what's on screen.
function drawBoard(teams, pos, showRatings, showSummary, facts = []) {
  const W = 760;
  // Pin positions are a percentage of the pitch, so the pitch keeps its height and
  // the summary strip extends the canvas below it.
  // Shorter than a real pitch's proportions: a chat app crops a tall image in its
  // preview, and positions are percentages, so the pins simply sit closer.
  const H = 860;
  const c = document.createElement('canvas');
  const measure = c.getContext('2d');
  // The facts sit two to a row, so four of them take two rows rather than four.
  const colW = (W - FPAD * 2 - FGAP) / 2;
  const cells = facts.map((f) => layoutFacts(measure, [f], colW - 12 * FS, FS, FONT)[0]);
  const rows = [];
  for (let i = 0; i < cells.length; i += 2) rows.push(cells.slice(i, i + 2));
  const rowsH = rows.reduce((sum, r) => sum + Math.max(...r.map((x) => x.h)), 0);
  const factsH = cells.length ? FPAD + 20 * FS + rowsH + FPAD / 2 : 0;
  c.width = W;
  c.height = H + (showSummary ? SUMMARY_H : 0) + factsH;
  const g = c.getContext('2d');
  g.fillStyle = '#1a222c';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,0.28)';
  g.lineWidth = 2;
  const m = W * 0.025;
  const r = { x: m, y: H * 0.025, w: W - 2 * m, h: H - 2 * (H * 0.025) };
  g.strokeRect(r.x, r.y, r.w, r.h);
  g.beginPath();
  g.moveTo(r.x, H / 2);
  g.lineTo(r.x + r.w, H / 2);
  g.stroke();
  g.beginPath();
  g.arc(W / 2, H / 2, W * 0.11, 0, Math.PI * 2);
  g.stroke();
  [1, -1].forEach((s) => {
    const top = s === 1 ? r.y : r.y + r.h;
    g.strokeRect(W * 0.22, s === 1 ? top : top - H * 0.13, W * 0.56, H * 0.13);
    g.strokeRect(W * 0.36, s === 1 ? top : top - H * 0.055, W * 0.28, H * 0.055);
  });
  const cols = COLS;
  ['red', 'blue'].forEach((t) =>
    teams[t].forEach((p) => {
      const c0 = pos[p.id] || { x: 50, y: t === 'red' ? 70 : 30 };
      const x = (c0.x / 100) * W;
      const y = (c0.y / 100) * H;
      g.beginPath();
      g.arc(x, y, 22, 0, Math.PI * 2);
      g.fillStyle = cols[t];
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = '#fff';
      g.font = 'bold 15px "Barlow Condensed",sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(initials(p.name), x, y + 1);
      g.font = '600 12px Inter,sans-serif';
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.fillText(showRatings ? shortName(p.name) + '  ' + overall(p) : shortName(p.name), x, y + 36);
    })
  );
  g.textAlign = 'left';
  g.font = 'bold 22px "Barlow Condensed",sans-serif';
  g.fillStyle = cols.blue;
  g.fillText('BLUE', 16, 26);
  g.fillStyle = cols.red;
  g.fillText('RED', 16, H - 18);
  if (showSummary) drawSummary(g, W, H, teams);
  if (cells.length) {
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
  const want = ['bold 15px "Barlow Condensed"', '600 12px Inter', '500 21px Inter', '700 14px Inter', 'bold 30px "JetBrains Mono"', '500 15px "JetBrains Mono"'];
  const loads = want.map((f) => document.fonts.load(f).catch(() => null));
  return Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 1500))]);
}

export async function exportBoard(teams, pos, { ratings = true, summary = false, facts = [] } = {}) {
  await fontsReady();
  const canvas = drawBoard(teams, pos, ratings, summary, facts);
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
