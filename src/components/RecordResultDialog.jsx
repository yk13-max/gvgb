import { useState } from 'react';
import { Button, Dialog, Input, Switch } from '../ds/index.js';
import { shortName } from '../lib/names.js';
import { BLUE_LABEL, RED_LABEL, formatDate } from '../lib/whatsapp.js';

function ScoreBox({ label, color, value, onChange }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-bold)',
          letterSpacing: 'var(--tracking-wide)',
          color,
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
        aria-label={label + ' score'}
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Math.max(0, Math.min(99, Number(e.target.value))))}
      />
    </div>
  );
}

export default function RecordResultDialog({ teams, teamSize, match, existing, onSave, onClose }) {
  const [date, setDate] = useState(existing ? existing.date : match.date);
  const [played, setPlayed] = useState(existing ? existing.played : true);
  const [red, setRed] = useState(existing && existing.redScore != null ? existing.redScore : '');
  const [blue, setBlue] = useState(existing && existing.blueScore != null ? existing.blueScore : '');
  const [venue, setVenue] = useState(existing ? existing.venue || '' : match.venue || '');

  const sides = existing
    ? { red: existing.red, blue: existing.blue }
    : {
        red: teams.red.map((p) => ({ id: p.id, name: p.name })),
        blue: teams.blue.map((p) => ({ id: p.id, name: p.name })),
      };

  function save() {
    onSave({
      id: existing ? existing.id : Date.now(),
      date,
      played,
      venue: venue.trim(),
      teamSize: existing ? existing.teamSize : teamSize,
      redScore: played && red !== '' ? Number(red) : null,
      blueScore: played && blue !== '' ? Number(blue) : null,
      red: sides.red,
      blue: sides.blue,
    });
  }

  return (
    <Dialog
      open
      title={existing ? 'Edit result' : 'Record result'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save} disabled={!date}>
            Save
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
            {formatDate(date)}
          </div>
        )}

        <Switch
          checked={played}
          onChange={(e) => setPlayed(e.target.checked)}
          label="Match was played"
          style={{ fontSize: 'var(--text-sm)' }}
        />

        {played ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <ScoreBox label="RED" color="var(--team-red)" value={red} onChange={setRed} />
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-tertiary)', paddingBottom: 10 }}>–</span>
            <ScoreBox label="BLUE" color="var(--team-blue)" value={blue} onChange={setBlue} />
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
