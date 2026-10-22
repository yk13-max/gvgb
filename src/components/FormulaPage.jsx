import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dialog, Icon, Switch } from '../ds/index.js';
import {
  DEFAULT_FORMULA,
  POSITION_KEYS,
  RANGES,
  bare,
  cleanFormula,
  diffFormula,
  fromShares,
  isDefault,
  sameFormula,
  setWeight,
  shares,
  withFormula,
} from '../lib/formula.js';
import { SHORT, STATS, balance, balanceScore, countPos, overall, ovrAvg } from '../lib/model.js';
import { formatDate } from '../lib/whatsapp.js';
import { influencePoints, ratingSuggestions, resultsCheck, scoreOf, strengthOf } from '../lib/strength.js';

// The team formula, laid out the way the "How teams are made" sheet is — cover, the five
// steps, a numbered section per step, the quirks, then what a change would do — with
// every number on it editable. Nothing applies until it is saved, and saving takes a
// backup first. Password holders only: the previews are full of ratings.

const STEPS = [
  ['fx-rate', '1', 'Rate'],
  ['fx-adjust', '2', 'Adjust'],
  ['fx-keepers', '3', 'Keepers'],
  ['fx-score', '4', 'Score'],
  ['fx-search', '5', 'Search'],
  ['fx-suggest', '6', 'Suggest'],
  ['fx-quirks', '!', 'Switches'],
  ['fx-preview', '▶', 'Preview'],
];

// A small seeded generator, so a preview balances the same squad the same way twice and
// the only thing that differs between "saved" and "edited" is the formula.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fmt = (v, dp = 0) => (Number.isInteger(v) && !dp ? String(v) : Number(v).toFixed(dp));

// --- pieces -------------------------------------------------------------------------------

function Section({ id, num, title, where, lede, children }) {
  return (
    <section className="fx-sec" id={id}>
      <h2 className="fx-h2">
        <span className="fx-num">{num}</span>
        <span>{title}</span>
        {where && <span className="fx-where">{where}</span>}
      </h2>
      {lede && <p className="fx-lede">{lede}</p>}
      {children}
    </section>
  );
}

// A labelled slider with the saved value shown beside it once it has been moved.
function Slider({ label, hint, value, saved, min, max, step = 1, dp = 0, unit = '', onChange }) {
  const moved = saved != null && Math.abs(saved - value) > 1e-9;
  const savedPct = saved == null ? null : ((saved - min) / (max - min)) * 100;
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="fx-slider" data-moved={moved ? '1' : '0'}>
      <span className="fx-slider-top">
        <span className="fx-slider-label">{label}</span>
        <span className="fx-slider-val">
          {moved && <span className="fx-was">was {fmt(saved, dp)}{unit}</span>}
          <b>
            {fmt(value, dp)}
            {unit}
          </b>
        </span>
      </span>
      <span className="fx-track">
        {moved && <span className="fx-tick" style={{ left: 'calc(10px + (100% - 20px) * ' + savedPct / 100 + ')' }} aria-hidden="true" />}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          style={{ '--pct': 'calc(10px + (100% - 20px) * ' + pct / 100 + ')' }}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </span>
      {hint && <span className="fx-hint">{hint}</span>}
    </label>
  );
}

