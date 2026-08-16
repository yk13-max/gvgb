import { useMemo, useState } from 'react';
import { Button, Icon, IconButton } from '../ds/index.js';
import { ABBR, SHORT } from '../lib/model.js';
import { shortName } from '../lib/names.js';
import { AWARDS, outcome, ratingDiff, tally, weekPlayerIds } from '../lib/weeks.js';
import { formatDate } from '../lib/whatsapp.js';

function Stat({ label, value, color }) {
  return (
    <div style={{ minWidth: 68 }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--weight-bold)',
          lineHeight: 1.1,
          color: color || 'var(--color-text-primary)',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-2xs)',
          letterSpacing: 'var(--tracking-wide)',
          textTransform: 'uppercase',
          color: 'var(--color-text-tertiary)',
        }}
      >
        {label}
      </div>
    </div>
  );
}

// What each player was rated that week, and how that compares with now.
function RatingsPanel({ week, players }) {
  const rows = Object.keys(week.ratings).map((id) => {
    const snap = week.ratings[id];
    const current = players.find((p) => p.id === Number(id));
    return { id: Number(id), snap, current, ...ratingDiff(snap, current) };
  });
  if (!rows.length) {
    return <div className="tb-ratempty">No ratings were snapshotted for this week.</div>;
  }
  rows.sort((a, b) => b.snap.ovr - a.snap.ovr);
  const changedCount = rows.filter((r) => r.changed.length).length;

  return (
    <div className="tb-ratpanel">
      <div className="tb-ratnote">
        Ratings as they stood on the day.{' '}
        {changedCount
          ? changedCount + ' player' + (changedCount === 1 ? ' has' : 's have') + ' been re-rated since.'
          : 'Nothing has been re-rated since.'}
      </div>
      {rows.map((r) => {
        const gone = r.ovrNow == null;
        const delta = gone ? 0 : r.ovrNow - r.snap.ovr;
        const posMoved = !gone && r.current.pos !== r.snap.pos;
        // Only a row that actually moved earns the before/after treatment; the rest
        // read as a plain list of what they were rated.
        const moved = !gone && (delta !== 0 || r.changed.length > 0 || posMoved);
        return (
          <div key={r.id} className="tb-ratrow" data-moved={moved ? '1' : '0'}>
            <span className="tb-ratname">{shortName(r.snap.name)}</span>
            <span className="tb-ratovr">{r.snap.ovr}</span>
            {gone && <span className="tb-ratgone">no longer on the roster</span>}
            {moved && (
              <>
                <Icon name="chevron-right" size={13} />
                <span className="tb-ratovr">{r.ovrNow}</span>
                {delta !== 0 && (
                  <span className="tb-ratdelta" data-dir={delta > 0 ? 'up' : 'down'}>
                    {delta > 0 ? '+' + delta : delta}
                  </span>
                )}
                <span className="tb-ratchanges">
                  {[
                    ...(posMoved ? [SHORT[r.snap.pos] + '→' + SHORT[r.current.pos]] : []),
                    ...r.changed.map((c) => ABBR[c.k] + ' ' + c.was + '→' + c.now),
                  ].join(' · ')}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WeekCard({ week, players, onAwards, onEditMatch, onDeleteMatch, onDeleteWeek }) {
  const [open, setOpen] = useState(false);
  const t = tally([week]);
  const named = weekPlayerIds(week);
  const nameOf = (id) => {
    const p = named.find((x) => x.id === id);
    return p ? shortName(p.name) : week.ratings[id] ? shortName(week.ratings[id].name) : '—';
  };
  const anyAward = AWARDS.some(([k]) => week.awards && week.awards[k] != null);

  return (
    <div className="tb-week">
      <div className="tb-weekhead">
        <div>
          <div className="tb-weekdate">{formatDate(week.date)}</div>
          <div className="tb-weeksub">
            {week.matches.length} match{week.matches.length === 1 ? '' : 'es'} · {week.teamSize}-a-side ·{' '}
            {named.length} players{week.venue ? ' · ' + week.venue : ''}
            {t.played > 0 && ' · ' + t.goalsRed + '–' + t.goalsBlue}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="trophy" size={15} />}
            onClick={() => onAwards(week)}
          >
            {anyAward ? 'Nominations' : 'Nominate'}
          </Button>
          <IconButton
            icon={<Icon name={open ? 'chevron-up' : 'chevron-down'} size={15} />}
            aria-label={(open ? 'Hide' : 'Show') + ' ratings for ' + formatDate(week.date)}
            aria-expanded={open}
            variant="ghost"
            size="sm"
            onClick={() => setOpen((v) => !v)}
          />
          <IconButton
            icon={<Icon name="trash-2" size={14} />}
            aria-label={'Delete week ' + formatDate(week.date)}
            variant="ghost"
            size="sm"
            onClick={() => onDeleteWeek(week.id)}
          />
        </div>
      </div>

      {anyAward && (
        <div className="tb-awards">
          {AWARDS.filter(([k]) => week.awards[k] != null).map(([k, label]) => (
            <span key={k} className="tb-award" data-potm={k === 'potm' ? '1' : '0'}>
              <span className="tb-award-label">{label}</span>
              <span className="tb-award-name">{nameOf(week.awards[k])}</span>
            </span>
          ))}
        </div>
      )}

      <div className="tb-weekmatches">
        {week.matches.map((m, i) => {
          const o = outcome(m);
          return (
            <div key={m.id} className="tb-histrow" data-outcome={o}>
              <div className="tb-histdate">
                <div className="tb-histdate-main">Match {i + 1}</div>
                <div className="tb-histdate-sub">
                  {o === 'red' ? 'Red win' : o === 'blue' ? 'Blue win' : o === 'draw' ? 'Draw' : ''}
                </div>
              </div>
              <div className="tb-histscore">
                {o === 'off' ? (
                  <span className="tb-histoff">Called off</span>
                ) : o === 'noscore' ? (
                  <span className="tb-histoff">No score</span>
                ) : (
                  <>
                    <span style={{ color: 'var(--team-red)', fontWeight: o === 'red' ? 'var(--weight-bold)' : 'var(--weight-regular)' }}>
                      {m.redScore}
                    </span>
                    <span style={{ color: 'var(--color-text-tertiary)' }}>–</span>
                    <span style={{ color: 'var(--team-blue)', fontWeight: o === 'blue' ? 'var(--weight-bold)' : 'var(--weight-regular)' }}>
                      {m.blueScore}
                    </span>
                  </>
                )}
              </div>
              <div className="tb-histteams">
                <div>
                  <span className="tb-histteam-label" style={{ color: 'var(--team-red)' }}>
                    RED
                  </span>{' '}
                  {m.red.map((p) => shortName(p.name)).join(', ')}
                </div>
                <div>
                  <span className="tb-histteam-label" style={{ color: 'var(--team-blue)' }}>
                    BLUE
                  </span>{' '}
                  {m.blue.map((p) => shortName(p.name)).join(', ')}
                </div>
              </div>
              <div className="tb-histacts">
                <IconButton
                  icon={<Icon name="pencil" size={14} />}
                  aria-label={'Edit match ' + (i + 1) + ' on ' + formatDate(week.date)}
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditMatch(week, m)}
                />
                <IconButton
                  icon={<Icon name="trash-2" size={14} />}
                  aria-label={'Delete match ' + (i + 1) + ' on ' + formatDate(week.date)}
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteMatch(week.id, m.id)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {open && <RatingsPanel week={week} players={players} />}
    </div>
  );
}

export default function History({ weeks, players, onAwards, onEditMatch, onDeleteMatch, onDeleteWeek }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // ISO dates compare correctly as strings, so the range needs no parsing.
  const rows = useMemo(
    () => weeks.filter((w) => (!from || w.date >= from) && (!to || w.date <= to)),
    [weeks, from, to]
  );
  const t = useMemo(() => tally(rows), [rows]);
  const filtered = !!(from || to);

  return (
    <div className="tb-histpage">
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
            Match history
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: filtered ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              marginTop: 2,
            }}
          >
            {filtered ? rows.length + '/' + weeks.length + ' weeks shown' : weeks.length + ' weeks recorded'}
          </div>
        </div>
        <div className="tb-daterange">
          <label>
            <span>From</span>
            <input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            <span>To</span>
            <input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="filter-x" size={15} />}
            disabled={!filtered}
            onClick={() => {
              setFrom('');
              setTo('');
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="tb-histsummary">
          <Stat label="Weeks" value={t.weeks} />
          <Stat label="Played" value={t.played} />
          <Stat label="Red wins" value={t.red} color="var(--team-red)" />
          <Stat label="Blue wins" value={t.blue} color="var(--team-blue)" />
          <Stat label="Draws" value={t.draw} />
          <Stat label="Goals R–B" value={t.goalsRed + '–' + t.goalsBlue} />
          {t.off > 0 && <Stat label="Called off" value={t.off} />}
        </div>
      )}

      <div className="tb-histlist">
        {rows.map((w) => (
          <WeekCard
            key={w.id}
            week={w}
            players={players}
            onAwards={onAwards}
            onEditMatch={onEditMatch}
            onDeleteMatch={onDeleteMatch}
            onDeleteWeek={onDeleteWeek}
          />
        ))}

        {!rows.length && (
          <div className="tb-histempty">
            {weeks.length
              ? 'No weeks in that date range.'
              : 'Nothing recorded yet. Balance a squad, then use Record result on the Balancer to log the score.'}
          </div>
        )}
      </div>
    </div>
  );
}
