import { Button, Icon } from '../ds/index.js';
import PlayerCard, { MiniPlayerCard } from './PlayerCard.jsx';
import { overall } from '../lib/model.js';
import { byName } from '../lib/names.js';

export default function RosterPanel({
  players,
  selected,
  teamOf,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
  onClear,
  needed,
  mini,
  onMiniChange,
  sort = 'name',
  onSortChange,
  canEdit = true,
  showValues = true,
}) {
  // Signed out there are no scores to sort by, and the order of a hidden number is the
  // number by another name — so the squad reads A–Z whatever the preference says.
  const order = showValues ? sort : 'name';
  const byScore = (a, b) => overall(b) - overall(a) || byName(a, b);
  const inCount = selected.length;
  const ok = inCount === needed;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <div
        className="tb-squadhead"
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
        <div className="tb-squadctl" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {showValues && (
            <div className="tb-viewtoggle" role="group" aria-label="Squad order">
              {[
                ['name', 'arrow-down-a-z', 'Sort by name'],
                ['ovr', 'arrow-down-1-0', 'Sort by score'],
              ].map(([v, ic, label]) => (
                <button
                  key={v}
                  type="button"
                  data-on={order === v ? '1' : '0'}
                  aria-pressed={order === v}
                  aria-label={label}
                  title={label}
                  onClick={() => onSortChange && onSortChange(v)}
                >
                  <Icon name={ic} size={15} />
                </button>
              ))}
            </div>
          )}
          <div className="tb-viewtoggle" role="group" aria-label="Squad view">
            {[
              [false, 'layout-grid', 'Card view'],
              [true, 'list', 'Mini view'],
            ].map(([v, ic, label]) => (
              <button
                key={label}
                type="button"
                data-on={mini === v ? '1' : '0'}
                aria-pressed={mini === v}
                aria-label={label}
                title={label}
                onClick={() => onMiniChange(v)}
              >
                <Icon name={ic} size={15} />
              </button>
            ))}
          </div>
          {canEdit && (
            <>
              {/* Benches everyone in one go — the quick way to start a new night's pick
                  from a clean sheet. Disabled rather than hidden when the bench is already
                  full, so it stays where the hand expects it. */}
              <Button
                size="sm"
                variant="secondary"
                className="tb-clearbtn"
                icon={<Icon name="x" size={15} />}
                aria-label="Deselect all"
                title="Bench everyone"
                disabled={inCount === 0}
                onClick={onClear}
              >
                <span>Deselect all</span>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="tb-addbtn"
                icon={<Icon name="plus" size={15} />}
                aria-label="Add player"
                onClick={onAdd}
              >
                <span>Add player</span>
              </Button>
            </>
          )}
        </div>
      </div>
      {!ok && canEdit && (
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
      <div className="tb-grid" data-mini={mini ? '1' : '0'}>
        {players
          .slice()
          .sort(order === 'ovr' ? byScore : byName)
          .map((p) =>
          mini ? (
            <MiniPlayerCard
              key={p.id}
              p={p}
              selected={selected.includes(p.id)}
              team={teamOf[p.id]}
              canEdit={canEdit}
              showValues={showValues}
              onToggle={onToggle}
            />
          ) : (
            <PlayerCard
              key={p.id}
              p={p}
              selected={selected.includes(p.id)}
              team={teamOf[p.id]}
              canEdit={canEdit}
              showValues={showValues}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )
        )}
      </div>
    </div>
  );
}
