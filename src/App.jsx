import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import Standings from './components/Standings.jsx';
import StatLadder from './components/StatLadder.jsx';
import StatsTable from './components/StatsTable.jsx';
import SyncDialog, { syncLook } from './components/SyncDialog.jsx';
import { exportJSON, readBackupFile } from './lib/backup.js';
import { buildDoc, parseDoc } from './lib/doc.js';
import { exportBoard } from './lib/exportBoard.js';
import { DEFAULT_STATS, balance, layout, relax } from './lib/model.js';
import { samplePlayers } from './lib/samplePlayers.js';
import { loadCache, loadPrefs, saveCache, savePrefs } from './lib/storage.js';
import { useSync } from './lib/useSync.js';
import { putMatch } from './lib/weeks.js';

const NARROW = '(max-width:760px)';
const isNarrow = () => window.matchMedia(NARROW).matches;

function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

// One document in, one set of app state out — used both when a document arrives from the
// server and when working out what this app *would* save, so the two can never drift and
// read as an edit nobody made.
function stateFromDoc(parsed) {
  const today = todayISO();
  const m = parsed.match || {};
  return {
    players: parsed.players,
    history: parsed.history,
    teamSize: parsed.teamSize || 5,
    selected: parsed.selected || [],
    // A fixture whose date has already been and gone rolls forward to today, so last
    // week's date can never be pasted into the chat by accident.
    match: {
      date: m.date && m.date >= today ? m.date : today,
      time: m.time || '19:30',
      venue: m.venue || '',
    },
    teams: { red: parsed.board.red, blue: parsed.board.blue },
    pos: parsed.board.pos,
  };
}

