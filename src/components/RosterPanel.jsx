import { Button, Icon } from '../ds/index.js';
import PlayerCard from './PlayerCard.jsx';

export default function RosterPanel({ players, selected, teamOf, onToggle, onEdit, onDelete, onAdd, needed }) {
  const inCount = selected.length;
  const ok = inCount === needed;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '0 0 10px',
        }}
      >
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
            Squad
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: ok ? 'var(--color-primary)' : 'var(--color-warning-strong)',
              marginTop: 2,
            }}
          >
            {inCount}/{needed} selected · {players.length - inCount} benched
          </div>
        </div>
        <Button size="sm" variant="secondary" icon={<Icon name="plus" size={15} />} onClick={onAdd}>
          Add player
        </Button>
      </div>
      {!ok && (
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-warning-strong)',
            background: 'var(--color-warning-subtle)',
            border: '1px solid var(--amber-400)',
            borderRadius: 'var(--radius-sm)',
            padding: '7px 10px',
            marginBottom: 10,
          }}
        >
          {inCount > needed
            ? 'Bench ' + (inCount - needed) + ' to make even sides.'
            : 'Select ' + (needed - inCount) + ' more for even sides.'}
        </div>
      )}
      <div
        style={{
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(205px,1fr))',
          gap: 10,
          paddingRight: 4,
          paddingBottom: 4,
          alignContent: 'start',
        }}
      >
        {players.map((p) => (
          <PlayerCard
            key={p.id}
            p={p}
            selected={selected.includes(p.id)}
            team={teamOf[p.id]}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
