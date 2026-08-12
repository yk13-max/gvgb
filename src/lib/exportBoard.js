import { overall } from './model.js';
import { initials, shortName } from './names.js';

// Board -> PNG, drawn directly so the export matches what's on screen.
function drawBoard(teams, pos, showRatings) {
  const W = 760;
  const H = 1118;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
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
  const cols = { red: '#c2402c', blue: '#2f66cf' };
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
  return c;
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportBoard(teams, pos, showRatings = true) {
  const canvas = drawBoard(teams, pos, showRatings);
  const filename = 'fufa-teams.png';
  canvas.toBlob((blob) => {
    if (!blob) return;
    const file = new File([blob], filename, { type: 'image/png' });
    // On phones a download is often a dead end — hand the image to the share sheet
    // (WhatsApp, Photos) when the browser supports it, and fall back to a download.
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'FUFA teams' }).catch(() => download(blob, filename));
    } else {
      download(blob, filename);
    }
  }, 'image/png');
}
