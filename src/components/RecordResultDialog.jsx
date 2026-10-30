import { useState } from 'react';
import { Button, Dialog, Icon, IconButton, Input, Switch } from '../ds/index.js';
import { shortName } from '../lib/names.js';
import { BLUE_LABEL, RED_LABEL, formatDate } from '../lib/whatsapp.js';

function ScoreBox({ label, aria, color, value, onChange, showLabel = true }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Kept in the layout when hidden so every row's inputs line up. */}
      <span
        aria-hidden={!showLabel}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-bold)',
          letterSpacing: 'var(--tracking-wide)',
          color,
          visibility: showLabel ? 'visible' : 'hidden',
        }}
      >
        {label}
      </span>
      <input
        className="tb-scoreinput"
        type="number"
        min="0"
        max="99"
        inputMode="numeric"
        aria-label={aria || label + ' score'}
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Math.max(0, Math.min(99, Number(e.target.value))))}
      />
    </div>
  );
}

export default function RecordResultDialog({ teams, teamSize, match, weeks, existing, lockedBy = () => null, onSave, onClose }) {
  const [date, setDate] = useState(existing ? existing.date : match.date);
  const [played, setPlayed] = useState(existing ? existing.match.played : true);
  const [venue, setVenue] = useState(existing ? existing.venue || '' : match.venue || '');
  // A session is usually several games with the same two sides, so the scores are a
  // list. Editing is always one match — that is the thing you opened.
  const [rows, setRows] = useState(() => [
    {
      red: existing && existing.match.redScore != null ? existing.match.redScore : '',
      blue: existing && existing.match.blueScore != null ? existing.match.blueScore : '',
    },
  ]);

  const sides = existing
    ? { red: existing.match.red, blue: existing.match.blue }
    : {
        red: teams.red.map((p) => ({ id: p.id, name: p.name })),
        blue: teams.blue.map((p) => ({ id: p.id, name: p.name })),
      };

  // Which match of that week's session this is — a Friday can hold several.
  const week = weeks.find((w) => w.date === date);
  const already = week ? week.matches.filter((m) => !existing || m.id !== existing.match.id).length : 0;
  const count = existing || !played ? 1 : rows.length;
  // Every match is played to a winner, so a level score is not a result. Blank scores are
  // still allowed — a match can be logged before the score is known.
  const level = played && rows.some((r) => r.red !== '' && r.blue !== '' && Number(r.red) === Number(r.blue));
  const setRow = (i, patch) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  function save() {
    const matches =
      played && !existing
        ? rows.map((r) => ({
            played: true,
            redScore: r.red !== '' ? Number(r.red) : null,
            blueScore: r.blue !== '' ? Number(r.blue) : null,
            red: sides.red,
            blue: sides.blue,
          }))
        : [
            {
              id: existing ? existing.match.id : undefined,
              played,
              redScore: played && rows[0].red !== '' ? Number(rows[0].red) : null,
              blueScore: played && rows[0].blue !== '' ? Number(rows[0].blue) : null,
              red: sides.red,
              blue: sides.blue,
            },
          ];
    onSave({ isNew: !existing, date, venue: venue.trim(), teamSize: existing ? existing.teamSize : teamSize, matches });
  }

  const note = existing
    ? formatDate(date) + ' · editing match ' + (already + 1 > 1 ? 'in' : 'of') + ' this session'
    : formatDate(date) +
      ' · ' +
      (count === 1
        ? already
          ? 'match ' + (already + 1) + ' of this session'
          : 'first match of this session'
        : 'matches ' + (already + 1) + '–' + (already + count) + ' of this session');

  return (
    <Dialog
      open
      title={existing ? 'Edit match' : count > 1 ? 'Record ' + count + ' matches' : 'Record match'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save} disabled={!date || level || !!lockedBy(date)}>
            {count > 1 ? 'Save ' + count + ' matches' : 'Save'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <Input
            label="Date played"
            type="date"
            style={{ flex: 1, minWidth: 0 }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            label="Pitch"
            placeholder="optional"
            style={{ flex: 1, minWidth: 0 }}
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          />
        </div>
        {date && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            {note}
          </div>
        )}
        {date && lockedBy(date) && (
          <div className="tb-sync-warn">
            {lockedBy(date).name} is complete, so nothing can be recorded on this date. Pick another date, or reopen the season on
            the Honours page.
          </div>
        )}

        <Switch
          checked={played}
          onChange={(e) => setPlayed(e.target.checked)}
          label={existing || count === 1 ? 'Match was played' : 'Matches were played'}
          style={{ fontSize: 'var(--text-sm)' }}
        />

        {played ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((r, i) => (
              <div key={i} className="tb-scorerow">
                {!existing && rows.length > 1 && <span className="tb-scorerow-n">{already + i + 1}</span>}
                <ScoreBox
                  label="RED"
                  aria={rows.length > 1 ? 'RED score, match ' + (already + i + 1) : 'RED score'}
                  showLabel={i === 0}
                  color="var(--team-red)"
                  value={r.red}
                  onChange={(v) => setRow(i, { red: v })}
                />
                <span
                  aria-hidden="true"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-tertiary)', paddingBottom: 10 }}
                >
                  –
                </span>
                <ScoreBox
                  label="BLUE"
                  aria={rows.length > 1 ? 'BLUE score, match ' + (already + i + 1) : 'BLUE score'}
                  showLabel={i === 0}
                  color="var(--team-blue)"
                  value={r.blue}
                  onChange={(v) => setRow(i, { blue: v })}
                />
                {!existing && rows.length > 1 && (
                  <IconButton
                    icon={<Icon name="trash-2" size={14} />}
                    aria-label={'Remove match ' + (already + i + 1)}
                    variant="ghost"
                    size="sm"
                    style={{ alignSelf: 'flex-end', marginBottom: 4 }}
                    onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                  />
                )}
              </div>
            ))}
            {level && (
              <div
                role="alert"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-warning-strong)',
                  background: 'var(--color-warning-subtle)',
                  border: '1px solid var(--amber-400)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '7px 10px',
                }}
              >
                Scores can\u2019t be level — every match is played to a winner.
              </div>
            )}
            {!existing && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Icon name="plus" size={15} />}
                style={{ alignSelf: 'flex-start' }}
                onClick={() => setRows((rs) => [...rs, { red: '', blue: '' }])}
              >
                Add another match
              </Button>
            )}
          </div>
        ) : (
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-warning-strong)',
              background: 'var(--color-warning-subtle)',
              border: '1px solid var(--amber-400)',
              borderRadius: 'var(--radius-sm)',
              padding: '7px 10px',
            }}
          >
            Logged as called off — the teams are kept, without a score.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)', color: 'var(--color-text-tertiary)' }}>
            {count > 1 ? 'The same two sides for all ' + count + ' matches.' : 'The sides as drafted.'}
          </div>
          {[
            [RED_LABEL, sides.red],
            [BLUE_LABEL, sides.blue],
          ].map(([label, list]) => (
            <div key={label}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                {label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-tertiary)',
                  lineHeight: 'var(--leading-normal)',
                }}
              >
                {list.map((p) => shortName(p.name)).join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
