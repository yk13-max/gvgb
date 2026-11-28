import { useMemo, useState } from 'react';
import { Button, Icon } from '../ds/index.js';
import { shortName } from '../lib/names.js';
import { ratingSuggestions, shiftStats } from '../lib/strength.js';

// Players whose sides keep beating, or falling short of, what their ratings predicted.
// Signed in only — it is all about ratings. Applying or dismissing hides a player's
// suggestion on this device until they have played more matches: one change at a time,
// then let the results catch up before suggesting another.
const KEY = 'fufa.tb.dismissed';
const readDismissed = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch {
    return new Set();
  }
};
const sig = (s) => s.id + ':' + s.games;

export default function RatingSuggestions({ weeks, players, canEdit, onPatch }) {
  const [dismissed, setDismissed] = useState(readDismissed);
  const [open, setOpen] = useState(true);
  const all = useMemo(() => ratingSuggestions(weeks, players), [weeks, players]);
  const list = all.filter((s) => !dismissed.has(sig(s)));
  if (!list.length) return null;

  const dismiss = (s) => {
    const next = new Set(dismissed);
    next.add(sig(s));
    setDismissed(next);
    try {
      localStorage.setItem(KEY, JSON.stringify([...next].slice(-200)));
    } catch {
      // Without storage the suggestion simply comes back next visit.
    }
  };

  return (
    <section className="tb-suggest">
      <button type="button" className="tb-suggest-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Icon name="sliders-vertical" size={15} />
        <span>
          Rating suggestions <em>{list.length}</em>
        </span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} />
      </button>
      {open && (
        <>
          <p className="tb-suggest-note">
            From every match: how often each player’s side was expected to win, by the ratings at the time, against how
            often it did. Shown once there are at least 8 matches and the gap is too big to be luck.
          </p>
          <ul className="tb-suggest-list">
            {list.map((s) => {
              const p = players.find((x) => x.id === s.id);
              return (
                <li key={s.id} data-dir={s.delta > 0 ? 'up' : 'down'}>
                  <div className="tb-suggest-text">
                    <strong>{shortName(s.name)}</strong> <span className="tb-suggest-ovr">OVR {s.ovr}</span>
                    <div>
                      Their sides won {s.actualPct}% of {s.games} matches; the ratings expected about {s.expectedPct}%.{' '}
                      {s.delta > 0 ? 'Probably under-rated' : 'Probably over-rated'} — try{' '}
                      <b>
                        {s.delta > 0 ? '+' : ''}
                        {s.delta}
                      </b>
                      .
                    </div>
                  </div>
                  <div className="tb-suggest-actions">
                    {canEdit && p && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          onPatch(p.id, { stats: shiftStats(p.stats, s.delta) });
                          dismiss(s);
                        }}
                      >
                        Apply {s.delta > 0 ? '+' : ''}
                        {s.delta}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => dismiss(s)}>
                      Dismiss
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
