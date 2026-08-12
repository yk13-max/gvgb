import { SHORT, balanceScore, overall, ovrAvg, ovrTotal } from './model.js';

// WhatsApp-ready text: narrow lines, * for bold, no tables — reads cleanly on a phone.
export function whatsappText(teams, teamSize) {
  const L = [];
  const line = (t, label) => {
    L.push('*' + label + '*  ·  avg ' + ovrAvg(t).toFixed(1) + '  ·  total ' + ovrTotal(t));
    t.slice()
      .sort((a, b) => overall(b) - overall(a))
      .forEach((p) => {
        L.push(p.name.trim().split(' ')[0] + ' — ' + SHORT[p.pos] + ' ' + overall(p));
      });
  };
  L.push('*' + teamSize + '-a-side teams*');
  L.push('');
  line(teams.red, 'RED');
  L.push('');
  line(teams.blue, 'BLUE');
  L.push('');
  L.push(
    'Balance ' +
      balanceScore(teams.red, teams.blue) +
      '/100  (Δ' +
      Math.abs(ovrAvg(teams.red) - ovrAvg(teams.blue)).toFixed(1) +
      ' avg)'
  );
  return L.join('\n');
}
