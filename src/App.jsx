import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Icon, Switch } from './ds/index.js';
import ImportDialog from './components/ImportDialog.jsx';
import Metrics from './components/Metrics.jsx';
import Pitch from './components/Pitch.jsx';
import PlayerEditor from './components/PlayerEditor.jsx';
import RosterPanel from './components/RosterPanel.jsx';
import ShareDialog from './components/ShareDialog.jsx';
import StatLadder from './components/StatLadder.jsx';
import StatsTable from './components/StatsTable.jsx';
import { exportBoard } from './lib/exportBoard.js';
import { DEFAULT_STATS, balance, layout, relax } from './lib/model.js';
import { samplePlayers } from './lib/samplePlayers.js';
import { loadSaved, save } from './lib/storage.js';

const NARROW = '(max-width:760px)';
const isNarrow = () => window.matchMedia(NARROW).matches;

function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

// Header pill switch — used for the page and for the match format.
function Segmented({ options, value, onChange, className }) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        gap: 2,
        background: 'var(--color-surface-sunken)',
        borderRadius: 'var(--radius-sm)',
        padding: 2,
        flexShrink: 0,
      }}
    >
      {options.map(([v, label]) => {
        const on = value === v;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(v)}
            style={{
              cursor: 'pointer',
              border: 'none',
              borderRadius: 'var(--radius-xs)',
              padding: '6px 12px',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-semibold)',
              background: on ? 'var(--color-surface)' : 'transparent',
              color: on ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: on ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function App() {
  const saved = useMemo(loadSaved, []);
  const [players, setPlayers] = useState(saved ? saved.players : samplePlayers);
  const [teamSize, setTeamSize] = useState(saved && saved.teamSize ? saved.teamSize : 5);
  const [selected, setSelected] = useState(
    saved && saved.selected ? saved.selected : samplePlayers.slice(0, 10).map((p) => p.id)
  );
  const [teams, setTeams] = useState({ red: [], blue: [] });
  const [pos, setPos] = useState({});
  const [showStats, setShowStats] = useState(false);
  const [pngRatings, setPngRatings] = useState(true);
  // Kick-off time and pitch carry over between sessions; the date always starts at today
  // so last week's fixture can never be pasted by accident.
  const [match, setMatch] = useState(() => ({
    date: todayISO(),
    time: (saved && saved.match && saved.match.time) || '19:30',
    venue: (saved && saved.match && saved.match.venue) || '',
  }));
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState(null);
  const [seed, setSeed] = useState(0);
  const [importing, setImporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [queue, setQueue] = useState([]);
  const [narrow, setNarrow] = useState(isNarrow);
  const [view, setView] = useState('squad');
  const [page, setPage] = useState('balancer');

  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const h = (e) => setNarrow(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const pitchRef = useRef(null);
  const drag = useRef(null);
  const needed = teamSize * 2;

  useEffect(() => {
    save({ players, teamSize, selected, match: { time: match.time, venue: match.venue } });
  }, [players, teamSize, selected, match.time, match.venue]);

  const teamOf = useMemo(() => {
    const m = {};
    teams.red.forEach((p) => {
      m[p.id] = 'red';
    });
    teams.blue.forEach((p) => {
      m[p.id] = 'blue';
    });
    return m;
  }, [teams]);

  const built = teams.red.length > 0;

  function resetBoard() {
    setTeams({ red: [], blue: [] });
    setPos({});
    setSel(null);
  }

  function build(nextSeed) {
    const pool = players.filter((p) => selected.includes(p.id));
    if (pool.length !== needed) return;
    const s = nextSeed == null ? seed : nextSeed;
    const t = balance(pool, teamSize, s);
    setTeams(t);
    setPos(relax(Object.assign({}, layout(t.red, 'red'), layout(t.blue, 'blue'))));
    setSel(null);
    if (isNarrow()) setView('board');
  }

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    resetBoard();
  }

  function removePlayer(id) {
    setPlayers((ps) => ps.filter((p) => p.id !== id));
    setSelected((s) => s.filter((x) => x !== id));
    resetBoard();
  }

  // Inline edits from the stats table. Any change to a rating makes the current
  // split stale, so the board clears once and stays clear until you re-balance.
  function patchPlayer(id, patch) {
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    if (teams.red.length) resetBoard();
  }

  function advanceQueue() {
    const rest = queue.slice(1);
    setQueue(rest);
    setDraft(rest.length ? { ...rest[0], stats: { ...rest[0].stats }, alt: [...(rest[0].alt || [])] } : null);
  }

  function saveDraft() {
    setPlayers((ps) => {
      if (draft.id) return ps.map((p) => (p.id === draft.id ? draft : p));
      const id = Math.max(0, ...ps.map((p) => p.id)) + 1;
      return [...ps, { ...draft, id }];
    });
    resetBoard();
    if (queue.length) advanceQueue();
    else setDraft(null);
  }

  function closeDraft() {
    if (queue.length) advanceQueue();
    else setDraft(null);
  }

  // Matched names keep their saved stats; unmatched ones are created at 60 and queued for editing.
  function applyImport(rows) {
    setImporting(false);
    const existingIds = rows.filter((r) => r.matchId).map((r) => r.matchId);
    const fresh = [];
    let nextId = Math.max(0, ...players.map((p) => p.id));
    rows
      .filter((r) => !r.matchId)
      .forEach((r) => {
        nextId += 1;
        fresh.push({ id: nextId, name: r.name, pos: r.pos || 'Any', alt: [], stats: { ...DEFAULT_STATS } });
      });
    setPlayers((ps) => [...ps, ...fresh]);
    setSelected(Array.from(new Set([...existingIds, ...fresh.map((p) => p.id)])));
    resetBoard();
    setQueue(fresh);
    if (fresh.length) setDraft({ ...fresh[0], stats: { ...fresh[0].stats }, alt: [] });
  }

  // Pins drag freely; a tap selects, and a tap on an opponent swaps the two.
  function onPinDown(e, p, team) {
    e.preventDefault();
    drag.current = { id: p.id, team, moved: false, x0: e.clientX, y0: e.clientY };
    const move = (ev) => {
      const d = drag.current;
      if (!d) return;
      if (Math.abs(ev.clientX - d.x0) > 4 || Math.abs(ev.clientY - d.y0) > 4) d.moved = true;
      if (!d.moved) return;
      const r = pitchRef.current.getBoundingClientRect();
      const x = Math.max(4, Math.min(96, ((ev.clientX - r.left) / r.width) * 100));
      const y = Math.max(3, Math.min(97, ((ev.clientY - r.top) / r.height) * 100));
      setPos((pv) => ({ ...pv, [d.id]: { x, y } }));
    };
    const detach = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
    const cancel = () => {
      drag.current = null;
      detach();
    };
    const up = () => {
      const d = drag.current;
      drag.current = null;
      detach();
      if (!d || d.moved) return;
      if (sel && sel.team !== d.team) swap(sel, { id: d.id, team: d.team });
      else setSel(sel && sel.id === d.id ? null : { id: d.id, team: d.team });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  }

  function swap(a, b) {
    const A = teams[a.team].find((p) => p.id === a.id);
    const Bp = teams[b.team].find((p) => p.id === b.id);
    setTeams((t) => ({
      red: t.red.map((p) => (p.id === A.id ? Bp : p.id === Bp.id ? A : p)),
      blue: t.blue.map((p) => (p.id === A.id ? Bp : p.id === Bp.id ? A : p)),
    }));
    setPos((pv) => ({ ...pv, [A.id]: pv[Bp.id], [Bp.id]: pv[A.id] }));
    setSel(null);
  }

  return (
    <div className="tb-shell">
      <header className="tb-head">
        <div className="tb-brand" style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--weight-bold)',
              fontSize: 'var(--text-2xl)',
              letterSpacing: 'var(--tracking-tight)',
              color: 'var(--color-primary)',
              lineHeight: 1,
            }}
          >
            FUFA
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--weight-semibold)',
              fontSize: 'var(--text-xl)',
              color: 'var(--color-text-primary)',
              lineHeight: 1,
            }}
          >
            Team balancer
          </span>
        </div>
        <Segmented
          className="tb-pageswitch"
          options={[
            ['balancer', 'Balancer'],
            ['stats', 'Player stats'],
            ['ladder', 'Stat ladder'],
          ]}
          value={page}
          onChange={setPage}
        />
        {page === 'balancer' && (
          <Segmented
            className="tb-fmt"
            options={[5, 6].map((n) => [n, n + '-a-side'])}
            value={teamSize}
            onChange={(n) => {
              setTeamSize(n);
              resetBoard();
            }}
          />
        )}
        <div className="tb-spacer" style={{ flex: 1 }} />
        {page === 'balancer' && (
        <div className="tb-actions">
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="clipboard-list" size={15} />}
            onClick={() => setImporting(true)}
          >
            Paste list
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="message-circle" size={15} />}
            disabled={!built}
            onClick={() => setSharing(true)}
          >
            WhatsApp text
          </Button>
          <Switch checked={showStats} onChange={(e) => setShowStats(e.target.checked)} label="Stat labels" />
          <Switch checked={pngRatings} onChange={(e) => setPngRatings(e.target.checked)} label="PNG ratings" />
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="download" size={15} />}
            disabled={!built}
            onClick={() => exportBoard(teams, pos, pngRatings)}
          >
            Export PNG
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="shuffle" size={15} />}
            disabled={!built}
            onClick={() => {
              const s = seed + 1;
              setSeed(s);
              build(s);
            }}
          >
            Reshuffle
          </Button>
          <Button variant="primary" size="sm" disabled={selected.length !== needed} onClick={() => build()}>
            {built ? 'Re-balance' : 'Balance teams'}
          </Button>
        </div>
        )}
      </header>

      {page === 'ladder' ? (
        <StatLadder players={players} selected={selected} onPatch={patchPlayer} />
      ) : page === 'stats' ? (
        <StatsTable
          players={players}
          selected={selected}
          onPatch={patchPlayer}
          onEdit={(p) => setDraft({ ...p, stats: { ...p.stats }, alt: [...(p.alt || [])] })}
          onDelete={removePlayer}
          onAdd={() => setDraft({ name: '', pos: 'Midfielder', alt: [], stats: { ...DEFAULT_STATS } })}
        />
      ) : (
      <main className="tb-main" data-view={narrow ? view : 'all'}>
        <section className="tb-pane tb-pane-squad" style={{ minHeight: 0 }}>
          <RosterPanel
            players={players}
            selected={selected}
            teamOf={teamOf}
            needed={needed}
            onToggle={toggle}
            onEdit={(p) => setDraft({ ...p, stats: { ...p.stats }, alt: [...(p.alt || [])] })}
            onDelete={removePlayer}
            onAdd={() => setDraft({ name: '', pos: 'Midfielder', alt: [], stats: { ...DEFAULT_STATS } })}
          />
        </section>

        <section
          className="tb-pane tb-pane-board"
          style={{ minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
        >
          {built ? (
            <>
              <div style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', justifyContent: 'center' }}>
                <Pitch
                  teams={teams}
                  pos={pos}
                  showStats={showStats}
                  sel={sel}
                  onPinDown={onPinDown}
                  pitchRef={pitchRef}
                />
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-2xs)',
                  color: 'var(--color-text-tertiary)',
                  letterSpacing: 'var(--tracking-wide)',
                  textAlign: 'center',
                }}
              >
                {sel
                  ? 'Tap an opposing player to swap · drag to reposition'
                  : 'Drag pins to reposition · tap a pin then tap an opponent to swap'}
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                border: '1px dashed var(--color-border-strong)',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-surface)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--weight-semibold)',
                  color: 'var(--color-text-primary)',
                }}
              >
                No teams yet
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  maxWidth: 280,
                  textAlign: 'center',
                  lineHeight: 'var(--leading-normal)',
                }}
              >
                Pick {needed} players — everyone else sits on the bench — then balance to fill the board.
              </div>
            </div>
          )}
        </section>

        <aside
          className="tb-aside tb-pane tb-pane-stats"
          style={{
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Metrics teams={teams} />
        </aside>
      </main>
      )}

      <nav className="tb-tabs">
        {[
          ['squad', 'users', 'Squad'],
          ['board', 'layout-grid', 'Board'],
          ['stats', 'bar-chart-2', 'Balance'],
        ].map(([k, ic, label]) => (
          <button
            key={k}
            type="button"
            data-on={page === 'balancer' && view === k ? '1' : '0'}
            onClick={() => {
              setPage('balancer');
              setView(k);
            }}
          >
            <Icon name={ic} size={19} />
            <span>{label}</span>
          </button>
        ))}
        <button type="button" data-on={page === 'stats' ? '1' : '0'} onClick={() => setPage('stats')}>
          <Icon name="table" size={19} />
          <span>Table</span>
        </button>
        <button type="button" data-on={page === 'ladder' ? '1' : '0'} onClick={() => setPage('ladder')}>
          <Icon name="sliders-vertical" size={19} />
          <span>Ladder</span>
        </button>
      </nav>

      <PlayerEditor
        draft={draft}
        onChange={setDraft}
        onSave={saveDraft}
        onClose={closeDraft}
        queueNote={queue.length ? 'New from list · ' + queue.length + ' left' : null}
      />
      {importing && <ImportDialog players={players} onCancel={() => setImporting(false)} onConfirm={applyImport} />}
      {sharing && (
        <ShareDialog teams={teams} match={match} onMatchChange={setMatch} onClose={() => setSharing(false)} />
      )}
    </div>
  );
}
