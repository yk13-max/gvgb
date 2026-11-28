import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../ds/index.js';
import { ABBR, STATS, statAvg } from '../lib/model.js';
import { shortName } from '../lib/names.js';

const CHIP_H = 34; // full-size chip; shrinks when a crowded roster needs it
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

// The phone's ladder: the same players in the same order, as rows with a slider each.
// A native range input gives a thumb-sized handle and never fights the page for the
// scroll gesture, and the ± buttons land the last point a thumb cannot. The order is
// frozen while a slider is held so a row never jumps out from under a finger; it
// re-sorts on release, which is when the eye is ready to see where the player landed.
// Every player has to be on screen at once, so the rows are sized from the height the
// list has: one line each, as tall as fits. A big roster splits into two columns rather
// than shrinking rows past what a thumb can hold.
const ROW_GAP = 3;
const ROW_MIN = 24; // a slider thumb still lands at this height; below it the list scrolls
const ROW_MAX = 52;
export function fitRows(n, height) {
  if (!n) return { cols: 1, rows: 0, rowH: ROW_MAX };
  const at = (cols) => {
    const rows = Math.ceil(n / cols);
    return { cols, rows, rowH: Math.floor((height - ROW_GAP * (rows - 1)) / rows) };
  };
  const one = at(1);
  // Two columns once a single one would squeeze rows under 36px: by then the ± buttons
  // would be gone anyway, and wider rows read better than slivers.
  const fit = one.rowH >= 36 ? one : at(2);
  return { ...fit, rowH: Math.max(ROW_MIN, Math.min(ROW_MAX, fit.rowH)) };
}

// Slides rows from where they were to where a re-sort put them: measure every row before
// and after the order changes, start each one back at its old spot, and let it glide
// home. Skipped for anyone who has asked for reduced motion.
function useReorderAnimation(orderKey) {
  const nodes = useRef(new Map());
  const last = useRef(new Map());
  const lastKey = useRef(orderKey);
  // Layout positions, not screen boxes: an animation in flight moves a row with a
  // transform, which offsetTop/offsetLeft ignore, so a second re-sort mid-glide still
  // starts from the right place.
  const where = () => {
    const m = new Map();
    nodes.current.forEach((el, id) => m.set(id, { x: el.offsetLeft, y: el.offsetTop }));
    return m;
  };
  useLayoutEffect(() => {
    const now = where();
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (orderKey !== lastKey.current && !calm) {
      now.forEach((r, id) => {
        const was = last.current.get(id);
        const el = nodes.current.get(id);
        if (!was || !el || !el.animate) return;
        const dx = was.x - r.x;
        const dy = was.y - r.y;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], {
          duration: 320,
          easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        });
      });
    }
    // Recorded after every render, so a resize never leaves stale positions behind.
    lastKey.current = orderKey;
    last.current = now;
  });
  return (id) => (el) => {
    if (el) nodes.current.set(id, el);
    else nodes.current.delete(id);
  };
}

