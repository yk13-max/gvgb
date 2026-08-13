import { useState } from 'react';
import { Button, Dialog, Icon, Input, Select } from '../ds/index.js';
import { ABBR, POSITIONS, SHORT, STATS, overall } from '../lib/model.js';

function Slider({ k, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-2xs)',
          letterSpacing: 'var(--tracking-wide)',
          color: 'var(--color-text-secondary)',
          width: 30,
        }}
      >
        {ABBR[k]}
      </span>
      <input
        type="range"
        min="0"
        max="100"
        aria-label={k}
        value={value}
        onChange={(e) => onChange(k, Number(e.target.value))}
        style={{ flex: 1, minWidth: 0, accentColor: 'var(--color-primary)' }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          width: 24,
          textAlign: 'right',
          color: 'var(--color-text-primary)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

// Whatever the group chat calls someone. These feed the paste-list matcher, so
// "Sank" or "Bobby" finds the right player without renaming them on the roster.
function Nicknames({ list, onChange }) {
  const [text, setText] = useState('');
  const add = () => {
    const v = text.trim();
    if (!v || list.some((n) => n.toLowerCase() === v.toLowerCase())) return setText('');
    onChange([...list, v]);
    return setText('');
  };
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--weight-medium)',
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-wide)',
          marginBottom: 6,
        }}
      >
        Also known as
      </div>
      {list.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {list.map((n) => (
            <span key={n} className="tb-nickchip">
              {n}
              <button type="button" aria-label={'Remove nickname ' + n} onClick={() => onChange(list.filter((x) => x !== n))}>
                <Icon name="x" size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
        <Input
          style={{ flex: 1, minWidth: 0 }}
          placeholder="e.g. Sank"
          aria-label="Add a nickname"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button variant="secondary" size="sm" onClick={add} disabled={!text.trim()} style={{ minHeight: 38 }}>
          Add
        </Button>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-2xs)',
          color: 'var(--color-text-tertiary)',
          lineHeight: 'var(--leading-normal)',
          marginTop: 6,
        }}
      >
        Used when matching a pasted signup list — add the names the group actually uses.
      </div>
    </div>
  );
}

export default function PlayerEditor({ draft, onChange, onSave, onClose, queueNote }) {
  if (!draft) return null;
  const set = (patch) => onChange({ ...draft, ...patch });
  const setStat = (k, v) => onChange({ ...draft, stats: { ...draft.stats, [k]: v } });
  const toggleAlt = (pos) => {
    const has = (draft.alt || []).includes(pos);
    set({ alt: has ? draft.alt.filter((a) => a !== pos) : [...(draft.alt || []), pos] });
  };
  return (
    <Dialog
      open
      title={draft.id ? 'Edit player' : 'Add player'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onSave} disabled={!draft.name.trim()}>
            Save
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {queueNote && (
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-warning-strong)',
              background: 'var(--color-warning-subtle)',
              border: '1px solid var(--amber-400)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 9px',
            }}
          >
            {queueNote} — set their stats, or cancel to leave them at 60.
          </div>
        )}
        <Input
          label="Name"
          value={draft.name}
          placeholder="e.g. Sam Okafor"
          onChange={(e) => set({ name: e.target.value })}
        />
        <Nicknames list={draft.nicknames || []} onChange={(nicknames) => set({ nicknames })} />
        <Select
          label="Primary position"
          value={draft.pos}
          onChange={(e) => set({ pos: e.target.value, alt: (draft.alt || []).filter((a) => a !== e.target.value) })}
          options={POSITIONS.map((p) => ({ value: p, label: p }))}
        />
        <div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-medium)',
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-wide)',
              marginBottom: 6,
            }}
          >
            Can also play
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {POSITIONS.filter((p) => p !== draft.pos).map((p) => {
              const on = (draft.alt || []).includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleAlt(p)}
                  style={{
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-xs)',
                    padding: '4px 9px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid ' + (on ? 'var(--color-primary)' : 'var(--color-border-strong)'),
                    background: on ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
                    color: on ? 'var(--green-700)' : 'var(--color-text-secondary)',
                  }}
                >
                  {SHORT[p]}
                </button>
              );
            })}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            borderTop: '1px solid var(--color-border)',
            paddingTop: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-medium)',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wide)',
              }}
            >
              Stats 0–100
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
              OVR {overall(draft)}
            </span>
          </div>
          {STATS.map((k) => (
            <Slider key={k} k={k} value={Number(draft.stats[k]) || 0} onChange={setStat} />
          ))}
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-2xs)',
              color: 'var(--color-text-tertiary)',
              lineHeight: 'var(--leading-normal)',
            }}
          >
            Overall is weighted by primary position — a striker&apos;s shooting and pace count for more than their
            defending.
          </div>
        </div>
      </div>
    </Dialog>
  );
}
