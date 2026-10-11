import { useMemo, useState } from 'react';
import { Icon } from '../ds/index.js';
import { shortName } from '../lib/names.js';
import { standings } from '../lib/standings.js';
import { formatDate } from '../lib/whatsapp.js';

const COLS = [
  ['attacker', 'ATT', 'Best attacker'],
  ['midfielder', 'MID', 'Best midfielder'],
  ['defender', 'DEF', 'Best defender'],
  ['potm', 'POTM', 'Overall POTM'],
];

// What the season adds up to for one player, shown under their row.
function Detail({ r }) {
  const nights = r.played.length;
  const games = r.won + r.drawn + r.lost;
  return (
    <div className="tb-league-detail">
      <div className="tb-league-detail-head">
        {nights === 0
          ? 'Not played yet.'
          : 'Played ' +
            nights +
            ' night' +
            (nights === 1 ? '' : 's') +
            (games ? ' · ' + games + ' match' + (games === 1 ? '' : 'es') + ': ' + r.won + ' won, ' + r.drawn + ' drawn, ' + r.lost + ' lost' : '') +
            (r.total ? ' · ' + r.total + ' award' + (r.total === 1 ? '' : 's') : ' · no awards yet')}
      </div>
      {nights > 0 && (
        <div className="tb-league-nights">
          {r.played.map((date) => {
            const won = r.wins.filter((w) => w.date === date);
            return (
              <span key={date} className="tb-league-night" data-won={won.length ? '1' : '0'}>
                <span>{formatDate(date)}</span>
                {won.map((w) => (
                  <span key={w.award} className="tb-league-chip" data-potm={w.award === 'potm' ? '1' : '0'}>
                    {w.award === 'potm' ? 'POTM' : w.label.replace('Best ', '')}
                  </span>
                ))}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Standings({ weeks, players }) {
  const rows = useMemo(() => standings(weeks, players), [weeks, players]);
  const [open, setOpen] = useState(null);
  const anyAward = rows.some((r) => r.total > 0);

  // Ranks share a number when the totals that decide them tie.
  let rank = 0;
  let prev = null;
  const ranked = rows.map((r, i) => {
    const key = r.total + ':' + r.potm;
    if (key !== prev) {
      rank = i + 1;
      prev = key;
    }
    return { ...r, rank };
  });

  return (
    <div className="tb-page-stats">
      <div className="tb-tblbar">
        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--weight-semibold)',
              fontSize: 'var(--text-xl)',
              color: 'var(--color-text-primary)',
              lineHeight: 1.1,
            }}
          >
            Awards table
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              marginTop: 2,
            }}
          >
            {weeks.length} week{weeks.length === 1 ? '' : 's'} · tap a player for the nights they played
          </div>
        </div>
      </div>

      <div className="tb-tblwrap">
        <table className="tb-league">
          <thead>
            <tr>
              <th className="tb-league-rank">#</th>
              <th className="tb-league-name">Player</th>
              {COLS.map(([k, abbr, full]) => (
                <th key={k} className="tb-league-n" title={full} data-potm={k === 'potm' ? '1' : '0'}>
                  {abbr}
                </th>
              ))}
              <th className="tb-league-n tb-league-total">Total</th>
              <th className="tb-league-n">Played</th>
              <th className="tb-league-n tb-league-rec" title="Matches won – drawn – lost">
                W–D–L
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r) => {
              const isOpen = open === r.id;
              return [
                <tr
                  key={r.id}
                  className="tb-league-row"
                  data-open={isOpen ? '1' : '0'}
                  data-zero={r.total === 0 ? '1' : '0'}
                  tabIndex={0}
                  role="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : r.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOpen(isOpen ? null : r.id);
                    }
                  }}
                >
                  <td className="tb-league-rank">{r.rank}</td>
                  <td className="tb-league-name">
                    <span className="tb-league-rankinline">{r.rank}</span>
                    <span className="tb-league-full">{r.name}</span>
                    <span className="tb-league-short">{shortName(r.name)}</span>
                    <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={13} />
                  </td>
                  {COLS.map(([k]) => (
                    <td key={k} className="tb-league-n" data-potm={k === 'potm' ? '1' : '0'} data-zero={r[k] === 0 ? '1' : '0'}>
                      {r[k]}
                    </td>
                  ))}
                  <td className="tb-league-n tb-league-total">{r.total}</td>
                  <td className="tb-league-n" data-zero={r.played.length === 0 ? '1' : '0'}>
                    {r.played.length}
                  </td>
                  <td className="tb-league-n tb-league-rec" data-zero={r.won + r.drawn + r.lost === 0 ? '1' : '0'}>
                    {r.won}–{r.drawn}–{r.lost}
                  </td>
                </tr>,
                isOpen && (
                  <tr key={r.id + '-d'} className="tb-league-detailrow">
                    <td colSpan={COLS.length + 5}>
                      <Detail r={r} />
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
        {!anyAward && (
          <div className="tb-histempty" style={{ margin: 12 }}>
            {weeks.length
              ? 'No nominations saved yet. Open a week in History and use Nominate.'
              : 'Nothing to count yet. Record a result, then nominate the night’s best.'}
          </div>
        )}
      </div>
    </div>
  );
}
