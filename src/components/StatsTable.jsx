import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Icon, IconButton } from '../ds/index.js';
import { readBackupFile } from '../lib/backup.js';
import { ABBR, POSITIONS, SHORT, STATS, overall, statAvg, ovrAvg } from '../lib/model.js';

const RANGE_KEYS = [...STATS, 'ovr'];

const EMPTY = { name: '', pos: '', alt: '', squad: '', ranges: {} };

function hasFilters(f) {
  if (f.name.trim() || f.pos || f.alt || f.squad) return true;
  return RANGE_KEYS.some((k) => {
    const r = f.ranges[k];
    return r && (r.min !== '' || r.max !== '');
  });
}

function valueOf(p, key) {
  return key === 'ovr' ? overall(p) : Number(p.stats[key]) || 0;
}

// A stat cell keeps its own text while being typed so the field can be cleared and
// retyped; the roster only ever stores a clamped number.
function StatCell({ value, onCommit, label }) {
  return (
    <input
      className="tb-cellinput tb-cellnum"
      type="number"
      min="0"
      max="100"
      inputMode="numeric"
      aria-label={label}
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') return onCommit('');
        const n = Number(raw);
        if (Number.isNaN(n)) return undefined;
        return onCommit(Math.max(0, Math.min(100, Math.round(n))));
      }}
      onBlur={(e) => {
        if (e.target.value === '') onCommit(0);
      }}
    />
  );
}

// Nicknames edit as one comma-separated field. The raw text is held locally while the
// cell has focus so a trailing comma survives being typed.
function NickCell({ value, onCommit, label }) {
  const [text, setText] = useState(value.join(', '));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(value.join(', '));
  }, [value, focused]);
  return (
    <input
      className="tb-cellinput"
      aria-label={label}
      placeholder="—"
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setText(e.target.value);
        onCommit(
          e.target.value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        );
      }}
    />
  );
}

function SortHead({ label, sortKey, sort, setSort, align = 'left', title }) {
  const on = sort && sort.key === sortKey;
  return (
    <button
      type="button"
      className="tb-sort"
      title={title || 'Sort by ' + label}
      style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}
      onClick={() =>
        setSort((s) => (s && s.key === sortKey && s.dir === 'asc' ? { key: sortKey, dir: 'desc' } : { key: sortKey, dir: 'asc' }))
      }
    >
      <span>{label}</span>
      {on && <Icon name={sort.dir === 'asc' ? 'chevron-up' : 'chevron-down'} size={13} />}
    </button>
  );
}

