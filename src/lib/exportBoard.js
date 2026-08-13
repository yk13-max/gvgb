import { downloadBlob } from './download.js';
import { ABBR, STATS, balanceScore, overall, ovrAvg, ovrTotal, statAvg } from './model.js';
import { initials, shortName } from './names.js';

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

// Board -> PNG, drawn directly so the export matches what's on screen.
function drawBoard(teams, pos, showRatings, showSummary) {
  const W = 760;
  // Pin positions are a percentage of the pitch, so the pitch keeps its height and
  // the summary strip extends the canvas below it.
  const H = 1118;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H + (showSummary ? SUMMARY_H : 0);
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
  return c;
}

export function exportBoard(teams, pos, { ratings = true, summary = false } = {}) {
  const canvas = drawBoard(teams, pos, ratings, summary);
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
