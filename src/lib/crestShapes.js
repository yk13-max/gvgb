// The drawn fallback badge, as plain shapes on a 24×28 shield. One description serves
// both the SVG badge in the app and the canvas drawing in the exported team sheet, so
// the two can never drift apart.

export const SHIELD = 'M12 1.5 L21.5 4.5 V13 C21.5 19.5 17 24.5 12 26.5 C7 24.5 2.5 19.5 2.5 13 V4.5 Z';

const R = (x, y, w, h, fill) => ({ kind: 'rect', x, y, w, h, fill });
const POLY = (points, fill) => ({ kind: 'poly', points, fill });

export function crestShapes({ a, b, c, pattern }) {
  const third = c || a;
  const ground = R(0, 0, 24, 28, a);
  switch (pattern) {
    // Flag shapes, for national sides.
    case 'tricolour':
      return [R(0, 0, 8, 28, a), R(8, 0, 8, 28, b), R(16, 0, 8, 28, third)];
    case 'bands':
      return [R(0, 0, 24, 10, a), R(0, 10, 24, 8, b), R(0, 18, 24, 10, third)];
    case 'hhalves':
      return [R(0, 0, 24, 14, a), R(0, 14, 24, 14, b)];
    case 'cross':
      return [ground, R(9.5, 0, 5, 28, b), R(0, 11, 24, 5, b)];
    case 'nordic':
      return c
        ? [ground, R(5, 0, 7, 28, b), R(0, 10, 24, 7, b), R(6.5, 0, 4, 28, c), R(0, 11.5, 24, 4, c)]
        : [ground, R(6, 0, 5, 28, b), R(0, 11, 24, 5, b)];
    case 'saltire':
      return [ground, POLY([0, 0, 4, 0, 24, 24, 24, 28, 20, 28, 0, 4], b), POLY([24, 0, 20, 0, 0, 24, 0, 28, 4, 28, 24, 4], b)];
    // Kit shapes, for clubs.
    case 'stripes':
      return [ground, R(6, 0, 4, 28, b), R(14, 0, 4, 28, b)];
    case 'hoops':
      return [ground, R(0, 7, 24, 4.5, b), R(0, 16, 24, 4.5, b)];
    case 'halves':
      return [ground, R(12, 0, 12, 28, b)];
    case 'sash':
      return [ground, POLY([2, 2, 9, 0, 24, 18, 24, 27], b)];
    case 'quarters':
      return [ground, R(12, 0, 12, 14, b), R(0, 14, 12, 14, b)];
    default:
      // Solid: the first colour, with the second as a band across the top.
      return [ground, R(0, 0, 24, 6, b)];
  }
}

// Draws the shield onto a canvas with its top-left at (x, y), `w` wide.
export function drawCrestShield(g, club, x, y, w) {
  const k = w / 24;
  const path = new Path2D(SHIELD);
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  g.save();
  g.clip(path);
  crestShapes(club).forEach((s) => {
    g.fillStyle = s.fill;
    if (s.kind === 'rect') g.fillRect(s.x, s.y, s.w, s.h);
    else {
      g.beginPath();
      for (let i = 0; i < s.points.length; i += 2) (i ? g.lineTo : g.moveTo).call(g, s.points[i], s.points[i + 1]);
      g.closePath();
      g.fill();
    }
  });
  g.restore();
  g.lineWidth = 1.4;
  g.strokeStyle = 'rgba(0,0,0,0.45)';
  g.stroke(path);
  g.lineWidth = 0.6;
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.stroke(path);
  g.restore();
}
