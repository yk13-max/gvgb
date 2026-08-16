import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ABBR, STATS, statAvg } from '../lib/model.js';
import { shortName } from '../lib/names.js';

const CHIP_H = 40; // the taller mobile chip, so lanes never overlap on either layout
const NARROW = '(max-width:760px)';
const TICKS = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];

// Chips are packed into columns: each player takes the leftmost column whose last
// chip sits far enough above them, so a crowded band fans sideways instead of stacking.
function assignLanes(sorted, valueOf, minGap) {
  const lastInLane = [];
  const lane = {};
  sorted.forEach((p) => {
    const v = valueOf(p);
    let i = 0;
    while (i < lastInLane.length && lastInLane[i] - v < minGap) i += 1;
    lastInLane[i] = v;
    lane[p.id] = i;
  });
  return { lane, count: Math.max(1, lastInLane.length) };
}

export default function StatLadder({ players, selected, onPatch }) {
  const [stat, setStat] = useState(STATS[0]);
  const [dragId, setDragId] = useState(null);
  const [plotH, setPlotH] = useState(420);
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  const plotRef = useRef(null);
  const drag = useRef(null);
  const frozenLane = useRef({});
  const laneW = narrow ? 112 : 128;

  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const h = (e) => setNarrow(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  useLayoutEffect(() => {
    const el = plotRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setPlotH(el.getBoundingClientRect().height || 420));
    ro.observe(el);
    setPlotH(el.getBoundingClientRect().height || 420);
    return () => ro.disconnect();
  }, []);

  useEffect(() => () => {
    drag.current = null;
  }, []);

  const valueOf = (p) => Number(p.stats[stat]) || 0;

  const sorted = useMemo(
    () => players.slice().sort((a, b) => (Number(b.stats[stat]) || 0) - (Number(a.stats[stat]) || 0)),
    [players, stat]
  );

  // A chip is CHIP_H tall, so the gap that avoids overlap depends on the plot's height.
  const minGap = ((CHIP_H + 6) / Math.max(plotH, 1)) * 100;
  const { lane, count } = useMemo(() => assignLanes(sorted, valueOf, minGap), [sorted, stat, minGap]);
  const laneOf = (p) => (dragId === p.id && frozenLane.current[p.id] != null ? frozenLane.current[p.id] : lane[p.id]);

  const avg = players.length ? statAvg(players, stat) : 0;

  function setValue(id, v) {
    const p = players.find((x) => x.id === id);
    if (!p) return;
    onPatch(id, { stats: { ...p.stats, [stat]: Math.max(0, Math.min(100, Math.round(v))) } });
  }

  function onChipDown(e, p) {
    e.preventDefault();
    e.currentTarget.focus();
    frozenLane.current = { [p.id]: lane[p.id] };
    setDragId(p.id);
    drag.current = { id: p.id };
    const move = (ev) => {
      if (!drag.current || !plotRef.current) return;
      const r = plotRef.current.getBoundingClientRect();
      setValue(drag.current.id, (1 - (ev.clientY - r.top) / r.height) * 100);
    };
    const end = () => {
      drag.current = null;
      setDragId(null);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  function onChipKey(e, p) {
    const step = e.key === 'PageUp' || e.key === 'PageDown' ? 10 : 1;
    const dir = e.key === 'ArrowUp' || e.key === 'PageUp' ? 1 : e.key === 'ArrowDown' || e.key === 'PageDown' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    setValue(p.id, valueOf(p) + dir * step);
  }

  return (
    <div className="tb-ladder">
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
            Stat ladder
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              marginTop: 2,
            }}
          >
            {stat} · {players.length} players · avg {avg.toFixed(1)}
          </div>
        </div>
        <div
          className="tb-ladderhint"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-tertiary)',
            maxWidth: 300,
            lineHeight: 'var(--leading-normal)',
          }}
        >
          Drag a player up or down to rate them against everyone else. Arrow keys nudge by 1, Page keys by 10.
        </div>
      </div>

      <div className="tb-statpick" role="tablist" aria-label="Stat to compare">
        {STATS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={stat === k}
            data-on={stat === k ? '1' : '0'}
            onClick={() => setStat(k)}
          >
            <span className="tb-statpick-abbr">{ABBR[k]}</span>
            <span>{k}</span>
          </button>
        ))}
      </div>

      <div className="tb-plotwrap">
        <div className="tb-plot" ref={plotRef} style={{ minWidth: count * laneW }}>
          {TICKS.map((t) => (
            <div key={t} className="tb-tick" style={{ top: 100 - t + '%' }}>
              <span className="tb-tick-label">{t}</span>
            </div>
          ))}
          {players.length > 0 && (
            <div className="tb-avgline" style={{ top: 100 - avg + '%' }}>
              <span className="tb-avgline-label">avg {avg.toFixed(1)}</span>
            </div>
          )}
          {sorted.map((p) => {
            const v = valueOf(p);
            const inSquad = selected.includes(p.id);
            return (
              <div
                key={p.id}
                className="tb-ladderchip"
                data-dragging={dragId === p.id ? '1' : '0'}
                data-benched={inSquad ? '0' : '1'}
                role="slider"
                tabIndex={0}
                aria-label={p.name + ' ' + stat}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={v}
                title={p.name + ' — ' + stat + ' ' + v}
                style={{ top: 100 - v + '%', left: laneOf(p) * laneW }}
                onPointerDown={(e) => onChipDown(e, p)}
                onKeyDown={(e) => onChipKey(e, p)}
              >
                <span className="tb-ladderchip-name">{shortName(p.name)}</span>
                <span className="tb-ladderchip-val">{v}</span>
              </div>
            );
          })}
          {!players.length && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              No players yet — add some from the Squad.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
