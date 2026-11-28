// Draws talking points onto a canvas: a coloured tag, the fact wrapped underneath, and
// for the upset meter a row of pips. Measuring and drawing share one layout so the
// canvas is exactly as tall as what goes on it.

const TONES = { gold: '#e8b73a', green: '#4fb26b', violet: '#a78bfa', blue: '#5b8ee8', red: '#e0644d' };

function wrap(g, text, width) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach((w) => {
    const next = line ? line + ' ' + w : w;
    if (line && g.measureText(next).width > width) {
      lines.push(line);
      line = w;
    } else line = next;
  });
  if (line) lines.push(line);
  return lines;
}

// `s` scales every size, so the 390pt results card and the 760px team sheet share it.
export function layoutFacts(g, facts, width, s, font) {
  g.font = '500 ' + 15 * s + 'px ' + font;
  return facts.map((f) => {
    const lines = wrap(g, f.text, width);
    const h = 18 * s + lines.length * 21 * s + 12 * s;
    return { f, lines, h };
  });
}

export function factsHeight(layout) {
  return layout.reduce((sum, r) => sum + r.h, 0);
}

export function drawFacts(g, layout, x, y, width, s, font) {
  layout.forEach(({ f, lines, h }) => {
    const tone = TONES[f.tone] || TONES.blue;
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    // the rule down the left, in the category's colour
    g.fillStyle = tone;
    g.fillRect(x, y + 2 * s, 3 * s, h - 12 * s);
    g.font = '700 ' + 10 * s + 'px ' + font;
    g.fillStyle = tone;
    const tag = f.tag.toUpperCase();
    g.fillText(tag, x + 12 * s, y + 12 * s);
    if (f.meter != null) {
      // the upset meter: three pips after the tag, lit by how big a surprise it was
      const start = x + 12 * s + g.measureText(tag).width + 8 * s;
      for (let i = 0; i < 3; i++) {
        g.fillStyle = i < f.meter ? tone : 'rgba(255,255,255,0.18)';
        g.fillRect(start + i * 12 * s, y + 5 * s, 9 * s, 7 * s);
      }
    }
    g.font = '500 ' + 15 * s + 'px ' + font;
    g.fillStyle = '#ffffff';
    lines.forEach((line, i) => g.fillText(line, x + 12 * s, y + 18 * s + 15 * s + i * 21 * s));
    y += h;
  });
  return y;
}
