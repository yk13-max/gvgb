import { useMemo, useState } from 'react';
import { Icon } from '../ds/index.js';
import { shortName } from '../lib/names.js';
import { standings } from '../lib/standings.js';
import { formatDate } from '../lib/whatsapp.js';

// Every column after the name, grouped the way the header groups them. `dir` is the
// direction a first click sorts in: numbers biggest-first, since that is the question
// being asked of them.
const GROUPS = [
  {
    label: 'Nominations',
    cols: [
      { key: 'attacker', full: 'ATT', short: 'A', title: 'Best attacker' },
      { key: 'midfielder', full: 'MID', short: 'M', title: 'Best midfielder' },
      { key: 'defender', full: 'DEF', short: 'D', title: 'Best defender' },
      { key: 'potm', full: 'POTM', short: 'POTM', title: 'Overall POTM', potm: true },
      { key: 'total', full: 'Total', short: 'Tot', title: 'Nominations in total', total: true },
    ],
  },
  {
    label: 'Played',
    cols: [
      { key: 'nights', full: 'Nights', short: 'N', title: 'Nights turned out' },
      { key: 'games', full: 'Games', short: 'G', title: 'Matches played' },
    ],
  },
  {
    label: 'Results',
    cols: [
      { key: 'won', full: 'W', short: 'W', title: 'Won' },
      { key: 'lost', full: 'L', short: 'L', title: 'Lost' },
      { key: 'pct', full: 'PCT', short: 'PCT', title: 'Win ratio: wins over wins plus losses', pct: true },
    ],
  },
];
const COLS = GROUPS.flatMap((g) => g.cols);

const valueOf = (r, key) => (key === 'nights' ? r.played.length : key === 'name' ? r.name : r[key]);
const fmt = (key, v) => (key === 'pct' ? (v == null ? '–' : v.toFixed(3)) : v);

// What the season adds up to for one player, shown under their row.
function Detail({ r }) {
  const nights = r.played.length;
  return (
    <div className="tb-league-detail">
      <div className="tb-league-detail-head">
        {nights === 0
          ? 'Not played yet.'
          : 'Played ' +
            nights +
            ' night' +
            (nights === 1 ? '' : 's') +
            (r.games ? ' · ' + r.games + ' match' + (r.games === 1 ? '' : 'es') + ': ' + r.won + ' won, ' + r.lost + ' lost' : '') +
            (r.pct != null ? ' · win ratio ' + r.pct.toFixed(3) : '') +
            (r.total ? ' · ' + r.total + ' nomination' + (r.total === 1 ? '' : 's') : ' · no nominations yet')}
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

function SortHead({ col, sort, onSort, className, children }) {
  const on = sort.key === col.key;
  return (
    <th className={className} title={col.title} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="tb-league-sort" onClick={() => onSort(col.key)}>
        {children}
        {on && <Icon name={sort.dir === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} />}
      </button>
    </th>
  );
}

export default function Standings({ weeks, players, seasonBar, seasonLabel }) {
  const ranked = useMemo(() => {
    // The league order is by win ratio. Ranks share a number when the ratio ties, and
    // the number stays with the player whatever column the table is later sorted by.
    const rows = standings(weeks, players);
    let rank = 0;
    let prev = null;
    return rows.map((r, i) => {
      const key = r.pct == null ? 'none' : r.pct.toFixed(3);
      if (key !== prev) {
        rank = i + 1;
        prev = key;
      }
      return { ...r, rank, order: i };
    });
  }, [weeks, players]);

  const [sort, setSort] = useState({ key: 'rank', dir: 'asc' });
  const [open, setOpen] = useState(null);

  function onSort(key) {
    setSort((s) => {
      if (s.key === key) return { key, dir: s.dir === 'asc' ? 'desc' : 'asc' };
      // First click: names A–Z and rank 1 first; every other number biggest first.
      return { key, dir: key === 'name' || key === 'rank' ? 'asc' : 'desc' };
    });
  }

  const rows = useMemo(() => {
    if (sort.key === 'rank') return sort.dir === 'asc' ? ranked : ranked.slice().reverse();
    const dir = sort.dir === 'asc' ? 1 : -1;
    return ranked.slice().sort((a, b) => {
      const av = valueOf(a, sort.key);
      const bv = valueOf(b, sort.key);
      // No number at all (a win ratio with nothing decided yet) sits at the bottom whichever
      // way the column is sorted; it is not a value, so it is not above or below one.
      if (av == null || bv == null) return av == null && bv == null ? a.order - b.order : av == null ? 1 : -1;
      const d = typeof av === 'string' ? av.localeCompare(bv, undefined, { sensitivity: 'base' }) : av - bv;
      // Ties fall back to the league order, so a column of equals still reads as a table.
      return d * dir || a.order - b.order;
    });
  }, [ranked, sort]);

  const anyAward = ranked.some((r) => r.total > 0);

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
            League table{seasonLabel ? ' · ' + seasonLabel : ''}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              marginTop: 2,
            }}
          >
            {weeks.length} week{weeks.length === 1 ? '' : 's'} · tap a header to sort, a player for their nights
          </div>
        </div>
        {seasonBar}
      </div>

      <div className="tb-tblwrap">
        <table className="tb-league">
          <thead>
            <tr className="tb-league-grouprow">
              <th className="tb-league-rank" />
              <th className="tb-league-name" />
              {GROUPS.map((g) => (
                <th key={g.label} className="tb-league-group" colSpan={g.cols.length} scope="colgroup">
                  {g.label}
                </th>
              ))}
            </tr>
            <tr className="tb-league-colrow">
              <SortHead col={{ key: 'rank', title: 'Position, by win ratio' }} sort={sort} onSort={onSort} className="tb-league-rank">
                #
              </SortHead>
              <SortHead col={{ key: 'name', title: 'Sort by name' }} sort={sort} onSort={onSort} className="tb-league-name">
                Player
              </SortHead>
              {COLS.map((c) => (
                <SortHead
                  key={c.key}
                  col={c}
                  sort={sort}
                  onSort={onSort}
                  className={'tb-league-n' + (c.total ? ' tb-league-total' : '') + (c.potm ? ' tb-league-potm' : '')}
                >
                  <span className="tb-league-hfull">{c.full}</span>
                  <span className="tb-league-hshort">{c.short}</span>
                </SortHead>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
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
                    <span className="tb-league-chev">
                      <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={13} />
                    </span>
                  </td>
                  {COLS.map((c) => {
                    const v = valueOf(r, c.key);
                    return (
                      <td
                        key={c.key}
                        className={'tb-league-n' + (c.total ? ' tb-league-total' : '')}
                        data-potm={c.potm ? '1' : '0'}
                        data-zero={v === 0 || v == null ? '1' : '0'}
                        data-sorted={sort.key === c.key ? '1' : '0'}
                      >
                        {fmt(c.key, v)}
                      </td>
                    );
                  })}
                </tr>,
                isOpen && (
                  <tr key={r.id + '-d'} className="tb-league-detailrow">
                    <td colSpan={COLS.length + 2}>
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
              ? 'No nominations saved yet. Open a week on Results and use Nominate.'
              : 'Nothing to count yet. Record a result, then nominate the night’s best.'}
          </div>
        )}
      </div>
    </div>
  );
}
