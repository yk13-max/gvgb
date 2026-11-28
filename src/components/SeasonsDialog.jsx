import { useState } from 'react';
import { Button, Dialog, Icon, IconButton, Input } from '../ds/index.js';
import { nextSeasonId, seasonOf, sortSeasons, suggestName } from '../lib/seasons.js';
import { formatDate } from '../lib/whatsapp.js';

function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

export default function SeasonsDialog({ seasons, weeks, onChange: apply, onClose }) {
  const [blocked, setBlocked] = useState(null);
  // A completed season's nights are fixed. Any change that would move a night into or out
  // of one — a new season starting inside it, a neighbour's date moved — is turned down.
  function onChange(next) {
    const nightsOf = (list, id) => weeks.filter((w) => { const s = seasonOf(list, w.date); return s && s.id === id; }).map((w) => w.date).join(',');
    const hit = seasons.find((s) => s.completed && nightsOf(seasons, s.id) !== nightsOf(next, s.id));
    if (hit) {
      setBlocked(hit.name + ' is complete, so its nights can’t move into or out of it. Reopen it on the Honours page first.');
      return;
    }
    setBlocked(null);
    apply(next);
  }
  const [start, setStart] = useState(todayISO());
  const [name, setName] = useState(() => suggestName(todayISO()));
  const [touched, setTouched] = useState(false);
  const sorted = sortSeasons(seasons);
  // A new season starts with the latest season's minimum, until it is typed over.
  const lastMin = sorted.length ? sorted[sorted.length - 1].minGames || 0 : 0;
  const [typedMin, setMin] = useState(null);
  const min = typedMin == null ? lastMin : typedMin;
  const weeksFrom = (s, next) => weeks.filter((w) => w.date >= s.start && (!next || w.date < next.start)).length;

  function add() {
    if (!name.trim() || !start) return;
    onChange([...seasons, { id: nextSeasonId(seasons), name: name.trim(), start, minGames: min }]);
    setTouched(false);
    setName('');
    setMin(null);
  }
  const rename = (id, v) => onChange(seasons.map((s) => (s.id === id ? { ...s, name: v } : s)));
  const restart = (id, v) => v && onChange(seasons.map((s) => (s.id === id ? { ...s, start: v } : s)));
  const remove = (id) => onChange(seasons.filter((s) => s.id !== id));
  const toMin = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
  const setMinFor = (id, v) => onChange(seasons.map((s) => (s.id === id ? { ...s, minGames: toMin(v) } : s)));

  return (
    <Dialog
      open
      title="Seasons"
      onClose={onClose}
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="tb-seasons">
        <p className="tb-sync-note">
          A season starts on a date and runs until the next one starts. A week belongs to the latest season that
          had begun by its date, so nothing needs assigning by hand. Removing a season deletes no results — its
          weeks fall to the season before.
        </p>
        <p className="tb-sync-note">
          <b>Min. matches</b> is how many matches a player needs in that season to take a place in its table or be
          named its winner. 0 means anyone who has played counts.
        </p>

        {blocked && <p className="tb-sync-warn">{blocked}</p>}
        {sorted.length > 0 && (
          <div className="tb-seasonlist">
            {sorted
              .slice()
              .reverse()
              .map((s, i, arr) => {
                const next = i === 0 ? null : arr[i - 1];
                const n = weeksFrom(s, next);
                return (
                  <div key={s.id} className="tb-seasonrow">
                    <input
                      className="tb-cellinput tb-seasonname"
                      aria-label={'Name of season starting ' + formatDate(s.start)}
                      value={s.name}
                      onChange={(e) => rename(s.id, e.target.value)}
                    />
                    <input
                      className="tb-cellinput tb-seasonstart"
                      type="date"
                      disabled={!!s.completed}
                      title={s.completed ? 'Complete — reopen it on the Honours page to change it' : undefined}
                      aria-label={'Start of ' + s.name}
                      value={s.start}
                      onChange={(e) => restart(s.id, e.target.value)}
                    />
                    <label className="tb-seasonmin" title="Matches needed to place in the table or win the season">
                      <input
                        className="tb-cellinput"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        aria-label={'Minimum matches to place in ' + s.name}
                        disabled={!!s.completed}
                        value={s.minGames || 0}
                        onChange={(e) => setMinFor(s.id, e.target.value)}
                      />
                      <span>matches</span>
                    </label>
                    <span className="tb-seasoncount">
                      {n} week{n === 1 ? '' : 's'}
                    </span>
                    <IconButton
                      icon={<Icon name="trash-2" size={14} />}
                      aria-label={'Remove season ' + s.name}
                      variant="ghost"
                      size="sm"
                      disabled={!!s.completed}
                      onClick={() => remove(s.id)}
                    />
                  </div>
                );
              })}
          </div>
        )}

        <div className="tb-seasonadd">
          <div className="tb-menu-label">New season</div>
          <div className="tb-seasonaddrow">
            <Input
              label="Starts"
              type="date"
              value={start}
              style={{ flex: 1, minWidth: 0 }}
              onChange={(e) => {
                setStart(e.target.value);
                if (!touched) setName(suggestName(e.target.value));
              }}
            />
            <Input
              label="Name"
              placeholder="e.g. 2026/27"
              value={name}
              style={{ flex: 1, minWidth: 0 }}
              onChange={(e) => {
                setTouched(true);
                setName(e.target.value);
              }}
            />
            <Input
              label="Min. matches"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={min}
              style={{ width: 96, flex: '0 0 auto' }}
              onChange={(e) => setMin(toMin(e.target.value))}
            />
          </div>
          <Button variant="primary" size="sm" icon={<Icon name="plus" size={15} />} disabled={!name.trim() || !start} onClick={add}>
            Add season
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
