import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dialog, Icon, IconButton, Switch } from './ds/index.js';
import History from './components/History.jsx';
import ImportDialog from './components/ImportDialog.jsx';
import Metrics from './components/Metrics.jsx';
import Pitch from './components/Pitch.jsx';
import PlayerEditor from './components/PlayerEditor.jsx';
import RecordResultDialog from './components/RecordResultDialog.jsx';
import RosterPanel from './components/RosterPanel.jsx';
import Honours from './components/Honours.jsx';
import HonoursDialog from './components/HonoursDialog.jsx';
import SeasonBar from './components/SeasonBar.jsx';
import SeasonsDialog from './components/SeasonsDialog.jsx';
import WeekAwardsDialog from './components/WeekAwardsDialog.jsx';
import ShareDialog from './components/ShareDialog.jsx';
import HousekeepingDialog from './components/HousekeepingDialog.jsx';
import Standings from './components/Standings.jsx';
import StatLadder from './components/StatLadder.jsx';
import StatsTable from './components/StatsTable.jsx';
import SyncDialog, { syncLook } from './components/SyncDialog.jsx';
import { exportJSON, readBackupFile } from './lib/backup.js';
import { savedName, savedPassword } from './lib/remote.js';
import { FORMATS, cleanFormula, docKeyFor, formulasOf, setFormulas } from './lib/formula.js';
import FormulaPage from './components/FormulaPage.jsx';
import FormulaLock from './components/FormulaLock.jsx';
import { buildDoc, parseDoc } from './lib/doc.js';
import { exportBoard } from './lib/exportBoard.js';
import { favourite, preMatchFacts } from './lib/facts.js';
import { useTheme } from './lib/theme.js';
import { strengthOf } from './lib/strength.js';
import RatingSuggestions from './components/RatingSuggestions.jsx';
import { DEFAULT_STATS, balance, layout, pinScale, relax } from './lib/model.js';
import { samplePlayers } from './lib/samplePlayers.js';
import { ALL, currentSeason, labelFor, minGamesFor, seasonOptions, weeksIn } from './lib/seasons.js';
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
    seasons: parsed.seasons || [],
    formula: parsed.formula || cleanFormula(null),
    formulaPrev: parsed.formulaPrev || null,
    // The other formats' formulas and their undo slots, under their document keys.
    otherFormulas: Object.fromEntries(
      FORMATS.filter((n) => n !== 6).flatMap((n) => [docKeyFor(n), docKeyFor(n) + 'Prev']).map((k) => [k, parsed[k] || null])
    ),
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