function LadderList({ sorted, stat, valueOf, avg, selected, canEdit, setValue }) {
  const [heldId, setHeldId] = useState(null);
  const boxRef = useRef(null);
  const [boxH, setBoxH] = useState(560);
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const measure = () => setBoxH(el.getBoundingClientRect().height || 560);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);
  const { cols, rows, rowH } = fitRows(sorted.length, boxH);
  // The ± buttons need room: a single column with rows tall enough to tap them.
  const nudges = canEdit && cols === 1 && rowH >= 40;
  const frozen = useRef(null);
  // What is frozen is the order, as ids — never the player objects. A row has to keep
  // rendering the live value while its slider is held, or the number would stick and
  // the controlled slider would snap back under the thumb on every move.
  const byId = useMemo(() => new Map(sorted.map((p) => [p.id, p])), [sorted]);
  const order =
    heldId != null && frozen.current ? frozen.current.map((id) => byId.get(id)).filter(Boolean) : sorted;
  const rankOf = (p) => sorted.findIndex((x) => x.id === p.id) + 1;
  // Re-measured whenever the order on screen changes — on release after a slide, on a
  // ± tap that passes someone, or on switching stat.
  const track = useReorderAnimation(order.map((p) => p.id).join(','));

  const hold = (p) => {
    frozen.current = sorted.map((x) => x.id);
    setHeldId(p.id);
  };
  const release = () => {
    setHeldId(null);
    frozen.current = null;
  };

  return (
    <div
      className="tb-ladderlist"
      role="list"
      ref={boxRef}
      data-cols={cols}
      style={{
        gridTemplateColumns: 'repeat(' + cols + ', minmax(0, 1fr))',
        gridTemplateRows: 'repeat(' + Math.max(rows, 1) + ', ' + rowH + 'px)',
        '--row-h': rowH + 'px',
      }}
    >
      {order.map((p) => {
        const v = valueOf(p);
        const inSquad = selected.includes(p.id);
        return (
          <div
            key={p.id}
            ref={track(p.id)}
            className="tb-ladderrow"
            role="listitem"
            data-benched={inSquad ? '0' : '1'}
            data-held={heldId === p.id ? '1' : '0'}
            data-above={v >= avg ? '1' : '0'}
          >
            <span className="tb-ladderrow-rank">{rankOf(p)}</span>
            <span className="tb-ladderrow-name">{shortName(p.name)}</span>
            {nudges && (
              <button
                type="button"
                className="tb-nudge"
                aria-label={'Lower ' + p.name + ' by one'}
                disabled={v <= 0}
                onClick={() => setValue(p.id, v - 1)}
              >
                <Icon name="minus" size={14} />
              </button>
            )}
            <input
              type="range"
              className="tb-slider"
              min="0"
              max="100"
              step="1"
              value={v}
              disabled={!canEdit}
              aria-label={p.name + ' ' + stat}
              style={{ '--pct': v + '%', '--avg': avg + '%' }}
              onPointerDown={() => hold(p)}
              onPointerUp={release}
              onPointerCancel={release}
              onBlur={release}
              onChange={(e) => setValue(p.id, Number(e.target.value))}
            />
            {nudges && (
              <button
                type="button"
                className="tb-nudge"
                aria-label={'Raise ' + p.name + ' by one'}
                disabled={v >= 100}
                onClick={() => setValue(p.id, v + 1)}
              >
                <Icon name="plus" size={14} />
              </button>
            )}
            <span className="tb-ladderrow-val">{v}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function StatLadder({ players, selected, onPatch, canEdit = true }) {
  const [stat, setStat] = useState(STATS[0]);
  const [dragId, setDragId] = useState(null);
  const [plotH, setPlotH] = useState(420);
  const [plotW, setPlotW] = useState(900);
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  const plotRef = useRef(null);
  const drag = useRef(null);
  const frozenLane = useRef({});

  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const h = (e) => setNarrow(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  useLayoutEffect(() => {
    const el = plotRef.current;
    if (!el) return undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setPlotH(r.height || 420);
      setPlotW(r.width || 900);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
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

  // Everyone has to fit across the plot without scrolling sideways. Chips start at full
  // size; if the crowded bands need more columns than the width holds, they get shorter
  // (fewer columns) and then narrower until they do.
  const { lane, chipH, laneW } = useMemo(() => {
    for (const h of [CHIP_H, 30, 26, 22, 18]) {
      const fit = assignLanes(sorted, valueOf, ((h + 4) / Math.max(plotH, 1)) * 100);
      if (fit.count * 128 <= plotW) return { ...fit, chipH: h, laneW: 128 };
      if (h === 18) return { ...fit, chipH: h, laneW: Math.max(56, Math.floor(plotW / fit.count)) };
    }
    return null;
  }, [sorted, stat, plotH, plotW]);
  const laneOf = (p) => (dragId === p.id && frozenLane.current[p.id] != null ? frozenLane.current[p.id] : lane[p.id]);

  const avg = players.length ? statAvg(players, stat) : 0;

  function setValue(id, v) {
    if (!canEdit) return;
    const p = players.find((x) => x.id === id);
    if (!p) return;
    onPatch(id, { stats: { ...p.stats, [stat]: Math.max(0, Math.min(100, Math.round(v))) } });
  }

  function onChipDown(e, p) {
    if (!canEdit) return;
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
          {narrow
            ? 'Slide a player up or down the scale. The list re-sorts when you let go.'
            : 'Drag a player up or down to rate them against everyone else. Arrow keys nudge by 1, Page keys by 10.'}
        </div>
      </div>

      {narrow ? (
        <label className="tb-statselect">
          <span>Stat</span>
          <select value={stat} onChange={(e) => setStat(e.target.value)} aria-label="Stat to compare">
            {STATS.map((k) => (
              <option key={k} value={k}>
                {k} ({ABBR[k]})
              </option>
            ))}
          </select>
        </label>
      ) : (
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
      )}

      {narrow ? (
        players.length ? (
          <LadderList sorted={sorted} stat={stat} valueOf={valueOf} avg={avg} selected={selected} canEdit={canEdit} setValue={setValue} />
        ) : (
          <div className="tb-histempty">No players yet — add some from the Squad.</div>
        )
      ) : (
      <div className="tb-plotwrap">
        <div
          className="tb-plot"
          ref={plotRef}
          data-tight={laneW < 100 ? '1' : '0'}
          style={{ '--chip-h': chipH + 'px', '--chip-w': laneW - 8 + 'px' }}
        >
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
                role={canEdit ? 'slider' : 'img'}
                tabIndex={canEdit ? 0 : -1}
                data-locked={canEdit ? '0' : '1'}
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
      )}
    </div>
  );
}
