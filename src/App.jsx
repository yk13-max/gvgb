import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dialog, Icon, IconButton, Switch } from './ds/index.js';
import History from './components/History.jsx';
import ImportDialog from './components/ImportDialog.jsx';
import Metrics from './components/Metrics.jsx';
import Pitch from './components/Pitch.jsx';
import PlayerEditor from './components/PlayerEditor.jsx';
import RecordResultDialog from './components/RecordResultDialog.jsx';
import RosterPanel from './components/RosterPanel.jsx';
import WeekAwardsDialog from './components/WeekAwardsDialog.jsx';
import ShareDialog from './components/ShareDialog.jsx';
import StatLadder from './components/StatLadder.jsx';
import StatsTable from './components/StatsTable.jsx';
import { exportJSON, readBackupFile } from './lib/backup.js';
import { exportBoard } from './lib/exportBoard.js';
import { DEFAULT_STATS, balance, layout, relax } from './lib/model.js';
import { samplePlayers } from './lib/samplePlayers.js';
import { loadSaved, save } from './lib/storage.js';
import { putMatch } from './lib/weeks.js';

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

// Label first, switch pinned to the right edge — a switch reads as a settings row here,
// not as the inline control it is in the desktop header.
const SWITCH_ROW = {
  width: '100%',
  minHeight: 44,
  flexDirection: 'row-reverse',
  justifyContent: 'space-between',
  fontSize: 'var(--text-sm)',
};