// The match format: 5 to 11-a-side. Seven choices are too many for a row of buttons, so
// it is a dropdown that says how many players the squad needs.
function FormatPicker({ value, onChange, disabled, className }) {
  return (
    <label className={'tb-fmtpick ' + (className || '')}>
      <span className="tb-fmtpick-label">Format</span>
      <select value={value} disabled={disabled} aria-label="Match format" onChange={(e) => onChange(Number(e.target.value))}>
        {FORMATS.map((n) => (
          <option key={n} value={n}>
            {n}-a-side · {n * 2} players
          </option>
        ))}
      </select>
    </label>
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
        seasons: [],
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
  // Talking points on the shared images. No ratings in them, so viewers get them too.
  const [pngFacts, setPngFacts] = useState(true);
  const shareBoard = () =>
    exportBoard(teams, pos, {
      ratings: showValues && pngRatings,
      summary: showValues && pngSummary,
      facts: pngFacts ? preMatchFacts(teams, history, players, { seasons, today: todayISO() }) : [],
      // Judged the way the sides were made: ratings, plus results when the balancer counts them.
      favourite: pngFacts ? favourite(teams, strengthOf(history, players, influence)) : null,
    });
  const [match, setMatch] = useState(start.match);
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState(null);
  const [seed, setSeed] = useState(0);
  const [importing, setImporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [queue, setQueue] = useState([]);
  const [narrow, setNarrow] = useState(isNarrow);
  const [view, setView] = useState('squad');
  // Where the app opens. A device that holds the password is an organiser's: the results
  // are its working page. Anyone else is here to look, and the league table is the look.
  const [page, setPage] = useState(() => (savedPassword() ? 'history' : 'awards'));
  // The squad view is a preference belonging to this browser, not to the group — toggling
  // it on a phone has no business changing what everyone else is looking at.
  const [mini, setMini] = useState(() => loadPrefs().mini);
  const [squadSort, setSquadSort] = useState(() => loadPrefs().sort);
  // How much results count when balancing: a per-device choice for whoever balances.
  const [influence, setInfluence] = useState(() => loadPrefs().influence);
  const [history, setHistory] = useState(start.history);
  const [seasons, setSeasons] = useState(start.seasons);
  // One formula per format. `formula` is the 6-a-side one; the others (in `others`, by
  // their document keys: formula5, formula7 … formula11, each with a …Prev) stay
  // null until first saved, and until then work out from the 6-a-side one.
  const [formula, setFormula] = useState(start.formula);
  const [formulaPrev, setFormulaPrev] = useState(start.formulaPrev);
  const [others, setOthers] = useState(start.otherFormulas);
  const formulas = useMemo(() => formulasOf({ formula, ...others }), [formula, others]);
  // Everything below reads the formula through the model, so the one for the format on
  // the board is made the active one before any of it renders. Ratings follow the format.
  setFormulas(formulas, teamSize);
  // Remounts the pages that hold ratings in memos when the formula moves them.
  const formulaKey = useMemo(() => teamSize + JSON.stringify(formulas), [formulas, teamSize]);
  // Which season Results and the Table show. null means "whichever is current",
  // so a device that has never chosen follows the calendar as seasons are added.
  const [seasonKey, setSeasonKey] = useState(null);
  const [managingSeasons, setManagingSeasons] = useState(false);
  const [honouring, setHonouring] = useState(null); // the season whose honours are being picked
  const [recording, setRecording] = useState(null); // null | {} for a new match | { week, match } to edit
  const [awarding, setAwarding] = useState(null); // the week whose nominations are open
  const [notice, setNotice] = useState(null);
  const [menu, setMenu] = useState(false); // the phone's actions sheet
  const [dataMenu, setDataMenu] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [housekeeping, setHousekeeping] = useState(false);
  const theme = useTheme();
  const THEME_LOOK = { system: ['monitor', 'Theme: follows this device'], light: ['sun', 'Theme: light'], dark: ['moon', 'Theme: dark'] };

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
    () => buildDoc({ players, history, teamSize, selected, match, teams, pos, seasons, formula, formulaPrev, ...others }),
    [players, history, teamSize, selected, match, teams, pos, seasons, formula, formulaPrev, others]
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
    setSeasons(s.seasons);
    setFormula(s.formula);
    setFormulaPrev(s.formulaPrev);
    setOthers(s.otherFormulas);
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
    // A formula change the server turned away: put back the formula it holds, and let
    // everything else in that save go through.
    onFormulaLocked: useCallback((raw) => {
      const parsed = parseDoc(raw);
      if (parsed.error) return;
      setFormula(parsed.formula);
      setFormulaPrev(parsed.formulaPrev);
      setOthers(stateFromDoc(parsed).otherFormulas);
    }, []),
  });

  // Signed out of a hosted copy, the app is a window on someone else's data. With no
  // backend at all there is nobody to sign in as, so everything stays editable.
  //
  // Before the first answer from /api/data the mode is still 'loading'. Treating that as
  // editable painted every rating from the cache and then snatched it away when the
  // answer came — a flash of the very numbers a viewer is not meant to see. So until the
  // backend has spoken, nothing is editable or visible unless this device already holds
  // the password, or last found itself on a copy with no backend at all.
  const noBackend = sync.mode === 'local' || (sync.mode === 'loading' && sync.assume === 'local');
  const canEdit = sync.unlocked || noBackend;
  // Ratings are the organiser's working notes, not a thing for the whole group to read.
  // Signed out on a hosted copy they are hidden everywhere: cards, pins, the readout,
  // the table, the ladder, the ratings snapshots in history, and both exports.
  const showValues = canEdit;

  useEffect(() => {
    saveCache(doc);
    sync.push(doc);
  }, [doc, sync.push]);

  useEffect(() => {
    savePrefs({ mini, sort: squadSort, influence });
  }, [mini, squadSort, influence]);

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
    const t = balance(pool, teamSize, s, strengthOf(history, players, influence));
    setTeams(t);
    setPos(relax(Object.assign({}, layout(t.red, 'red'), layout(t.blue, 'blue')), pinScale(teamSize)));
    setSel(null);
    if (isNarrow()) setView('board');
  }

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    resetBoard();
  }

  // A new team formula. Signed in to the hosted copy, what is stored is backed up first,
  // so any change to how teams are made can be rolled back from Backups & history too.
  async function saveFormula(next, note, size) {
    if (sync.unlocked) {
      const r = await sync.makeBackup('formula');
      if (!r || r.kind !== 'ok') return { ok: false, message: 'The backup before saving did not go through, so nothing was changed. Try again in a moment.' };
    }
    const saved = cleanFormula({ ...next, meta: { note: note.trim(), by: savedName() || '', on: todayISO() } });
    put(size, saved);
    return { ok: true };
  }

  // Saving or undoing one format's formula. The one it replaces goes in its undo slot.
  function put(size, next) {
    if (size === 6) {
      // Until they are first saved, the other formats follow this one. Keep them as they
      // are now, so changing 6-a-side never moves the others.
      setOthers((o) => {
        const out = { ...o };
        FORMATS.forEach((n) => {
          if (n !== 6 && !out[docKeyFor(n)]) out[docKeyFor(n)] = formulas[n];
        });
        return out;
      });
      setFormulaPrev(formula);
      setFormula(next);
      return;
    }
    const k = docKeyFor(size);
    setOthers((o) => ({ ...o, [k + 'Prev']: formulas[size], [k]: next }));
  }

  const prevOf = (size) => (size === 6 ? formulaPrev : others[docKeyFor(size) + 'Prev']);

  async function undoFormula(size) {
    const prev = prevOf(size);
    if (!prev) return { ok: false };
    if (sync.unlocked) {
      const r = await sync.makeBackup('formula');
      if (!r || r.kind !== 'ok') return { ok: false, message: 'The backup before undoing did not go through, so nothing was changed.' };
    }
    put(size, prev);
    return { ok: true };
  }

  function removePlayer(id) {
    setPlayers((ps) => ps.filter((p) => p.id !== id));
    setSelected((s) => s.filter((x) => x !== id));
    resetBoard();
  }

  // Inline edits from the stats table. Any change to a rating makes the current
  // split stale, so the board clears once and stays clear until you re-balance.
  // Only a change that would alter the balance clears the board: a rating or a
  // position. A new nickname or a corrected spelling leaves the drafted sides alone.
  const unbalances = (patch) => 'stats' in patch || 'pos' in patch || 'alt' in patch;
  function patchPlayer(id, patch) {
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    if (teams.red.length && unbalances(patch)) resetBoard();
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
    const before = draft.id ? players.find((p) => p.id === draft.id) : null;
    setPlayers((ps) => {
      if (draft.id) return ps.map((p) => (p.id === draft.id ? draft : p));
      const id = Math.max(0, ...ps.map((p) => p.id)) + 1;
      return [...ps, { ...draft, id }];
    });
    // A new player, or an existing one whose ratings or position moved, makes the
    // current split stale. Renames and nicknames do not.
    const moved =
      !before ||
      before.pos !== draft.pos ||
      JSON.stringify(before.alt || []) !== JSON.stringify(draft.alt || []) ||
      JSON.stringify(before.stats) !== JSON.stringify(draft.stats);
    if (moved) resetBoard();
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
    // A score logged against the drafted sides closes that night: the board clears so
    // next week starts from a clean sheet. Editing an existing score leaves it alone —
    // the sides are already on record with the match.
    if (entry.isNew) resetBoard();
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
    exportJSON({ players, history, teamSize, selected, match, teams, pos, seasons, formula, formulaPrev, ...others });
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

  // The season in view. An explicit pick that no longer exists (removed in the dialog)
  // falls back to the current one, the same as a device that never picked.
  const options = seasonOptions(seasons, history);
  const current = currentSeason(seasons, todayISO());
  const activeSeason =
    seasonKey && options.some((o) => o.key === String(seasonKey)) ? String(seasonKey) : current ? String(current.id) : ALL;
  const seasonWeeks = weeksIn(history, activeSeason, seasons);
  const seasonLabel = seasons.length ? labelFor(activeSeason, seasons) : '';
  const seasonBar =
    seasons.length || canEdit ? (
      <SeasonBar
        options={options}
        value={activeSeason}
        onChange={setSeasonKey}
        canEdit={canEdit}
        onManage={() => setManagingSeasons(true)}
      />
    ) : null;

  const formulaPage = (
    <FormulaPage
      formulas={formulas}
      prevs={Object.fromEntries(FORMATS.map((n) => [n, prevOf(n)]))}
      players={players}
      weeks={history}
      selected={selected}
      teamSize={teamSize}
      teams={teams}
      influence={influence}
      onSave={saveFormula}
      onUndo={undoFormula}
      onBack={() => setPage(savedPassword() ? 'history' : 'awards')}
    />
  );

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
            ['history', 'Results'],
            ['awards', 'Table'],
            ['balancer', 'Balancer'],
            ['stats', 'Player stats'],
            ['ladder', 'Stat ladder'],
          ]}
          value={page}
          onChange={setPage}
        />
        {page === 'balancer' && (
          <FormatPicker
            className="tb-fmt"
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
          <Switch checked={pngFacts} onChange={(e) => setPngFacts(e.target.checked)} label="PNG talking points" />
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
            onClick={shareBoard}
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
          <IconButton
            icon={<Icon name={THEME_LOOK[theme.pref][0]} size={16} />}
            aria-label={THEME_LOOK[theme.pref][1] + ' — change'}
            title={THEME_LOOK[theme.pref][1]}
            variant="secondary"
            size="sm"
            onClick={theme.cycle}
          />
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

      {page === 'formula' && canEdit ? (
        // With no shared store there is nothing to protect: the formula lives in this
        // browser alone. On a hosted copy it needs the formula code as well.
        sync.mode === 'remote' ? (
          <FormulaLock sync={sync} onBack={() => setPage('history')}>
            {formulaPage}
          </FormulaLock>
        ) : (
          formulaPage
        )
      ) : page === 'history' ? (
        <History
          pngFacts={pngFacts}
          weeks={seasonWeeks}
          allWeeks={history}
          seasons={seasons}
          seasonKey={activeSeason}
          today={todayISO()}
          players={players}
          seasonBar={seasonBar}
          seasonLabel={seasonLabel}
          canEdit={canEdit}
          showValues={showValues}
          onAwards={(w) => setAwarding(w)}
          onEditMatch={(week, match) => setRecording({ week, match })}
          onDeleteMatch={deleteMatch}
          onDeleteWeek={deleteWeek}
        />
      ) : page === 'awards' || page === 'formula' ? (
        <Standings
          weeks={seasonWeeks}
          minGames={minGamesFor(activeSeason, seasons)}
          players={players}
          seasonBar={seasonBar}
          seasonLabel={seasonLabel}
          onHonours={() => setPage('honours')}
        />
      ) : page === 'honours' ? (
        <Honours
          seasons={seasons}
          weeks={history}
          players={players}
          today={todayISO()}
          canEdit={canEdit}
          onBack={() => setPage('awards')}
          onEdit={(season) => setHonouring(season)}
        />
      ) : page === 'ladder' ? (
        showValues ? (
          <StatLadder key={formulaKey} players={players} selected={selected} canEdit={canEdit} onPatch={patchPlayer} />
        ) : (
          <div className="tb-page-stats">
            <div className="tb-histempty">Ratings are hidden until you sign in from the shared-data button.</div>
          </div>
        )
      ) : page === 'stats' ? (
        <div className="tb-statspage">
        {showValues && <RatingSuggestions key={formulaKey} weeks={history} players={players} canEdit={canEdit} onPatch={patchPlayer} />}
        <StatsTable
          key={formulaKey}
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
        </div>
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
            sort={squadSort}
            onSortChange={setSquadSort}
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
          <Metrics
            teams={teams}
            showValues={showValues}
            influence={influence}
            onInfluence={setInfluence}
            strength={strengthOf(history, players, influence)}
          />
        </aside>
      </main>
      )}

      <nav className="tb-tabs">
        <button type="button" data-on={page === 'history' ? '1' : '0'} onClick={() => setPage('history')}>
          <Icon name="history" size={19} />
          <span>Results</span>
        </button>
        <button type="button" data-on={page === 'awards' ? '1' : '0'} onClick={() => setPage('awards')}>
          <Icon name="trophy" size={19} />
          <span>Table</span>
        </button>
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
          <span>Stats</span>
        </button>
        <button type="button" data-on={page === 'ladder' ? '1' : '0'} onClick={() => setPage('ladder')}>
          <Icon name="sliders-vertical" size={19} />
          <span>Ladder</span>
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
              <div className="tb-menu-label">Theme</div>
              <Segmented
                className="tb-menu-seg"
                options={[
                  ['system', 'Auto'],
                  ['light', 'Light'],
                  ['dark', 'Dark'],
                ]}
                value={theme.pref}
                onChange={theme.setPref}
              />
            </div>
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
                    shareBoard();
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
                <Switch style={SWITCH_ROW} checked={pngFacts} onChange={(e) => setPngFacts(e.target.checked)} label="Talking points on the images" />
              </div>
            )}

            {page === 'balancer' && canEdit && (
              <>
                <div className="tb-menu-group">
                  <div className="tb-menu-label">Format</div>
                  <FormatPicker
                    className="tb-menu-fmt"
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
      {syncOpen && (
        <SyncDialog
          sync={sync}
          onClose={() => setSyncOpen(false)}
          onHousekeeping={() => {
            setSyncOpen(false);
            setHousekeeping(true);
          }}
          onFormula={() => {
            setSyncOpen(false);
            setPage('formula');
          }}
        />
      )}
      {housekeeping && sync.unlocked && <HousekeepingDialog sync={sync} onClose={() => setHousekeeping(false)} />}
      {managingSeasons && (
        <SeasonsDialog seasons={seasons} weeks={history} onChange={setSeasons} onClose={() => setManagingSeasons(false)} />
      )}
      {honouring && (
        <HonoursDialog
          season={seasons.find((x) => x.id === honouring.id) || honouring}
          weeks={weeksIn(history, String(honouring.id), seasons)}
          players={players}
          onSave={(id, honours) => {
            setSeasons((ss) => ss.map((x) => (x.id === id ? { ...x, honours } : x)));
            setHonouring(null);
          }}
          onClose={() => setHonouring(null)}
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
