// Supporter badges for the exported images: the real crest when it can be drawn on a
// canvas, the drawn shield when not, always on a light disc so a dark badge still reads
// on the images' dark background.
import { clubOf } from './clubs.js';
import { drawCrestShield } from './crestShapes.js';
import { ensureLogos, knownLogo } from './logos.js';

// Real badges for the image, loaded so the canvas can use them: CORS-enabled, so a badge
// that cannot be shared simply fails to load and the drawn shield stands in. A canvas is
// never tainted, so the export always goes through.
function loadImage(url, ms = 2500) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    const t = setTimeout(() => resolve(null), ms);
    img.onload = () => {
      clearTimeout(t);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(t);
      resolve(null);
    };
    img.src = url;
  });
}

export async function loadBadges(players) {
  const codes = [...new Set(players.map((p) => p.club).filter((c) => clubOf(c)))];
  if (!codes.length) return {};
  await ensureLogos(codes);
  const out = {};
  await Promise.all(
    codes.map(async (code) => {
      const url = knownLogo(code);
      out[code] = url ? await loadImage(url) : null;
    })
  );
  return out;
}

// A badge on the pin's shoulder: the real one when it loaded, the drawn shield if not.
// Either way it sits on a light disc with a dark rim, so a black or navy badge still
// stands out on the dark pitch, and a white one still has an edge.
export function drawBadge(g, code, img, cx, cy, size) {
  const club = clubOf(code);
  if (!club) return;
  g.beginPath();
  g.arc(cx, cy, size * 0.64, 0, Math.PI * 2);
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = 'rgba(10,14,20,0.55)';
  g.stroke();
  if (img) {
    const k = Math.min((size * 0.9) / img.naturalWidth, (size * 0.9) / img.naturalHeight);
    const w = img.naturalWidth * k;
    const h = img.naturalHeight * k;
    g.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  } else {
    const w = size * 0.72;
    drawCrestShield(g, club, cx - w / 2, cy - (w * 28) / 24 / 2, w);
  }
}