// Header pill switch — used for the page and for the match format.
function Segmented({ options, value, onChange, className, disabled }) {
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
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {options.map(([v, label]) => {
        const on = value === v;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onChange(v)}
            style={{
              cursor: disabled ? 'not-allowed' : 'pointer',
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
  // The cache is only what we last saw: something to render while /api/data answers, and
  // the whole story when there is no backend to answer.
  const start = useMemo(() => {
    const cached = loadCache();
    return stateFromDoc(
      cached || {
        players: samplePlayers,
        history: [],
        teamSize: 5,
        selected: samplePlayers.slice(0, 10).map((p) => p.id),
        match: null,
        board: { red: [], blue: [], pos: {} },
      }
    );
  }, []);

  const [players, setPlayers] = useState(start.players);
  const [teamSize, setTeamSize] = useState(start.teamSize);
  const [selected, setSelected] = useState(start.selected);
  const [teams, setTeams] = useState(start.teams);
  const [pos, setPos] = useState(start.pos);
  const [showStats, setShowStats] = useState(false);
  const [pngRatings, setPngRatings] = useState(true);
  const [pngSummary, setPngSummary] = useState(false);
  const [match, setMatch] = useState(start.match);
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState(null);
  const [seed, setSeed] = useState(0);
  const [importing, setImporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [queue, setQueue] = useState([]);
  const [narrow, setNarrow] = useState(isNarrow);
  const [view, setView] = useState('squad');
  const [page, setPage] = useState('balancer');
  // The squad view is a preference belonging to this browser, not to the group — toggling
  // it on a phone has no business changing what everyone else is looking at.
  const [mini, setMini] = useState(() => loadPrefs().mini);
  const [history, setHistory] = useState(start.history);
  const [recording, setRecording] = useState(null); // null | {} for a new match | { week, match } to edit
  const [awarding, setAwarding] = useState(null); // the week whose nominations are open
  const [notice, setNotice] = useState(null);
  const [menu, setMenu] = useState(false); // the phone's actions sheet
  const [dataMenu, setDataMenu] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

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

  // Everything the group shares, as one value. Anything not in here — the squad view, the
  // PNG switches, which page you are on — belongs to this browser alone.
  const doc = useMemo(
    () => buildDoc({ players, history, teamSize, selected, match, teams, pos }),
    [players, history, teamSize, selected, match, teams, pos]
  );

  const applyDoc = useCallback((parsed) => {
    const s = stateFromDoc(parsed);
    setPlayers(s.players);
    setHistory(s.history);
    setTeamSize(s.teamSize);
    setSelected(s.selected);
    setMatch(s.match);
    setTeams(s.teams);
    setPos(s.pos);
    setSel(null);
    setDraft(null);
    setQueue([]);
  }, []);

  const sync = useSync({
    onAdopt: useCallback(
      (raw) => {
        const parsed = parseDoc(raw);
        if (!parsed.error) applyDoc(parsed);
      },
      [applyDoc]
    ),
    // What this app would save for a document it has just been handed. The server's bytes
    // and ours differ in harmless ways — key order, a rolled-forward date — and comparing
    // raw text would make every load look like an unsaved edit.
    canonical: useCallback((raw) => {
      const parsed = parseDoc(raw);
      return parsed.error ? null : JSON.stringify(buildDoc(stateFromDoc(parsed)));
    }, []),
  });

  // Signed out of a hosted copy, the app is a window on someone else's data. With no
  // backend at all there is nobody to sign in as, so everything stays editable.
  const canEdit = sync.mode !== 'remote' || sync.unlocked;
  // Ratings are the organiser's working notes, not a thing for the whole group to read.
  // Signed out on a hosted copy they are hidden everywhere: cards, pins, the readout,
  // the table, the ladder, the ratings snapshots in history, and both exports.
  const showValues = canEdit;

  useEffect(() => {
    saveCache(doc);
    sync.push(doc);
  }, [doc, sync.push]);

  useEffect(() => {
    savePrefs({ mini });
  }, [mini]);

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

  // A match belongs to the week matching its date; recording one creates that week and
  // snapshots what every player who turned out was rated at the time. A session is often
  // several games with the same sides, so they arrive as a list and fold in one at a time.
  function saveResult(entry) {
    const next = entry.matches.reduce(
      (weeks, m) => putMatch(weeks, { date: entry.date, venue: entry.venue, teamSize: entry.teamSize, match: m, players }),
      history
    );
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

  // The shared document, written to a file. Byte for byte what the server holds, plus a
  // note of when it was taken.
  function exportAll() {
    exportJSON({ players, history, teamSize, selected, match, teams, pos });
  }

  // Signed out, neither row exists: an export is every rating in one file, which is the
  // thing view-only hides, and an import would strand the browser out of step. The Data
  // button and the sheet's Data group go with them rather than open onto nothing.
  const dataRows = (close) => (
    <>
      {canEdit && (
        <MenuRow
          icon="file-json"
          label="Export all data"
          onClick={() => {
            close();
            exportAll();
          }}
        />
      )}
      {/* Importing replaces the document. Signed out there is nowhere to put the result,
          so it would only strand this browser out of step with everyone else. */}
      {canEdit && (
        <MenuRow
          icon="upload"
          label="Import data"
          onClick={() => {
            close();
            if (fileRef.current) fileRef.current.click();
          }}
        />
      )}
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
        // Loading a file is the same operation as a document arriving from the server, so
        // it goes through the same door. A bare player list brings no selection or board
        // with it, and ids from elsewhere would pick the wrong people — those start empty.
        applyDoc(result);
        // Written by older files, when the squad view was still part of the document.
        if (result.mini != null) setMini(result.mini);
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

  // Same two teams, opposite bibs. Both ends of the board swap with them, so each side
  // still defends the goal it is drawn next to and the formation reads the same way round.
  function swapColours() {
    setTeams((t) => ({ red: t.blue, blue: t.red }));
    setPos((pv) => {
      const next = {};
      Object.keys(pv).forEach((id) => {
        next[id] = { x: 100 - pv[id].x, y: 100 - pv[id].y };
      });
      return next;
    });
    setSel(null);
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

  const look = syncLook(sync);

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
            ['awards', 'Awards'],
          ]}
          value={page}
          onChange={setPage}
        />
        {page === 'balancer' && (
          <Segmented
            className="tb-fmt"
            options={[5, 6].map((n) => [n, n + '-a-side'])}
            value={teamSize}
            disabled={!canEdit}
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
            disabled={!canEdit}
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
          {showValues && (
            <>
              <Switch checked={showStats} onChange={(e) => setShowStats(e.target.checked)} label="Stat labels" />
              <Switch checked={pngRatings} onChange={(e) => setPngRatings(e.target.checked)} label="PNG ratings" />
              <Switch checked={pngSummary} onChange={(e) => setPngSummary(e.target.checked)} label="PNG summary" />
            </>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="trophy" size={15} />}
            disabled={!built || !canEdit}
            onClick={() => setRecording({})}
          >
            Record result
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="download" size={15} />}
            disabled={!built}
            onClick={() => exportBoard(teams, pos, { ratings: showValues && pngRatings, summary: showValues && pngSummary })}
          >
            Export PNG
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="shuffle" size={15} />}
            disabled={!built || !canEdit}
            onClick={() => {
              const s = seed + 1;
              setSeed(s);
              build(s);
            }}
          >
            Reshuffle
          </Button>
          {/* Only worth offering once there are two sides to swap. */}
          {built && canEdit && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Icon name="arrow-left-right" size={15} />}
              onClick={swapColours}
            >
              Swap colours
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            disabled={selected.length !== needed || !canEdit}
            onClick={() => build()}
          >
            {built ? 'Re-balance' : 'Balance teams'}
          </Button>
        </div>
        )}
        {/* Where the data stands, and backup — on every page, but kept to two buttons:
            the balancer's header is already the widest thing here. */}
        <div className="tb-data">
          <button
            type="button"
            className="tb-syncchip"
            data-tone={look.tone}
            aria-label={'Shared data: ' + look.title}
            title={look.title}
            onClick={() => setSyncOpen(true)}
          >
            <span className="tb-syncdot" />
            <span className="tb-syncword">{look.label}</span>
          </button>
          {canEdit && (
            <IconButton
              icon={<Icon name="file-json" size={16} />}
              aria-label="Data"
              aria-expanded={dataMenu}
              variant="secondary"
              size="sm"
              onClick={() => setDataMenu(true)}
            />
          )}
        </div>
        {/* Phone: one primary action plus a sheet holding the rest, so nothing in the
            header has to be scrolled sideways to be found. The sync state rides on the
            More button as a dot rather than taking a slot of its own. */}
        <div className="tb-mobilebar">
          <span className="tb-morewrap">
            <IconButton
              icon={<Icon name="more-horizontal" size={19} />}
              aria-label={'More actions — ' + look.title}
              aria-expanded={menu}
              variant="secondary"
              size="sm"
              onClick={() => setMenu(true)}
            />
            <span className="tb-syncdot tb-morebadge" data-tone={look.tone} />
          </span>
          {page === 'balancer' && (
            <Button
              variant="primary"
              size="sm"
              disabled={selected.length !== needed || !canEdit}
              onClick={() => build()}
            >
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
          canEdit={canEdit}
          showValues={showValues}
          onAwards={(w) => setAwarding(w)}
          onEditMatch={(week, match) => setRecording({ week, match })}
          onDeleteMatch={deleteMatch}
          onDeleteWeek={deleteWeek}
        />
      ) : page === 'awards' ? (
        <Standings weeks={history} players={players} />
      ) : page === 'ladder' ? (
        showValues ? (
          <StatLadder players={players} selected={selected} canEdit={canEdit} onPatch={patchPlayer} />
        ) : (
          <div className="tb-page-stats">
            <div className="tb-histempty">Ratings are hidden until you sign in from the shared-data button.</div>
          </div>
        )
      ) : page === 'stats' ? (
        <StatsTable
          players={players}
          selected={selected}
          canEdit={canEdit}
          showValues={showValues}
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
            canEdit={canEdit}
            showValues={showValues}
            mini={mini}
            onMiniChange={setMini}
            onToggle={toggle}
            onEdit={(p) => setDraft({ ...p, stats: { ...p.stats }, alt: [...(p.alt || [])], nicknames: [...(p.nicknames || [])] })}
            onDelete={removePlayer}
            onAdd={() => setDraft({ name: '', pos: 'Midfielder', alt: [], nicknames: [], stats: { ...DEFAULT_STATS } })}
            onClear={() => {
              setSelected([]);
              resetBoard();
            }}
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
                  showStats={showStats && showValues}
                  showValues={showValues}
                  sel={sel}
                  onPinDown={canEdit ? onPinDown : null}
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
                {!canEdit
                  ? 'Sign in from the shared-data button to move players around'
                  : sel
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
                {canEdit
                  ? 'Pick ' + needed + ' players — everyone else sits on the bench — then balance to fill the board.'
                  : 'Nobody has balanced a side yet. The board fills in here as soon as somebody does.'}
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
          <Metrics teams={teams} showValues={showValues} />
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
        <button type="button" data-on={page === 'awards' ? '1' : '0'} onClick={() => setPage('awards')}>
          <Icon name="trophy" size={19} />
          <span>Awards</span>
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
            <div className="tb-menu-group">
              <div className="tb-menu-label">Shared data</div>
              <button
                type="button"
                className="tb-menu-row tb-menu-sync"
                data-tone={look.tone}
                onClick={() => {
                  setMenu(false);
                  setSyncOpen(true);
                }}
              >
                <span className="tb-syncdot" data-tone={look.tone} />
                <span>{look.label}</span>
                <span className="tb-menu-aside">{look.title}</span>
              </button>
            </div>

            {page === 'balancer' && (
              <div className="tb-menu-group">
                <div className="tb-menu-label">Share</div>
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
                    exportBoard(teams, pos, { ratings: showValues && pngRatings, summary: showValues && pngSummary });
                  }}
                />
                {showValues && (
                  <>
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
                  </>
                )}
              </div>
            )}

            {page === 'balancer' && canEdit && (
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
                  {built && (
                    <MenuRow
                      icon="arrow-left-right"
                      label="Swap team colours"
                      onClick={() => {
                        setMenu(false);
                        swapColours();
                      }}
                    />
                  )}
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
              </>
            )}

            {canEdit && (
              <div className="tb-menu-group">
                <div className="tb-menu-label">Data</div>
                {dataRows(() => setMenu(false))}
              </div>
            )}
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
        <ShareDialog
          teams={teams}
          match={match}
          canEdit={canEdit}
          showValues={showValues}
          onMatchChange={setMatch}
          onClose={() => setSharing(false)}
        />
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
          canEdit={canEdit}
          onSave={saveAwards}
          onClose={() => setAwarding(null)}
        />
      )}
      {syncOpen && <SyncDialog sync={sync} onClose={() => setSyncOpen(false)} />}

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
