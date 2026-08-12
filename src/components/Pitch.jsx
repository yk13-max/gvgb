import { ABBR, STATS, overall } from '../lib/model.js';
import { firstName, initials } from '../lib/names.js';

function Pin({ p, team, x, y, showStats, selected, onPointerDown }) {
  const col = team === 'red' ? 'var(--team-red)' : 'var(--team-blue)';
  return (
    <div
      onPointerDown={(e) => onPointerDown(e, p, team)}
      style={{
        position: 'absolute',
        left: x + '%',
        top: y + '%',
        transform: 'translate(-50%,-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        zIndex: selected ? 5 : 2,
      }}
    >
      <div
        className="tb-pin-badge"
        style={{
          position: 'relative',
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: col,
          color: 'var(--white)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontWeight: 'var(--weight-bold)',
          fontSize: 13,
          border: '2px solid ' + (selected ? 'var(--color-accent)' : 'oklch(100% 0 0 / 0.75)'),
          boxShadow: selected
            ? '0 0 0 4px oklch(74% 0.16 95 / 0.35)'
            : '0 2px 6px oklch(18% 0.015 230 / 0.5)',
        }}
      >
        {initials(p.name)}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'oklch(18% 0.015 230 / 0.72)',
          borderRadius: 'var(--radius-xs)',
          padding: '1px 5px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-2xs)',
            fontWeight: 'var(--weight-semibold)',
            color: 'var(--white)',
            whiteSpace: 'nowrap',
          }}
        >
          {firstName(p.name)}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--color-accent)' }}>
          {overall(p)}
        </span>
      </div>
      {showStats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2,auto)',
            gap: '1px 6px',
            background: 'oklch(18% 0.015 230 / 0.78)',
            borderRadius: 'var(--radius-xs)',
            padding: '3px 5px',
          }}
        >
          {STATS.map((k) => (
            <span
              key={k}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8.5,
                color: 'oklch(100% 0 0 / 0.8)',
                whiteSpace: 'nowrap',
              }}
            >
              {ABBR[k]} {p.stats[k]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Pitch({ teams, pos, showStats, sel, onPinDown, pitchRef }) {
  const line = '1.5px solid oklch(100% 0 0 / 0.28)';
  return (
    <div
      ref={pitchRef}
      className="tb-pitch"
      style={{
        position: 'relative',
        background: 'var(--slate-900)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--slate-700)',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: '2.5%', border: line, borderRadius: 2 }} />
      <div style={{ position: 'absolute', left: '2.5%', right: '2.5%', top: '50%', borderTop: line }} />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '22%',
          aspectRatio: '1',
          transform: 'translate(-50%,-50%)',
          border: line,
          borderRadius: '50%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 5,
          height: 5,
          transform: 'translate(-50%,-50%)',
          background: 'oklch(100% 0 0 / 0.4)',
          borderRadius: '50%',
        }}
      />
      <div style={{ position: 'absolute', left: '22%', right: '22%', top: '2.5%', height: '13%', border: line, borderTop: 'none' }} />
      <div style={{ position: 'absolute', left: '36%', right: '36%', top: '2.5%', height: '5.5%', border: line, borderTop: 'none' }} />
      <div style={{ position: 'absolute', left: '22%', right: '22%', bottom: '2.5%', height: '13%', border: line, borderBottom: 'none' }} />
      <div style={{ position: 'absolute', left: '36%', right: '36%', bottom: '2.5%', height: '5.5%', border: line, borderBottom: 'none' }} />
      {['red', 'blue'].map((t) =>
        teams[t].map((p) => {
          const c = pos[p.id] || { x: 50, y: t === 'red' ? 70 : 30 };
          return (
            <Pin
              key={p.id}
              p={p}
              team={t}
              x={c.x}
              y={c.y}
              showStats={showStats}
              selected={sel && sel.id === p.id}
              onPointerDown={onPinDown}
            />
          );
        })
      )}
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: 10,
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-lg)',
          fontWeight: 'var(--weight-bold)',
          letterSpacing: 'var(--tracking-wide)',
          color: 'var(--team-blue)',
        }}
      >
        BLUE
      </div>
      <div
        style={{
          position: 'absolute',
          left: 12,
          bottom: 10,
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-lg)',
          fontWeight: 'var(--weight-bold)',
          letterSpacing: 'var(--tracking-wide)',
          color: 'var(--team-red)',
        }}
      >
        RED
      </div>
    </div>
  );
}
