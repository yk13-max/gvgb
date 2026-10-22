import { useState } from 'react';
import { Button, Dialog, Icon, IconButton, Input } from '../ds/index.js';
import { nextSeasonId, sortSeasons, suggestName } from '../lib/seasons.js';
import { formatDate } from '../lib/whatsapp.js';

function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

export default function SeasonsDialog({ seasons, weeks, onChange, onClose }) {
  const [start, setStart] = useState(todayISO());
  const [name, setName] = useState(() => suggestName(todayISO()));
  const [touched, setTouched] = useState(false);
  const sorted = sortSeasons(seasons);
  const weeksFrom = (s, next) => weeks.filter((w) => w.date >= s.start && (!next || w.date < next.start)).length;

  function add() {
    if (!name.trim() || !start) return;
    onChange([...seasons, { id: nextSeasonId(seasons), name: name.trim(), start }]);
    setTouched(false);
    setName('');
  }
  const rename = (id, v) => onChange(seasons.map((s) => (s.id === id ? { ...s, name: v } : s)));
  const restart = (id, v) => v && onChange(seasons.map((s) => (s.id === id ? { ...s, start: v } : s)));
  const remove = (id) => onChange(seasons.filter((s) => s.id !== id));

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
                      aria-label={'Start of ' + s.name}
                      value={s.start}
                      onChange={(e) => restart(s.id, e.target.value)}
                    />
                    <span className="tb-seasoncount">
                      {n} week{n === 1 ? '' : 's'}
                    </span>
                    <IconButton
                      icon={<Icon name="trash-2" size={14} />}
                      aria-label={'Remove season ' + s.name}
                      variant="ghost"
                      size="sm"
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
          </div>
          <Button variant="primary" size="sm" icon={<Icon name="plus" size={15} />} disabled={!name.trim() || !start} onClick={add}>
            Add season
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
