import { useMemo, useState } from 'react';
import { Button, Icon, IconButton } from '../ds/index.js';
import { shortName } from '../lib/names.js';
import { formatDate } from '../lib/whatsapp.js';

function outcome(m) {
  if (!m.played) return 'off';
  if (m.redScore == null || m.blueScore == null) return 'noscore';
  if (m.redScore > m.blueScore) return 'red';
  if (m.blueScore > m.redScore) return 'blue';
  return 'draw';
}

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

export default function History({ history, onEdit, onDelete }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // ISO dates compare correctly as strings, so the range needs no parsing.
  const rows = useMemo(
    () =>
      history
        .filter((m) => (!from || m.date >= from) && (!to || m.date <= to))
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id)),
    [history, from, to]
  );

  const summary = useMemo(() => {
    const s = { played: 0, off: 0, red: 0, blue: 0, draw: 0, goalsRed: 0, goalsBlue: 0 };
    rows.forEach((m) => {
      const o = outcome(m);
      if (o === 'off') {
        s.off += 1;
        return;
      }
      s.played += 1;
      if (o === 'red' || o === 'blue' || o === 'draw') {
        s[o] += 1;
        s.goalsRed += m.redScore;
        s.goalsBlue += m.blueScore;
      }
    });
    return s;
  }, [rows]);

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
            {filtered ? rows.length + '/' + history.length + ' shown' : history.length + ' recorded'}
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
          <Stat label="Played" value={summary.played} />
          <Stat label="Red wins" value={summary.red} color="var(--team-red)" />
          <Stat label="Blue wins" value={summary.blue} color="var(--team-blue)" />
          <Stat label="Draws" value={summary.draw} />
          <Stat label="Goals R–B" value={summary.goalsRed + '–' + summary.goalsBlue} />
          {summary.off > 0 && <Stat label="Called off" value={summary.off} />}
        </div>
      )}

      <div className="tb-histlist">
        {rows.map((m) => {
          const o = outcome(m);
          return (
            <div key={m.id} className="tb-histrow" data-outcome={o}>
              <div className="tb-histdate">
                <div className="tb-histdate-main">{formatDate(m.date)}</div>
                <div className="tb-histdate-sub">
                  {m.teamSize}-a-side{m.venue ? ' · ' + m.venue : ''}
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
                  aria-label={'Edit result for ' + formatDate(m.date)}
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(m)}
                />
                <IconButton
                  icon={<Icon name="trash-2" size={14} />}
                  aria-label={'Delete result for ' + formatDate(m.date)}
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(m.id)}
                />
              </div>
            </div>
          );
        })}

        {!rows.length && (
          <div className="tb-histempty">
            {history.length
              ? 'No matches in that date range.'
              : 'Nothing recorded yet. Balance a squad, then use Record result on the Balancer to log the score.'}
          </div>
        )}
      </div>
    </div>
  );
}
