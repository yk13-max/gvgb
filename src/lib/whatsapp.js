import { balanceScore, overall, ovrAvg } from './model.js';

// Clock faces run 12:00, 12:30, 1:00, 1:30 … so the index is hour*2 plus a half.
const CLOCKS = [
  '🕛', '🕧', '🕐', '🕜', '🕑', '🕝', '🕒', '🕞', '🕓', '🕟', '🕔', '🕠',
  '🕕', '🕡', '🕖', '🕢', '🕗', '🕣', '🕘', '🕤', '🕙', '🕥', '🕚', '🕦',
];

function parts(time) {
  const m = /^(\d{1,2}):(\d{2})/.exec(time || '');
  if (!m) return null;
  return { h: Number(m[1]), min: Number(m[2]) };
}

export function clockEmoji(time) {
  const t = parts(time);
  if (!t) return '🕐';
  // Nearest half hour: 7:45 reads as eight o'clock.
  let half = Math.round(t.min / 30);
  let h = t.h;
  if (half === 2) {
    h += 1;
    half = 0;
  }
  return CLOCKS[((h % 12) * 2 + half) % 24];
}

// 19:30 -> 7.30pm, 19:00 -> 7pm
export function formatTime(time) {
  const t = parts(time);
  if (!t) return '';
  const suffix = t.h >= 12 ? 'pm' : 'am';
  const h12 = t.h % 12 === 0 ? 12 : t.h % 12;
  return t.min === 0 ? h12 + suffix : h12 + '.' + String(t.min).padStart(2, '0') + suffix;
}

// 2026-08-07 -> Fri 07/08/26
export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '';
  // Built from the parts rather than Date.parse so the day never shifts by timezone.
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const day = d.toLocaleDateString('en-GB', { weekday: 'short' });
  return day + ' ' + m[3] + '/' + m[2] + '/' + m[1].slice(2);
}

export const RED_LABEL = '🔴 Team Red/White ⚪';
export const BLUE_LABEL = '🔵 Team Blue/Black ⚫';

// WhatsApp-ready text: a details line, then one comma-separated line of names per
// team. Ratings are left out unless asked for — the chat is the whole group.
export function whatsappText(teams, match, showScores) {
  const L = [];
  const head = [];
  const m = match || {};
  if (m.date) head.push('📅 ' + formatDate(m.date));
  if (m.time) head.push(clockEmoji(m.time) + ' ' + formatTime(m.time));
  if (m.venue && m.venue.trim()) head.push('⚽ ' + m.venue.trim());
  if (head.length) {
    L.push(head.join(' | '));
    L.push('');
  }

  const side = (list, label) => {
    L.push(label);
    L.push(list.map((p) => p.name.trim() + (showScores ? ' ' + overall(p) : '')).join(', '));
  };

  side(teams.red, RED_LABEL);
  L.push('');
  side(teams.blue, BLUE_LABEL);

  if (showScores && teams.red.length && teams.blue.length) {
    L.push('');
    L.push(
      'Red avg ' +
        ovrAvg(teams.red).toFixed(1) +
        ' · Blue avg ' +
        ovrAvg(teams.blue).toFixed(1) +
        ' · Balance ' +
        balanceScore(teams.red, teams.blue) +
        '/100'
    );
  }

  return L.join('\n');
}