// One bar split three ways. Two handles move the boundaries; the shares always add to 100.
function ShareBar({ value, saved, onChange }) {
  const ref = useRef(null);
  const drag = useRef(null);
  const cuts = [value.level, value.level + value.mix];
  const savedCuts = [saved.level, saved.level + saved.mix];
  const set = (i, x) => {
    const c = cuts.slice();
    c[i] = Math.round(Math.max(i === 0 ? 0 : c[0], Math.min(i === 0 ? c[1] : 100, x)));
    onChange({ level: c[0], mix: c[1] - c[0], positions: 100 - c[1] });
  };
  const at = (e) => {
    const r = ref.current.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * 100;
  };
  const parts = [
    ['level', 'Level', value.level],
    ['mix', 'Stat mix', value.mix],
    ['positions', 'Positions', value.positions],
  ];
  return (
    <div className="fx-share">
      <div
        className="fx-share-bar"
        ref={ref}
        onPointerMove={(e) => {
          if (drag.current != null) set(drag.current, at(e));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {parts.map(([k, label, v]) => (
          <span key={k} className={'fx-share-seg fx-share-' + k} style={{ width: v + '%' }}>
            {v >= 12 && (
              <span>
                {label} <b>{Math.round(v)}</b>
              </span>
            )}
          </span>
        ))}
        {savedCuts.map((c, i) =>
          Math.abs(c - cuts[i]) > 0.5 ? <span key={'s' + i} className="fx-share-was" style={{ left: c + '%' }} aria-hidden="true" /> : null
        )}
        {cuts.map((c, i) => (
          <span
            key={i}
            role="slider"
            tabIndex={0}
            aria-label={i === 0 ? 'Boundary between level and stat mix' : 'Boundary between stat mix and positions'}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(c)}
            className="fx-share-handle"
            style={{ left: c + '%' }}
            onPointerDown={(e) => {
              e.preventDefault();
              drag.current = i;
              ref.current.setPointerCapture(e.pointerId);
            }}
            onKeyDown={(e) => {
              const d = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : 0;
              if (d) {
                e.preventDefault();
                set(i, c + d * (e.shiftKey ? 5 : 1));
              }
            }}
          />
        ))}
      </div>
      <div className="fx-share-legend">
        {parts.map(([k, label, v]) => {
          const was = saved[k];
          return (
            <span key={k} className={'fx-share-key fx-share-key-' + k}>
              <i />
              {label} <b>{Math.round(v)}%</b>
              {Math.abs(was - v) > 0.5 && <span className="fx-was">was {Math.round(was)}%</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// The formula as a code block, with any number that differs from the saved one marked.
function Formula({ lines }) {
  return (
    <pre className="fx-formula">
      {lines.map((ln, i) => (
        <span key={i} className="fx-fl">
          {ln.map((part, j) =>
            typeof part === 'string' ? (
              <span key={j}>{part}</span>
            ) : part.k ? (
              <span key={j} className="fx-k">
                {part.k}
              </span>
            ) : part.c ? (
              <span key={j} className="fx-c">
                {part.c}
              </span>
            ) : (
              <mark key={j} data-moved={part.moved ? '1' : '0'}>
                {part.v}
              </mark>
            )
          )}
          {'\n'}
        </span>
      ))}
    </pre>
  );
}

function Quirk({ title, children, on, onChange, moved }) {
  return (
    <div className="fx-quirk" data-on={on ? '1' : '0'} data-moved={moved ? '1' : '0'}>
      <div className="fx-quirk-text">
        <b>{title}</b>
        <p>{children}</p>
      </div>
      {onChange && (
        <div className="fx-quirk-switch">
          <Switch checked={on} name={title} onChange={(e) => onChange(e.target.checked)} label={<span className="fx-onoff">{on ? 'On' : 'Off'}</span>} />
          {moved && <span className="fx-was">was {on ? 'off' : 'on'}</span>}
        </div>
      )}
    </div>
  );
}

// --- previews -----------------------------------------------------------------------------

// The squad to preview: this week's if it is complete, else the last recorded match.
function previewSquad(players, selected, teamSize, weeks) {
  const byId = new Map(players.map((p) => [p.id, p]));
  if (selected.length === teamSize * 2) {
    const pool = selected.map((id) => byId.get(id)).filter(Boolean);
    if (pool.length === teamSize * 2) return { pool, size: teamSize, source: 'This week’s squad' };
  }
  for (const w of weeks) {
    for (const m of w.matches || []) {
      const ids = [...(m.red || []), ...(m.blue || [])].map((p) => p.id);
      const pool = ids.map((id) => byId.get(id)).filter(Boolean);
      if ((m.red || []).length === (m.blue || []).length && pool.length === ids.length && pool.length >= 4) {
        return { pool, size: pool.length / 2, source: 'The last recorded match, ' + formatDate(w.date) };
      }
    }
  }
  const need = teamSize * 2;
  return players.length >= need ? { pool: players.slice(0, need), size: teamSize, source: 'The first ' + need + ' players on the roster' } : null;
}

function splitWith(f, squad, weeks, players, influence) {
  return withFormula(f, () => {
    const sf = strengthOf(weeks, players, influence);
    const t = balance(squad.pool, squad.size, 0, sf, seeded(7));
    return { red: t.red, blue: t.blue, score: balanceScore(t.red, t.blue, sf), avg: [ovrAvg(t.red, sf), ovrAvg(t.blue, sf)], ovr: new Map(squad.pool.map((p) => [p.id, overall(p)])) };
  });
}

function TeamsPreview({ saved, draft, squad, weeks, players, influence, changed }) {
  const a = useMemo(() => (squad ? splitWith(saved, squad, weeks, players, influence) : null), [saved, squad, weeks, players, influence]);
  const b = useMemo(() => (squad ? splitWith(draft, squad, weeks, players, influence) : null), [draft, squad, weeks, players, influence]);
  if (!squad) return <p className="fx-muted">Add at least ten players to see teams.</p>;
  // Sides are labelled by keeper, so a mirrored split reads as nobody moving.
  const redA = new Set(a.red.map((p) => p.id));
  let moved = b.red.filter((p) => !redA.has(p.id)).length + b.blue.filter((p) => redA.has(p.id)).length;
  const flip = moved > squad.pool.length / 2;
  const movedIds = new Set(
    [...b.red.filter((p) => (flip ? redA.has(p.id) : !redA.has(p.id))), ...b.blue.filter((p) => (flip ? !redA.has(p.id) : redA.has(p.id)))].map((p) => p.id)
  );
  moved = movedIds.size;
  const side = (list, cls, label, avg) => (
    <div className={'fx-side ' + cls}>
      <div className="fx-side-head">
        <span>{label}</span>
        <b>{avg.toFixed(1)}</b>
      </div>
      <ul>
        {list.map((p) => {
          const now = b.ovr.get(p.id);
          const was = a.ovr.get(p.id);
          return (
            <li key={p.id} data-moved={movedIds.has(p.id) ? '1' : '0'}>
              <span className="fx-pos">{SHORT[p.pos] || 'FLEX'}</span>
              <span className="fx-name">{p.name}</span>
              <span className="fx-ovr">
                {now !== was && <s>{was}</s>}
                {now}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
  return (
    <div>
      <p className="fx-muted">
        {squad.source}
        {influence !== 'off' ? ' · results ' + influence : ''}
      </p>
      <div className="fx-scorepair">
        <div>
          <span>Saved formula</span>
          <b>{a.score}</b>
        </div>
        <Icon name="chevron-right" size={16} />
        <div data-moved={changed ? '1' : '0'}>
          <span>Your edit</span>
          <b>{b.score}</b>
        </div>
      </div>
      <div className="fx-sides">
        {side(b.red, 'fx-red', 'Red', b.avg[0])}
        {side(b.blue, 'fx-blue', 'Blue', b.avg[1])}
      </div>
      <p className="fx-muted">
        {!changed
          ? 'Move something to see how these sides would change.'
          : moved
            ? moved + ' player' + (moved === 1 ? '' : 's') + ' would swap side (highlighted).'
            : 'Same sides as the saved formula.'}{' '}
        Each score is judged by its own formula.
      </p>
    </div>
  );
}

// Real squads from recorded matches plus random ones from the roster, all balanced under
// both formulas. It takes a second or two, so it runs in slices and only on request.
function benchSquads(players, weeks, teamSize) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const seen = new Set();
  const out = [];
  weeks.forEach((w) =>
    (w.matches || []).forEach((m) => {
      const ids = [...(m.red || []), ...(m.blue || [])].map((p) => p.id);
      if ((m.red || []).length !== (m.blue || []).length || ids.length < 4) return;
      const pool = ids.map((id) => byId.get(id)).filter(Boolean);
      const key = ids.slice().sort((x, y) => x - y).join(',');
      if (pool.length !== ids.length || seen.has(key) || out.length >= 60) return;
      seen.add(key);
      out.push({ pool, size: ids.length / 2, real: true });
    })
  );
  const need = teamSize * 2;
  if (players.length >= need) {
    const rng = seeded(1234);
    for (let i = 0; i < 200; i++) {
      const pool = players.slice();
      for (let j = pool.length - 1; j > 0; j--) {
        const k = Math.floor(rng() * (j + 1));
        [pool[j], pool[k]] = [pool[k], pool[j]];
      }
      out.push({ pool: pool.slice(0, need), size: teamSize, real: false });
    }
  }
  return out;
}

function measure(f, saved, sq, weeks, players, influence) {
  const t0 = performance.now();
  const r = withFormula(f, () => {
    const sf = strengthOf(weeks, players, influence);
    const t = balance(sq.pool, sq.size, 0, sf, seeded(11));
    return { t, score: balanceScore(t.red, t.blue, sf) };
  });
  const ms = performance.now() - t0;
  // Measured the same way for both formulas, so the two columns can be compared directly.
  const gap = withFormula(saved, () => Math.abs(ovrAvg(r.t.red) - ovrAvg(r.t.blue)));
  const shape = ['Defender', 'Midfielder', 'Striker'].reduce((s, pos) => s + Math.abs(countPos(r.t.red, pos) - countPos(r.t.blue, pos)), 0);
  return { score: r.score, gap, shape, ms };
}

function Benchmark({ saved, draft, players, weeks, teamSize, influence, changed }) {
  const [state, setState] = useState(null);
  const token = useRef(0);
  const key = JSON.stringify(draft) + JSON.stringify(saved) + influence;
  useEffect(() => {
    token.current += 1;
    setState(null);
  }, [key]);
  useEffect(() => () => {
    token.current += 1;
  }, []);

  function run() {
    const my = ++token.current;
    const squads = benchSquads(players, weeks, teamSize);
    const acc = { a: [], b: [] };
    let i = 0;
    setState({ done: 0, total: squads.length, real: squads.filter((s) => s.real).length });
    const step = () => {
      if (token.current !== my) return;
      const until = performance.now() + 30;
      while (i < squads.length && performance.now() < until) {
        acc.a.push(measure(saved, saved, squads[i], weeks, players, influence));
        acc.b.push(changed ? measure(draft, saved, squads[i], weeks, players, influence) : acc.a[acc.a.length - 1]);
        i += 1;
      }
      const sum = (list, k) => list.reduce((s, x) => s + x[k], 0) / (list.length || 1);
      const res = (list) => ({ avg: sum(list, 'score'), worst: Math.min(...list.map((x) => x.score)), gap: sum(list, 'gap'), shape: sum(list, 'shape'), ms: sum(list, 'ms') });
      setState((s) => ({ ...s, done: i, a: i === squads.length ? res(acc.a) : null, b: i === squads.length ? res(acc.b) : null }));
      if (i < squads.length) setTimeout(step, 0);
    };
    setTimeout(step, 0);
  }

  if (!state)
    return (
      <div>
        <p className="fx-muted">Balances every squad you’ve actually played plus 200 random squads from the roster, under the saved formula and your edit.</p>
        <Button variant="secondary" size="sm" icon={<Icon name="refresh-cw" size={15} />} onClick={run}>
          Run the check
        </Button>
      </div>
    );
  if (!state.a)
    return (
      <div>
        <p className="fx-muted">
          Balancing {state.done} of {state.total} squads…
        </p>
        <div className="fx-progress">
          <span style={{ width: (state.done / Math.max(1, state.total)) * 100 + '%' }} />
        </div>
      </div>
    );
  const row = (label, k, dp, better, note) => {
    const x = state.a[k];
    const y = state.b[k];
    const diff = changed && Math.abs(x - y) >= Math.pow(10, -dp) / 2;
    const good = better === 'up' ? y > x : y < x;
    return (
      <tr>
        <td>
          {label}
          {note && <span className="fx-hint">{note}</span>}
        </td>
        <td className="fx-n">{x.toFixed(dp)}</td>
        <td className="fx-n" data-trend={diff ? (better ? (good ? 'good' : 'bad') : 'moved') : ''}>
          {y.toFixed(dp)}
        </td>
      </tr>
    );
  };
  return (
    <div>
      <p className="fx-muted">
        {state.real} real squad{state.real === 1 ? '' : 's'} and {state.total - state.real} random ones.
      </p>
      <table className="fx-table">
        <thead>
          <tr>
            <th />
            <th className="fx-n">Saved</th>
            <th className="fx-n">Edit</th>
          </tr>
        </thead>
        <tbody>
          {row('Average balance', 'avg', 1, null, 'judged by each formula’s own rules')}
          {row('Worst balance', 'worst', 0, null)}
          {row('Average level gap', 'gap', 2, 'down', 'OVR points, saved ratings')}
          {row('Positions out of step', 'shape', 2, 'down', 'per squad, plain counts')}
          {row('Time per balance', 'ms', 1, 'down', 'milliseconds on this device')}
        </tbody>
      </table>
      <Button variant="ghost" size="sm" icon={<Icon name="refresh-cw" size={15} />} onClick={run}>
        Run again
      </Button>
    </div>
  );
}

function ResultsPreview({ saved, draft, weeks, players, changed }) {
  const a = useMemo(() => withFormula(saved, () => resultsCheck(weeks, players)), [saved, weeks, players]);
  const b = useMemo(() => withFormula(draft, () => resultsCheck(weeks, players)), [draft, weeks, players]);
  if (!a.off.n) return <p className="fx-muted">No decided matches recorded yet.</p>;
  const pct = (t) => (t.n - t.close ? Math.round((t.hit / (t.n - t.close)) * 100) : 0);
  const rows = [
    ['off', 'Ratings only'],
    ['light', 'With Light results'],
    ['strong', 'With Strong results'],
  ];
  return (
    <div>
      <p className="fx-muted">
        How often the side the formula rated stronger went on to win, across {a.off.n} decided matches. Results only count from matches before each one.
      </p>
      <table className="fx-table">
        <thead>
          <tr>
            <th />
            <th className="fx-n">Saved</th>
            <th className="fx-n">Edit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, label]) => {
            const x = pct(a[k]);
            const y = pct(b[k]);
            return (
              <tr key={k}>
                <td>
                  {label}
                  <span className="fx-hint">
                    {b[k].close} too close to call
                  </span>
                </td>
                <td className="fx-n">{x}%</td>
                <td className="fx-n" data-trend={changed && x !== y ? (y > x ? 'good' : 'bad') : ''}>
                  {y}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// --- the page -----------------------------------------------------------------------------

export default function FormulaPage({ formula, prev, players, weeks, selected, teamSize, influence, onSave, onUndo, onBack }) {
  const saved = useMemo(() => cleanFormula(bare(formula)), [formula]);
  const [draft, setDraft] = useState(saved);
  const [pos, setPos] = useState('Defender');
  const [confirm, setConfirm] = useState(null); // 'save' | 'undo'
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [example, setExample] = useState({ w: 3, l: 2, last: [1, 1, -1, 1, 1] });
  const scroller = useRef(null);

  // Someone else's save lands while this page is open: take it, unless there are edits here.
  // A save from this page lands the same way, and the draft becomes what was stored.
  const lastSaved = useRef(saved);
  const justSaved = useRef(null);
  useEffect(() => {
    if (sameFormula(draft, lastSaved.current) || (justSaved.current && sameFormula(draft, justSaved.current))) setDraft(saved);
    justSaved.current = null;
    lastSaved.current = saved;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const changes = useMemo(() => diffFormula(saved, draft), [saved, draft]);
  const changed = changes.length > 0;
  const view = useDeferredValue(draft);

  const patch = (group, k, v) => setDraft((d) => ({ ...d, [group]: { ...d[group], [k]: v } }));

  // Players whose OVR the edit would move.
  const movers = useMemo(() => {
    const out = [];
    players.forEach((p) => {
      const a = withFormula(saved, () => overall(p));
      const b = withFormula(view, () => overall(p));
      if (a !== b) out.push({ p, a, b });
    });
    return out.sort((x, y) => Math.abs(y.b - y.a) - Math.abs(x.b - x.a) || x.p.name.localeCompare(y.p.name));
  }, [players, saved, view]);

  const squad = useMemo(() => previewSquad(players, selected, teamSize, weeks), [players, selected, teamSize, weeks]);

  const sugA = useMemo(() => withFormula(saved, () => ratingSuggestions(weeks, players)).length, [saved, weeks, players]);
  const sugB = useMemo(() => withFormula(view, () => ratingSuggestions(weeks, players)).length, [view, weeks, players]);

  const sh = shares(draft.cost);
  const shSaved = shares(saved.cost);

  const ex = useMemo(() => {
    const res = [...Array(example.w).fill(1), ...Array(example.l).fill(-1), ...example.last];
    return withFormula(view, () => {
      const s = scoreOf(res);
      return { ...s, light: s.score * influencePoints('light'), strong: s.score * influencePoints('strong') };
    });
  }, [example, view]);

  // The plain-words effects table for section 4, worked out from the draft's numbers.
  const effects = (f) => {
    const c = f.cost;
    return [
      ['One side 1 point higher on a single stat (on average)', c.mix],
      ['One side 1 point higher in average strength only', c.level],
      ['One side 1 point higher in every stat (so also +1 OVR)', c.level + c.mix * STATS.length],
      ['One extra defender and one fewer midfielder on a side', c.positions * 2],
    ].map(([label, cost]) => ({ label, cost, lost: cost * c.scale }));
  };
  const effA = effects(saved);
  const effB = effects(draft);

  const v = (group, k, dp) => ({ v: fmt(draft[group][k], dp), moved: draft[group][k] !== saved[group][k] });

  function jump(id) {
    const el = document.getElementById(id);
    if (el && scroller.current) scroller.current.scrollTo({ top: el.offsetTop - 64, behavior: 'smooth' });
  }

  async function doSave() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    justSaved.current = draft;
    const r = confirm === 'undo' ? await onUndo() : await onSave(draft, note);
    setBusy(false);
    if (r && r.ok) {
      setConfirm(null);
      setNote('');
    } else setErr((r && r.message) || 'That did not save.');
  }

  const meta = formula.meta;
  const weightsRow = draft.weights[pos];
  const savedRow = saved.weights[pos];

  return (
    <div className="fx" ref={scroller}>
      <header className="fx-cover">
        <svg className="fx-lines" viewBox="0 0 300 300" fill="none" aria-hidden="true">
          <circle cx="150" cy="150" r="70" />
          <line x1="0" y1="150" x2="300" y2="150" />
          <rect x="95" y="0" width="110" height="45" />
          <rect x="95" y="255" width="110" height="45" />
        </svg>
        <button type="button" className="fx-back" onClick={onBack}>
          <Icon name="arrow-left" size={16} /> Back
        </button>
        <div className="fx-kicker">FUFA · Team formula</div>
        <h1>How teams are made</h1>
        <p className="fx-sub">Every number that decides the sides, laid out step by step. Move anything to see what it would do; nothing changes for the group until you save.</p>
        <div className="fx-meta">
          {meta && meta.on ? (
            <span>
              Last changed <b>{formatDate(meta.on)}</b>
              {meta.by ? (
                <>
                  {' '}
                  by <b>{meta.by}</b>
                </>
              ) : null}
              {meta.note ? <> · “{meta.note}”</> : null}
            </span>
          ) : (
            <span>
              <b>{isDefault(saved) ? 'The original formula' : 'Formula in use'}</b>
            </span>
          )}
        </div>
        <div className="fx-cover-actions">
          {!sameFormula(draft, DEFAULT_FORMULA) && (
            <Button variant="secondary" size="sm" icon={<Icon name="rotate-ccw" size={15} />} onClick={() => setDraft(cleanFormula(DEFAULT_FORMULA))}>
              Start from the original
            </Button>
          )}
          {prev && !changed && (
            <Button variant="secondary" size="sm" icon={<Icon name="history" size={15} />} onClick={() => setConfirm('undo')}>
              Undo last save
            </Button>
          )}
        </div>
      </header>

      <nav className="fx-steps" aria-label="Sections">
        {STEPS.map(([id, n, label]) => (
          <button key={id} type="button" onClick={() => jump(id)}>
            <span className="fx-steps-n">{n}</span>
            {label}
          </button>
        ))}
      </nav>

      <div className="fx-body">
        <div className="fx-edit">
          <Section
            id="fx-rate"
            num="1"
            title="Each player’s overall rating"
            where="model.js · overall()"
            lede="OVR is a weighted average of a player’s ten stats. Pick a position and drag: raising one stat lowers the rest in proportion, so it always adds up to 100%."
          >
            <div className="fx-postabs" role="tablist">
              {POSITION_KEYS.map((k) => {
                const dirty = STATS.some((s) => draft.weights[k][s] !== saved.weights[k][s]);
                return (
                  <button key={k} type="button" role="tab" aria-selected={pos === k} data-dirty={dirty ? '1' : '0'} onClick={() => setPos(k)}>
                    {SHORT[k]}
                  </button>
                );
              })}
            </div>
            <div className="fx-weights">
              {STATS.map((k) => (
                <Slider
                  key={k}
                  label={k}
                  value={weightsRow[k]}
                  saved={savedRow[k]}
                  min={0}
                  max={60}
                  unit="%"
                  onChange={(x) => setDraft((d) => ({ ...d, weights: { ...d.weights, [pos]: setWeight(d.weights[pos], k, x) } }))}
                />
              ))}
            </div>
            <div className="fx-row-actions">
              {STATS.some((k) => weightsRow[k] !== savedRow[k]) && (
                <Button variant="ghost" size="sm" onClick={() => setDraft((d) => ({ ...d, weights: { ...d.weights, [pos]: { ...savedRow } } }))}>
                  Put {SHORT[pos]} back
                </Button>
              )}
            </div>
            <Formula lines={[[{ k: 'OVR' }, ' = round( Σ stat × weight[' + SHORT[pos] + '] )']]} />
            {movers.length > 0 && (
              <div className="fx-callout fx-amber">
                <b>{movers.length} player{movers.length === 1 ? '’s' : 's’'} OVR would change.</b>{' '}
                {movers
                  .slice(0, 6)
                  .map((m) => m.p.name + ' ' + m.a + '→' + m.b)
                  .join(' · ')}
                {movers.length > 6 ? ' · …' : ''}
              </div>
            )}
          </Section>

          <Section
            id="fx-adjust"
            num="2"
            title="Strength: OVR nudged by results"
            where="strength.js · strengthOf()"
            lede="Only when Results in balancing is Light or Strong on the balance panel. Ratings themselves are never changed."
          >
            <div className="fx-grid2">
              <Slider label="Light: up to" value={draft.results.light} saved={saved.results.light} {...rng('results', 'light')} step={0.5} dp={1} unit=" pts" onChange={(x) => patch('results', 'light', x)} />
              <Slider label="Strong: up to" value={draft.results.strong} saved={saved.results.strong} {...rng('results', 'strong')} step={0.5} dp={1} unit=" pts" onChange={(x) => patch('results', 'strong', x)} />
              <Slider
                label="Pretend draws"
                hint="Damps short runs: a 2–0 start doesn’t read as a great player."
                value={draft.results.draws}
                saved={saved.results.draws}
                {...rng('results', 'draws')}
                onChange={(x) => patch('results', 'draws', x)}
              />
              <Slider label="Form window" hint="How many recent matches count as form." value={draft.results.form} saved={saved.results.form} {...rng('results', 'form')} unit=" matches" onChange={(x) => patch('results', 'form', x)} />
            </div>
            <Slider
              label="Record v form"
              hint={'Record ' + Math.round(draft.results.record * 100) + '% · form ' + Math.round((1 - draft.results.record) * 100) + '%'}
              value={Math.round(draft.results.record * 100)}
              saved={Math.round(saved.results.record * 100)}
              min={0}
              max={100}
              step={5}
              unit="% record"
              onChange={(x) => patch('results', 'record', x / 100)}
            />
            <Formula
              lines={[
                [{ k: 'strength' }, ' = OVR + P × score   ', { c: 'P = ' }, v('results', 'light', 1), { c: ' Light · ' }, v('results', 'strong', 1), { c: ' Strong' }],
                [{ k: 'record  ' }, ' = (W − L) / (W + L + ', v('results', 'draws'), ')'],
                [{ k: 'form    ' }, ' = (sum of last ', v('results', 'form'), ') / (games in it + 2)'],
                [{ k: 'score   ' }, ' = ', { v: fmt(draft.results.record, 2), moved: draft.results.record !== saved.results.record }, ' × record + ', { v: fmt(1 - draft.results.record, 2), moved: draft.results.record !== saved.results.record }, ' × form'],
              ]}
            />
            <div className="fx-example">
              <div className="fx-example-in">
                <b>Try it.</b>
                <span className="fx-stepper">
                  Earlier
                  <button type="button" aria-label="Fewer earlier wins" onClick={() => setExample((e) => ({ ...e, w: Math.max(0, e.w - 1) }))}>−</button>
                  <span>{example.w} W</span>
                  <button type="button" aria-label="More earlier wins" onClick={() => setExample((e) => ({ ...e, w: Math.min(40, e.w + 1) }))}>+</button>
                  <button type="button" aria-label="Fewer earlier losses" onClick={() => setExample((e) => ({ ...e, l: Math.max(0, e.l - 1) }))}>−</button>
                  <span>{example.l} L</span>
                  <button type="button" aria-label="More earlier losses" onClick={() => setExample((e) => ({ ...e, l: Math.min(40, e.l + 1) }))}>+</button>
                </span>
                <span className="fx-form">
                  Last five
                  {example.last.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      data-r={r > 0 ? 'w' : 'l'}
                      aria-label={'Match ' + (i + 1) + ': ' + (r > 0 ? 'win' : 'loss') + ', tap to change'}
                      onClick={() => setExample((e) => ({ ...e, last: e.last.map((x, j) => (j === i ? -x : x)) }))}
                    >
                      {r > 0 ? 'W' : 'L'}
                    </button>
                  ))}
                </span>
              </div>
              <div className="fx-example-out">
                {ex.won}–{ex.lost} overall · score <b>{ex.score.toFixed(2)}</b> → <b>{(ex.light >= 0 ? '+' : '') + ex.light.toFixed(1)}</b> on Light,{' '}
                <b>{(ex.strong >= 0 ? '+' : '') + ex.strong.toFixed(1)}</b> on Strong
              </div>
            </div>
          </Section>

          <Section id="fx-keepers" num="3" title="Keepers" where="model.js · pickKeepers()">
            <ol className="fx-ol">
              <li>
                The two strongest players listed as <span className="fx-tag">GK</span> go in goal, one per side.
              </li>
              <li>If there aren’t two, players with goalkeeper as a second position fill in, strongest first.</li>
              <li>
                Failing that, whoever has the highest <b>Goalkeeping</b> stat.
              </li>
            </ol>
            <p className="fx-muted">Not adjustable: keepers stay put during the search, and each Reshuffle swaps which side gets which.</p>
          </Section>

          <Section
            id="fx-score"
            num="4"
            title="How a split is scored"
            where="model.js · cost()"
            lede="Drag the two handles to share out what the balancer cares about. The more of the bar something has, the harder it works to keep the sides level on it."
          >
            <ShareBar value={sh} saved={shSaved} onChange={(s) => setDraft((d) => ({ ...d, cost: fromShares(d.cost, s) }))} />
            <Slider
              label="Score strictness"
              hint="How many balance points each unit of cost takes off the score out of 100. Changes the number shown, not the teams."
              value={draft.cost.scale}
              saved={saved.cost.scale}
              {...rng('cost', 'scale')}
              step={0.05}
              dp={2}
              onChange={(x) => patch('cost', 'scale', x)}
            />
            <Formula
              lines={[
                [{ k: 'cost' }, ' = ', v('cost', 'level', 2), ' × |average strength gap|'],
                ['     + ', v('cost', 'mix', 3), ' × Σ over 10 stats |average stat gap|'],
                ['     + ', v('cost', 'positions', 2), ' × Σ DEF, MID, ST |players out of step|'],
                [''],
                [{ k: 'balance' }, ' = 100 − ', v('cost', 'scale', 2), ' × cost'],
              ]}
            />
            <table className="fx-table">
              <thead>
                <tr>
                  <th>Difference between the sides</th>
                  <th className="fx-n">Score lost</th>
                </tr>
              </thead>
              <tbody>
                {effB.map((e, i) => {
                  const was = effA[i].lost;
                  const moved = Math.abs(was - e.lost) >= 0.05;
                  return (
                    <tr key={e.label}>
                      <td>{e.label}</td>
                      <td className="fx-n" data-trend={moved ? 'moved' : ''}>
                        {moved && <s>{was.toFixed(1)}</s>}
                        {e.lost.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Section>

          <Section
            id="fx-search"
            num="5"
            title="Searching for the best split"
            where="model.js · balance()"
            lede="Each start shuffles the squad, deals it out, then swaps players while any swap helps. More starts find better splits but take longer; Reshuffle picks at random among splits within the margin of the best."
          >
            <div className="fx-grid2">
              <Slider label="Starts tried" value={draft.search.starts} saved={saved.search.starts} {...rng('search', 'starts')} onChange={(x) => patch('search', 'starts', x)} />
              <Slider
                label="Near-equal margin"
                hint={'Within ' + (draft.search.near * draft.cost.scale).toFixed(1) + ' balance points of the best counts as as good.'}
                value={draft.search.near}
                saved={saved.search.near}
                {...rng('search', 'near')}
                step={0.05}
                dp={2}
                onChange={(x) => patch('search', 'near', x)}
              />
            </div>
          </Section>

          <Section
            id="fx-suggest"
            num="6"
            title="Rating suggestions"
            where="strength.js · ratingSuggestions()"
            lede="Separate from balancing. Each match gives each side a chance of winning from its ratings; a player whose sides keep beating or missing that, by more than luck, gets a suggestion on the Stats page."
          >
            <div className="fx-grid2">
              <Slider
                label="Odds scale"
                hint={'A 4-point gap makes the stronger side a ' + Math.round(100 / (1 + Math.exp(-4 / draft.suggest.odds))) + '% favourite.'}
                value={draft.suggest.odds}
                saved={saved.suggest.odds}
                {...rng('suggest', 'odds')}
                step={0.5}
                dp={1}
                onChange={(x) => patch('suggest', 'odds', x)}
              />
              <Slider label="Matches needed" value={draft.suggest.games} saved={saved.suggest.games} {...rng('suggest', 'games')} onChange={(x) => patch('suggest', 'games', x)} />
              <Slider label="How sure (z)" hint="2 means a gap that big would happen by luck about 1 time in 20." value={draft.suggest.z} saved={saved.suggest.z} {...rng('suggest', 'z')} step={0.1} dp={1} onChange={(x) => patch('suggest', 'z', x)} />
              <Slider label="Suggestion size" hint="Points suggested per unit of gap." value={draft.suggest.size} saved={saved.suggest.size} {...rng('suggest', 'size')} onChange={(x) => patch('suggest', 'size', x)} />
              <Slider label="Biggest suggestion" value={draft.suggest.cap} saved={saved.suggest.cap} {...rng('suggest', 'cap')} unit=" pts" onChange={(x) => patch('suggest', 'cap', x)} />
            </div>
            <div className="fx-callout">
              <b>
                {sugB} suggestion{sugB === 1 ? '' : 's'}
              </b>{' '}
              with these settings{sugA !== sugB ? ' (saved: ' + sugA + ')' : ''}.
            </div>
          </Section>

          <Section id="fx-quirks" num="!" title="Points worth weighing" lede="Four of these can be switched; two are here so they aren’t forgotten.">
            <div className="fx-quirks">
              <Quirk
                title="Leave keepers out of the stat mix"
                on={draft.switches.keepersOut}
                moved={draft.switches.keepersOut !== saved.switches.keepersOut}
                onChange={(x) => patch('switches', 'keepersOut', x)}
              >
                A keeper’s low outfield stats and high Goalkeeping pull their side’s averages about. On: stat averages compare players listed as outfielders only.
              </Quirk>
              <Quirk
                title="Results nudge sees stats too"
                on={draft.switches.nudgeStats}
                moved={draft.switches.nudgeStats !== saved.switches.nudgeStats}
                onChange={(x) => patch('switches', 'nudgeStats', x)}
              >
                Off, the nudge only moves the level part, so Strong moves teams less than its label suggests. On: it moves every stat as well.
              </Quirk>
              <Quirk title="Nudge accounts for teammates" on={draft.switches.odds} moved={draft.switches.odds !== saved.switches.odds} onChange={(x) => patch('switches', 'odds', x)}>
                Off, a low-rated player who keeps landing on strong sides is credited with those wins. On: each result counts by how far it beat the odds, as rating suggestions do.
              </Quirk>
              <Quirk title="Count FLEX and second positions" on={draft.switches.flex} moved={draft.switches.flex !== saved.switches.flex} onChange={(x) => patch('switches', 'flex', x)}>
                On: a FLEX player counts as half a midfielder, and a player with second positions counts two-thirds for their main one, the rest shared across the others.
              </Quirk>
              <Quirk title="Positions matter a lot">
                One extra defender and one fewer midfielder costs {effB[3].lost.toFixed(1)} balance points. Move the Positions share in section 4 to change that.
              </Quirk>
              <Quirk title="Uneven numbers aren’t penalised">Everything uses averages, so a side that’s a player short isn’t treated as weaker for it.</Quirk>
            </div>
          </Section>

          {changed && (
            <Section id="fx-changes" num="Δ" title="Your changes">
              <table className="fx-table">
                <thead>
                  <tr>
                    <th>What</th>
                    <th className="fx-n">Saved</th>
                    <th className="fx-n">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((c) => (
                    <tr key={c.key}>
                      <td>{c.label}</td>
                      <td className="fx-n">{c.from}</td>
                      <td className="fx-n" data-trend="moved">
                        {c.to}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}
        </div>

        <aside className="fx-preview" id="fx-preview">
          <div className="fx-card">
            <h3>This week’s teams</h3>
            <TeamsPreview saved={saved} draft={view} squad={squad} weeks={weeks} players={players} influence={influence} changed={changed} />
          </div>
          <div className="fx-card">
            <h3>Past results</h3>
            <ResultsPreview saved={saved} draft={view} weeks={weeks} players={players} changed={changed} />
          </div>
          <div className="fx-card">
            <h3>Across all squads</h3>
            <Benchmark saved={saved} draft={view} players={players} weeks={weeks} teamSize={teamSize} influence={influence} changed={changed} />
          </div>
        </aside>
      </div>

      <div className="fx-bar" data-on={changed ? '1' : '0'}>
        <span className="fx-bar-count">
          {changed ? (
            <>
              <b>{changes.length}</b> change{changes.length === 1 ? '' : 's'} not saved
            </>
          ) : (
            'No changes'
          )}
        </span>
        <span className="fx-bar-actions">
          <Button variant="ghost" size="sm" className="fx-bar-preview" onClick={() => jump('fx-preview')}>
            Preview
          </Button>
          <Button variant="secondary" size="sm" disabled={!changed} onClick={() => setDraft(saved)}>
            Discard
          </Button>
          <Button variant="primary" size="sm" disabled={!changed} onClick={() => setConfirm('save')}>
            Save…
          </Button>
        </span>
      </div>

      {confirm && (
        <Dialog
          open
          title={confirm === 'undo' ? 'Undo the last formula change?' : 'Save the new formula?'}
          onClose={() => !busy && setConfirm(null)}
          footer={
            <>
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" disabled={busy || (confirm === 'save' && !note.trim())} onClick={doSave}>
                {busy ? 'Backing up…' : confirm === 'undo' ? 'Undo it' : 'Save for everyone'}
              </Button>
            </>
          }
        >
          <div className="fx-confirm">
            {confirm === 'undo' ? (
              <p>
                Goes back to the formula from before the last save
                {prev && prev.meta && prev.meta.note ? ' (“' + prev.meta.note + '”)' : ''}. Doing it again swaps back.
              </p>
            ) : (
              <>
                <p>
                  {changes.length} change{changes.length === 1 ? '' : 's'}. Everyone’s teams are made with this from the next balance.
                </p>
                {movers.length > 0 ? (
                  <>
                    <h4>Who moves</h4>
                    <ul className="fx-movers">
                      {movers.map((m) => (
                        <li key={m.p.id}>
                          <span>{m.p.name}</span>
                          <span className="fx-n">
                            {m.a} → <b>{m.b}</b> <i data-up={m.b > m.a ? '1' : '0'}>{(m.b > m.a ? '+' : '') + (m.b - m.a)}</i>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="fx-muted">Nobody’s OVR changes.</p>
                )}
                <label className="fx-note">
                  <span>Why the change? (goes in the change history)</span>
                  <input value={note} maxLength={140} autoFocus placeholder="e.g. Positions were counting for too much" onChange={(e) => setNote(e.target.value)} />
                </label>
              </>
            )}
            <p className="fx-muted">A backup of the shared data is taken first, so this can be undone from Backups &amp; history too.</p>
            {err && <p className="fx-err">{err}</p>}
          </div>
        </Dialog>
      )}
    </div>
  );
}

function rng(group, k) {
  const [min, max] = RANGES[group][k];
  return { min, max };
}

