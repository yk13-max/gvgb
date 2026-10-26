import { useState } from 'react';
import { Button, Dialog, Icon } from '../ds/index.js';
import { EMPTY_HONOURS, PICKED, backing, bestPlayer, candidates } from '../lib/honours.js';
import { matchWord, moreMatches } from '../lib/seasons.js';

export default function HonoursDialog({ season, weeks, players, onSave, onClose }) {
  const [h, setH] = useState({ ...EMPTY_HONOURS, ...(season.honours || {}) });
  const any = weeks.length > 0;
  const best = bestPlayer(weeks, players);
  const min = season.minGames || 0;

  return (
    <Dialog
      open
      title={'Honours · ' + season.name}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={() => onSave(season.id, h)} disabled={!any}>
            Save honours
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="tb-sync-note">
          {any
            ? 'Anyone who turned out this season can be named. Each list leads with the obvious pick — the table order for the winner, nominations in that line for the rest.' +
              (min ? ' To be named season winner a player needs ' + matchWord(min) + ' this season.' : '')
            : 'Nobody has played in this season yet.'}
        </div>
        <div className="tb-honour-auto">
          <span className="tb-honour-pick-label">
            <Icon name="crown" size={14} />
            Best player
          </span>
          <span>{best ? best.name + ' · ' + backing(best, 'player') : 'Nobody has a POTM award yet'}</span>
          <span className="tb-honour-auto-note">Worked out from the season\u2019s player-of-the-match awards, not picked.</span>
        </div>
        {PICKED.map(([key, label, icon]) => {
          const list = candidates(weeks, players, key, min);
          return (
            <label key={key} className="tb-honour-pick" data-key={key}>
              <span className="tb-honour-pick-label">
                <Icon name={icon} size={14} />
                {label}
              </span>
              <select
                value={h[key] == null ? '' : String(h[key])}
                disabled={!any}
                onChange={(e) => setH((x) => ({ ...x, [key]: e.target.value === '' ? null : Number(e.target.value) }))}
              >
                <option value="">— not named —</option>
                {list.map((r) => (
                  // Short of the minimum: listed so the table still reads in order, but
                  // can't be picked — unless already named before the minimum was set.
                  <option key={r.id} value={String(r.id)} disabled={r.short > 0 && h[key] !== r.id}>
                    {r.name} · {backing(r, key)}
                    {r.short > 0 ? ' · needs ' + moreMatches(r.short) : ''}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    </Dialog>
  );
}
