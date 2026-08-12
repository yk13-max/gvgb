import { Icon, IconButton } from '../ds/index.js';
import { ABBR, SHORT, STATS, overall } from '../lib/model.js';
import { initials } from '../lib/names.js';

export function StatRow({ k, v }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-2xs)',
          color: 'var(--color-text-tertiary)',
          letterSpacing: 'var(--tracking-wide)',
          width: 26,
        }}
      >
        {ABBR[k]}
      </span>
      <div
        style={{
          flex: 1,
          height: 4,
          background: 'var(--slate-100)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: v + '%',
            height: '100%',
            background: v >= 80 ? 'var(--color-primary)' : v >= 55 ? 'var(--green-400)' : 'var(--slate-300)',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-2xs)',
          color: 'var(--color-text-secondary)',
          width: 18,
          textAlign: 'right',
        }}
      >
        {v}
      </span>
    </div>
  );
}

export default function PlayerCard({ p, selected, team, onToggle, onEdit, onDelete }) {
  const ovr = overall(p);
  const teamColor = team === 'red' ? 'var(--team-red)' : team === 'blue' ? 'var(--team-blue)' : null;
  return (
    <div
      onClick={() => onToggle(p.id)}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(p.id);
        }
      }}
      style={{
        cursor: 'pointer',
        background: 'var(--color-surface)',
        border: '1px solid ' + (selected ? teamColor || 'var(--color-primary)' : 'var(--color-border)'),
        borderRadius: 'var(--radius-md)',
        padding: 12,
        opacity: selected ? 1 : 0.55,
        boxShadow: selected ? 'var(--shadow-sm)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontWeight: 'var(--weight-semibold)',
            fontSize: 13,
            background: teamColor && selected ? teamColor : 'var(--green-100)',
            color: teamColor && selected ? 'var(--white)' : 'var(--green-700)',
          }}
        >
          {initials(p.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-semibold)',
              color: 'var(--color-text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {p.name}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-2xs)',
                fontWeight: 'var(--weight-semibold)',
                letterSpacing: 'var(--tracking-wide)',
                color: 'var(--color-primary)',
                background: 'var(--color-primary-subtle)',
                borderRadius: 'var(--radius-xs)',
                padding: '1px 5px',
              }}
            >
              {SHORT[p.pos]}
            </span>
            {(p.alt || []).map((a) => (
              <span
                key={a}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-2xs)',
                  color: 'var(--color-text-tertiary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '1px 5px',
                }}
              >
                {SHORT[a]}
              </span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--weight-bold)',
              color: 'var(--color-text-primary)',
              lineHeight: 1,
            }}
          >
            {ovr}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 9,
              letterSpacing: 'var(--tracking-widest)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            OVR
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
        {STATS.map((k) => (
          <StatRow key={k} k={k} v={Number(p.stats[k]) || 0} />
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--color-border)',
          paddingTop: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-2xs)',
            letterSpacing: 'var(--tracking-wide)',
            color: selected ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            fontWeight: 'var(--weight-semibold)',
          }}
        >
          {selected ? (team ? team + ' team' : 'in squad') : 'benched'}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <IconButton
            icon={<Icon name="pencil" size={14} />}
            aria-label={'Edit ' + p.name}
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(p);
            }}
          />
          <IconButton
            icon={<Icon name="trash-2" size={14} />}
            aria-label={'Delete ' + p.name}
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(p.id);
            }}
          />
        </div>
      </div>
    </div>
  );
}