export default function StatsTable({ players, selected, onPatch, onEdit, onDelete, onAdd, onExport, onImport }) {
  const [f, setF] = useState(EMPTY);
  const [sort, setSort] = useState(null);
  const fileRef = useRef(null);

  function pickFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // let the same file be picked again after a cancelled import
    if (file) readBackupFile(file, onImport);
  }

  const setRange = (key, side, v) =>
    setF((s) => ({ ...s, ranges: { ...s.ranges, [key]: { min: '', max: '', ...s.ranges[key], [side]: v } } }));

  const rows = useMemo(() => {
    const q = f.name.trim().toLowerCase();
    const out = players.filter((p) => {
      if (q && ![p.name, ...(p.nicknames || [])].some((n) => n.toLowerCase().includes(q))) return false;
      if (f.pos && p.pos !== f.pos) return false;
      if (f.alt && !(p.alt || []).includes(f.alt)) return false;
      if (f.squad === 'in' && !selected.includes(p.id)) return false;
      if (f.squad === 'out' && selected.includes(p.id)) return false;
      return RANGE_KEYS.every((k) => {
        const r = f.ranges[k];
        if (!r) return true;
        const v = valueOf(p, k);
        if (r.min !== '' && v < Number(r.min)) return false;
        if (r.max !== '' && v > Number(r.max)) return false;
        return true;
      });
    });
    if (!sort) return out;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return out.slice().sort((a, b) => {
      let d;
      if (sort.key === 'name') d = a.name.localeCompare(b.name);
      else if (sort.key === 'pos') d = POSITIONS.indexOf(a.pos) - POSITIONS.indexOf(b.pos);
      else if (sort.key === 'squad') d = Number(selected.includes(a.id)) - Number(selected.includes(b.id));
      else d = valueOf(a, sort.key) - valueOf(b, sort.key);
      return d * dir;
    });
  }, [players, selected, f, sort]);

  const filtered = hasFilters(f);

  return (
    <div className="tb-page-stats">
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
            Player stats
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: filtered ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              marginTop: 2,
            }}
          >
            {filtered ? rows.length + '/' + players.length + ' shown' : players.length + ' players'} · edit any cell to
            update the roster
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="filter-x" size={15} />}
            disabled={!filtered}
            onClick={() => setF(EMPTY)}
          >
            Clear filters
          </Button>
          <Button variant="secondary" size="sm" icon={<Icon name="plus" size={15} />} onClick={onAdd}>
            Add player
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="upload" size={15} />}
            onClick={() => fileRef.current && fileRef.current.click()}
          >
            Import JSON
          </Button>
          <Button variant="secondary" size="sm" icon={<Icon name="file-json" size={15} />} onClick={onExport}>
            Export JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={pickFile}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div className="tb-tblwrap">
        <table className="tb-tbl">
          <thead>
            <tr>
              <th className="tb-col-name">
                <SortHead label="Player" sortKey="name" sort={sort} setSort={setSort} />
              </th>
              <th className="tb-col-pos">
                <SortHead label="Position" sortKey="pos" sort={sort} setSort={setSort} />
              </th>
              <th className="tb-col-nick">Also known as</th>
              <th className="tb-col-alt">Also plays</th>
              {STATS.map((k) => (
                <th key={k} className="tb-col-stat">
                  <SortHead label={ABBR[k]} sortKey={k} sort={sort} setSort={setSort} align="right" title={'Sort by ' + k} />
                </th>
              ))}
              <th className="tb-col-ovr">
                <SortHead label="OVR" sortKey="ovr" sort={sort} setSort={setSort} align="right" title="Sort by overall" />
              </th>
              <th className="tb-col-squad">
                <SortHead label="Squad" sortKey="squad" sort={sort} setSort={setSort} />
              </th>
              <th className="tb-col-act" />
            </tr>
            <tr className="tb-tbl-filters">
              <th className="tb-col-name">
                <input
                  className="tb-filterinput"
                  type="search"
                  placeholder="Search name"
                  aria-label="Filter by name"
                  value={f.name}
                  onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))}
                />
              </th>
              <th className="tb-col-pos">
                <select
                  className="tb-filterinput"
                  aria-label="Filter by primary position"
                  value={f.pos}
                  onChange={(e) => setF((s) => ({ ...s, pos: e.target.value }))}
                >
                  <option value="">Any</option>
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </th>
              <th className="tb-col-nick" />
              <th className="tb-col-alt">
                <select
                  className="tb-filterinput"
                  aria-label="Filter by secondary position"
                  value={f.alt}
                  onChange={(e) => setF((s) => ({ ...s, alt: e.target.value }))}
                >
                  <option value="">Any</option>
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>
                      Can play {SHORT[p]}
                    </option>
                  ))}
                </select>
              </th>
              {RANGE_KEYS.map((k) => (
                <th key={k} className={k === 'ovr' ? 'tb-col-ovr' : 'tb-col-stat'}>
                  <div className="tb-range">
                    <input
                      className="tb-filterinput tb-cellnum"
                      type="number"
                      min="0"
                      max="100"
                      inputMode="numeric"
                      placeholder="≥"
                      title={'Minimum ' + (k === 'ovr' ? 'overall' : k)}
                      aria-label={'Minimum ' + (k === 'ovr' ? 'overall' : k)}
                      value={(f.ranges[k] && f.ranges[k].min) || ''}
                      onChange={(e) => setRange(k, 'min', e.target.value)}
                    />
                    <input
                      className="tb-filterinput tb-cellnum"
                      type="number"
                      min="0"
                      max="100"
                      inputMode="numeric"
                      placeholder="≤"
                      title={'Maximum ' + (k === 'ovr' ? 'overall' : k)}
                      aria-label={'Maximum ' + (k === 'ovr' ? 'overall' : k)}
                      value={(f.ranges[k] && f.ranges[k].max) || ''}
                      onChange={(e) => setRange(k, 'max', e.target.value)}
                    />
                  </div>
                </th>
              ))}
              <th className="tb-col-squad">
                <select
                  className="tb-filterinput"
                  aria-label="Filter by squad status"
                  value={f.squad}
                  onChange={(e) => setF((s) => ({ ...s, squad: e.target.value }))}
                >
                  <option value="">Any</option>
                  <option value="in">In squad</option>
                  <option value="out">Benched</option>
                </select>
              </th>
              <th className="tb-col-act" />
            </tr>
          </thead>

          <tbody>
            {rows.map((p) => {
              const inSquad = selected.includes(p.id);
              return (
                <tr key={p.id}>
                  <td className="tb-col-name">
                    <input
                      className="tb-cellinput"
                      aria-label={'Name of ' + p.name}
                      value={p.name}
                      onChange={(e) => onPatch(p.id, { name: e.target.value })}
                    />
                  </td>
                  <td className="tb-col-pos">
                    <select
                      className="tb-cellinput"
                      aria-label={'Primary position of ' + p.name}
                      value={p.pos}
                      onChange={(e) =>
                        onPatch(p.id, {
                          pos: e.target.value,
                          alt: (p.alt || []).filter((a) => a !== e.target.value),
                        })
                      }
                    >
                      {POSITIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="tb-col-nick">
                    <NickCell
                      label={'Nicknames for ' + p.name}
                      value={p.nicknames || []}
                      onCommit={(nicknames) => onPatch(p.id, { nicknames })}
                    />
                  </td>
                  <td className="tb-col-alt">
                    <div className="tb-alts">
                      {POSITIONS.filter((o) => o !== p.pos).map((o) => {
                        const on = (p.alt || []).includes(o);
                        return (
                          <button
                            key={o}
                            type="button"
                            className="tb-altchip"
                            data-on={on ? '1' : '0'}
                            aria-pressed={on}
                            title={(on ? 'Remove' : 'Add') + ' ' + o}
                            onClick={() =>
                              onPatch(p.id, {
                                alt: on ? (p.alt || []).filter((a) => a !== o) : [...(p.alt || []), o],
                              })
                            }
                          >
                            {SHORT[o]}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  {STATS.map((k) => (
                    <td key={k} className="tb-col-stat">
                      <StatCell
                        label={k + ' of ' + p.name}
                        value={p.stats[k] === '' ? '' : Number(p.stats[k]) || 0}
                        onCommit={(v) => onPatch(p.id, { stats: { ...p.stats, [k]: v } })}
                      />
                    </td>
                  ))}
                  <td className="tb-col-ovr tb-ovrcell">{overall(p)}</td>
                  <td className="tb-col-squad">
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-2xs)',
                        fontWeight: 'var(--weight-semibold)',
                        textTransform: 'uppercase',
                        letterSpacing: 'var(--tracking-wide)',
                        color: inSquad ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                      }}
                    >
                      {inSquad ? 'In squad' : 'Benched'}
                    </span>
                  </td>
                  <td className="tb-col-act">
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      <IconButton
                        icon={<Icon name="pencil" size={14} />}
                        aria-label={'Open ' + p.name + ' in the editor'}
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(p)}
                      />
                      <IconButton
                        icon={<Icon name="trash-2" size={14} />}
                        aria-label={'Delete ' + p.name}
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(p.id)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={13} className="tb-tblempty">
                  No players match these filters.
                </td>
              </tr>
            )}
          </tbody>

          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td className="tb-col-name">Average of {rows.length}</td>
                <td className="tb-col-pos" />
                <td className="tb-col-nick" />
                <td className="tb-col-alt" />
                {STATS.map((k) => (
                  <td key={k} className="tb-col-stat tb-avgcell">
                    {statAvg(rows, k).toFixed(1)}
                  </td>
                ))}
                <td className="tb-col-ovr tb-avgcell">{ovrAvg(rows).toFixed(1)}</td>
                <td className="tb-col-squad" />
                <td className="tb-col-act" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
