import { useState } from 'react';
import { Button, Dialog } from '../ds/index.js';
import { SHORT } from '../lib/model.js';
import { shortName } from '../lib/names.js';
import { AWARDS, EMPTY_AWARDS, weekPlayerIds } from '../lib/weeks.js';
import { formatDate } from '../lib/whatsapp.js';

export default function WeekAwardsDialog({ week, onSave, onClose }) {
  const [awards, setAwards] = useState({ ...EMPTY_AWARDS, ...(week.awards || {}) });

  // Only players who turned out that week can be nominated. Nobody is filtered by
  // position — a defender who spent the night up front is still fair game — but the
  // list is ordered so the obvious candidates for each award come first.
  const played = weekPlayerIds(week);
  const posOf = (id) => (week.ratings[id] ? week.ratings[id].pos : 'Any');

  const optionsFor = (preferred) => {
    const list = played.slice().sort((a, b) => {
      if (preferred) {
        const ap = posOf(a.id) === preferred ? 0 : 1;
        const bp = posOf(b.id) === preferred ? 0 : 1;
        if (ap !== bp) return ap - bp;
      }
      return a.name.localeCompare(b.name);
    });
    return list;
  };

  return (
    <Dialog
      open
      title="Nominations"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Skip
          </Button>
          <Button variant="primary" size="sm" onClick={() => onSave(week.id, awards)}>
            Save nominations
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {formatDate(week.date)} · {week.matches.length} match{week.matches.length === 1 ? '' : 'es'} · {played.length}{' '}
          players
        </div>

        {AWARDS.map(([key, label, preferred]) => (
          <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-medium)',
                color: key === 'potm' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wide)',
              }}
            >
              {label}
            </span>
            <select
              className="tb-filterinput"
              style={{ minHeight: 38 }}
              value={awards[key] == null ? '' : String(awards[key])}
              onChange={(e) => setAwards((a) => ({ ...a, [key]: e.target.value ? Number(e.target.value) : null }))}
            >
              <option value="">— no nomination —</option>
              {optionsFor(preferred).map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {shortName(p.name)} · {SHORT[posOf(p.id)] || 'FLEX'}
                </option>
              ))}
            </select>
          </label>
        ))}

        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-2xs)',
            color: 'var(--color-text-tertiary)',
            lineHeight: 'var(--leading-normal)',
          }}
        >
          Nominations cover the whole session, however many matches it held. Leave any blank and come back to it from
          the History page.
        </div>
      </div>
    </Dialog>
  );
}