// A full-width row in the phone's actions sheet. Everything the header holds on a
// desktop lives here instead, stacked, so nothing has to be scrolled sideways to reach.
function MenuRow({ icon, label, disabled, onClick }) {
  return (
    <button type="button" className="tb-menu-row" disabled={disabled} onClick={onClick}>
      <Icon name={icon} size={17} />
      <span>{label}</span>
    </button>
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
  const [pngSummary, setPngSummary] = useState(false);
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
  const [mini, setMini] = useState(() => !!(saved && saved.mini));
  const [history, setHistory] = useState(() => (saved && Array.isArray(saved.history) ? saved.history : []));
  const [recording, setRecording] = useState(null); // null | {} for a new match | { week, match } to edit
  const [awarding, setAwarding] = useState(null); // the week whose nominations are open
  const [notice, setNotice] = useState(null);
  const [menu, setMenu] = useState(false); // the phone's actions sheet
  const [dataMenu, setDataMenu] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const h = (e) => setNarrow(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const pitchRef = useRef(null);
  const drag = useRef(null);
  const fileRef = useRef(null);
  const needed = teamSize * 2;

  useEffect(() => {
    save({ players, teamSize, selected, history, mini, match: { time: match.time, venue: match.venue } });
  }, [players, teamSize, selected, history, mini, match.time, match.venue]);

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
    setDraft(
      rest.length
        ? { ...rest[0], stats: { ...rest[0].stats }, alt: [...(rest[0].alt || [])], nicknames: [...(rest[0].nicknames || [])] }
        : null
    );
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
        fresh.push({ id: nextId, name: r.name, pos: r.pos || 'Any', alt: [], nicknames: [], stats: { ...DEFAULT_STATS } });
      });
    setPlayers((ps) => [...ps, ...fresh]);
    setSelected(Array.from(new Set([...existingIds, ...fresh.map((p) => p.id)])));
    resetBoard();
    setQueue(fresh);
    if (fresh.length) setDraft({ ...fresh[0], stats: { ...fresh[0].stats }, alt: [], nicknames: [] });
  }

  // A match belongs to the week matching its date; recording one creates that week
  // and snapshots what every player who turned out was rated at the time.
  function saveResult(entry) {
    const next = putMatch(history, { ...entry, players });
    setHistory(next);
    setRecording(null);
    setPage('history');
    // Ask for the week's nominations once it has a result to nominate from. Only on a
    // newly recorded match — editing a score shouldn't re-open the prompt every time.
    const week = next.find((w) => w.date === entry.date);
    if (entry.isNew && week && !Object.keys(week.awards).some((k) => week.awards[k] != null)) setAwarding(week);
  }

  function saveAwards(weekId, awards) {
    setHistory((h) => h.map((w) => (w.id === weekId ? { ...w, awards } : w)));
    setAwarding(null);
  }

  function deleteMatch(weekId, matchId) {
    setHistory((h) =>
      h
        .map((w) => (w.id === weekId ? { ...w, matches: w.matches.filter((m) => m.id !== matchId) } : w))
        .filter((w) => w.matches.length)
    );
  }

  function deleteWeek(weekId) {
    setHistory((h) => h.filter((w) => w.id !== weekId));
  }

  // Everything the app keeps, written to one file.
  function exportAll() {
    exportJSON({ players, history, teamSize, selected, mini, match });
  }

  const dataRows = (close) => (
    <>
      <MenuRow
        icon="file-json"
        label="Export all data"
        onClick={() => {
          close();
          exportAll();
        }}
      />
      <MenuRow
        icon="upload"
        label="Import data"
        onClick={() => {
          close();
          if (fileRef.current) fileRef.current.click();
        }}
      />
    </>
  );

  function pickBackupFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // let the same file be picked again after a cancelled import
    if (file) readBackupFile(file, applyBackup);
  }

  // An import replaces what's here outright, so it always asks first.
  function applyBackup(result, filename) {
    if (result.error) {
      setNotice({ title: 'Import failed', text: result.error });
      return;
    }
    const weeks = result.history.length;
    const holds = [
      result.players.length + ' player' + (result.players.length === 1 ? '' : 's'),
      weeks ? weeks + ' game week' + (weeks === 1 ? '' : 's') : null,
    ]
      .filter(Boolean)
      .join(' and ');
    setNotice({
      title: 'Replace everything?',
      text:
        filename +
        ' holds ' +
        holds +
        '. This replaces the current ' +
        players.length +
        ' player(s)' +
        (history.length ? ' and ' + history.length + ' game week(s)' : '') +
        ' — export first if you want a copy.',
      confirmLabel: 'Replace data',
      onConfirm: () => {
        setPlayers(result.players);
        // A backup carries its own squad selection; a bare player list doesn't, and
        // ids from elsewhere would select the wrong people, so that starts empty.
        setSelected(result.selected || []);
        if (weeks) setHistory(result.history);
        if (result.teamSize) setTeamSize(result.teamSize);
        if (result.mini != null) setMini(result.mini);
        if (result.match) setMatch((m) => ({ ...m, time: result.match.time || m.time, venue: result.match.venue }));
        resetBoard();
        setNotice(null);
      },
    });
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
            ['history', 'History'],
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
          <Switch checked={pngSummary} onChange={(e) => setPngSummary(e.target.checked)} label="PNG summary" />
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="trophy" size={15} />}
            disabled={!built}
            onClick={() => setRecording({})}
          >
            Record result
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="download" size={15} />}
            disabled={!built}
            onClick={() => exportBoard(teams, pos, { ratings: pngRatings, summary: pngSummary })}
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
        {/* Backup lives on every page, but as one button — the balancer's header is
            already the widest thing here. */}
        <div className="tb-data">
          <IconButton
            icon={<Icon name="file-json" size={16} />}
            aria-label="Data"
            aria-expanded={dataMenu}
            variant="secondary"
            size="sm"
            onClick={() => setDataMenu(true)}
          />
        </div>
        {/* Phone: one primary action plus a sheet holding the rest, so nothing in the
            header has to be scrolled sideways to be found. */}
        <div className="tb-mobilebar">
          <IconButton
            icon={<Icon name="more-horizontal" size={19} />}
            aria-label="More actions"
            aria-expanded={menu}
            variant="secondary"
            size="sm"
            onClick={() => setMenu(true)}
          />
          {page === 'balancer' && (
            <Button variant="primary" size="sm" disabled={selected.length !== needed} onClick={() => build()}>
              {built ? 'Re-balance' : 'Balance teams'}
            </Button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={pickBackupFile}
          style={{ display: 'none' }}
        />
      </header>

      {page === 'history' ? (
        <History
          weeks={history}
          players={players}
          onAwards={(w) => setAwarding(w)}
          onEditMatch={(week, match) => setRecording({ week, match })}
          onDeleteMatch={deleteMatch}
          onDeleteWeek={deleteWeek}
        />
      ) : page === 'ladder' ? (
        <StatLadder players={players} selected={selected} onPatch={patchPlayer} />
      ) : page === 'stats' ? (
        <StatsTable
          players={players}
          selected={selected}
          onPatch={patchPlayer}
          onEdit={(p) => setDraft({ ...p, stats: { ...p.stats }, alt: [...(p.alt || [])], nicknames: [...(p.nicknames || [])] })}
          onDelete={removePlayer}
          onAdd={() => setDraft({ name: '', pos: 'Midfielder', alt: [], nicknames: [], stats: { ...DEFAULT_STATS } })}
          onExport={exportAll}
          onImport={applyBackup}
        />
      ) : (
      <main className="tb-main" data-view={narrow ? view : 'all'}>
        <section className="tb-pane tb-pane-squad" style={{ minHeight: 0 }}>
          <RosterPanel
            players={players}
            selected={selected}
            teamOf={teamOf}
            needed={needed}
            mini={mini}
            onMiniChange={setMini}
            onToggle={toggle}
            onEdit={(p) => setDraft({ ...p, stats: { ...p.stats }, alt: [...(p.alt || [])], nicknames: [...(p.nicknames || [])] })}
            onDelete={removePlayer}
            onAdd={() => setDraft({ name: '', pos: 'Midfielder', alt: [], nicknames: [], stats: { ...DEFAULT_STATS } })}
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
        <button type="button" data-on={page === 'history' ? '1' : '0'} onClick={() => setPage('history')}>
          <Icon name="history" size={19} />
          <span>History</span>
        </button>
      </nav>

      {menu && (
        <Dialog
          open
          title="Actions"
          onClose={() => setMenu(false)}
          footer={
            <Button variant="secondary" size="sm" onClick={() => setMenu(false)}>
              Close
            </Button>
          }
        >
          <div className="tb-menu">
            {page === 'balancer' && (
              <>
                <div className="tb-menu-group">
                  <div className="tb-menu-label">Format</div>
                  <Segmented
                    className="tb-menu-seg"
                    options={[5, 6].map((n) => [n, n + '-a-side'])}
                    value={teamSize}
                    onChange={(n) => {
                      setTeamSize(n);
                      resetBoard();
                    }}
                  />
                </div>

                <div className="tb-menu-group">
                  <div className="tb-menu-label">Squad</div>
                  <MenuRow
                    icon="clipboard-list"
                    label="Paste list"
                    onClick={() => {
                      setMenu(false);
                      setImporting(true);
                    }}
                  />
                  <MenuRow
                    icon="shuffle"
                    label="Reshuffle teams"
                    disabled={!built}
                    onClick={() => {
                      setMenu(false);
                      const s = seed + 1;
                      setSeed(s);
                      build(s);
                    }}
                  />
                </div>

                <div className="tb-menu-group">
                  <div className="tb-menu-label">Share &amp; record</div>
                  <MenuRow
                    icon="message-circle"
                    label="WhatsApp text"
                    disabled={!built}
                    onClick={() => {
                      setMenu(false);
                      setSharing(true);
                    }}
                  />
                  <MenuRow
                    icon="download"
                    label="Export PNG"
                    disabled={!built}
                    onClick={() => {
                      setMenu(false);
                      exportBoard(teams, pos, { ratings: pngRatings, summary: pngSummary });
                    }}
                  />
                  <MenuRow
                    icon="trophy"
                    label="Record result"
                    disabled={!built}
                    onClick={() => {
                      setMenu(false);
                      setRecording({});
                    }}
                  />
                </div>

                <div className="tb-menu-group">
                  <div className="tb-menu-label">Board &amp; image</div>
                  <Switch
                    style={SWITCH_ROW}
                    checked={showStats}
                    onChange={(e) => setShowStats(e.target.checked)}
                    label="Stat labels on pins"
                  />
                  <Switch
                    style={SWITCH_ROW}
                    checked={pngRatings}
                    onChange={(e) => setPngRatings(e.target.checked)}
                    label="Ratings in the PNG"
                  />
                  <Switch
                    style={SWITCH_ROW}
                    checked={pngSummary}
                    onChange={(e) => setPngSummary(e.target.checked)}
                    label="Team stats under the PNG"
                  />
                </div>
              </>
            )}

            <div className="tb-menu-group">
              <div className="tb-menu-label">Data</div>
              {dataRows(() => setMenu(false))}
            </div>
          </div>
        </Dialog>
      )}

      {dataMenu && (
        <Dialog
          open
          title="Data"
          onClose={() => setDataMenu(false)}
          footer={
            <Button variant="secondary" size="sm" onClick={() => setDataMenu(false)}>
              Close
            </Button>
          }
        >
          <div className="tb-menu">
            <div className="tb-menu-note">
              One file holds the whole app: the roster, the game weeks and their ratings snapshots,
              the current squad and format, and the kick-off details. Importing replaces all of it.
            </div>
            <div className="tb-menu-group">{dataRows(() => setDataMenu(false))}</div>
          </div>
        </Dialog>
      )}

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
      {recording && (
        <RecordResultDialog
          teams={teams}
          teamSize={teamSize}
          match={match}
          weeks={history}
          existing={
            recording.week
              ? {
                  date: recording.week.date,
                  venue: recording.week.venue,
                  teamSize: recording.week.teamSize,
                  match: recording.match,
                }
              : null
          }
          onSave={saveResult}
          onClose={() => setRecording(null)}
        />
      )}
      {awarding && (
        <WeekAwardsDialog
          week={history.find((w) => w.id === awarding.id) || awarding}
          onSave={saveAwards}
          onClose={() => setAwarding(null)}
        />
      )}
      {notice && (
        <Dialog
          open
          title={notice.title}
          onClose={() => setNotice(null)}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setNotice(null)}>
                {notice.onConfirm ? 'Cancel' : 'Close'}
              </Button>
              {notice.onConfirm && (
                <Button variant="danger" size="sm" onClick={notice.onConfirm}>
                  {notice.confirmLabel}
                </Button>
              )}
            </>
          }
        >
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
              lineHeight: 'var(--leading-normal)',
            }}
          >
            {notice.text}
          </div>
        </Dialog>
      )}
    </div>
  );
}
