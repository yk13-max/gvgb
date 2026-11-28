import { useState } from 'react';
import { Button, Dialog, Icon, IconButton, Input, Switch } from '../ds/index.js';
import { byName, shortName } from '../lib/names.js';
import { AWARDS } from '../lib/weeks.js';
import { BLUE_LABEL, RED_LABEL, formatDate } from '../lib/whatsapp.js';

function ScoreBox({ label, aria, color, value, onChange, showLabel = true }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Kept in the layout when hidden so every row's inputs line up. */}
      <span
        aria-hidden={!showLabel}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-bold)',
          letterSpacing: 'var(--tracking-wide)',
          color,
          visibility: showLabel ? 'visible' : 'hidden',
        }}
      >
        {label}
      </span>
      <input
        className="tb-scoreinput"
        type="number"
        min="0"
        max="99"
        inputMode="numeric"
        aria-label={aria || label + ' score'}
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Math.max(0, Math.min(99, Number(e.target.value))))}
      />
    </div>
  );
}

const sig = (list) =>
  (list || [])
    .map((p) => p.id)
    .sort((a, b) => a - b)
    .join(',');

// The sides of a recorded match, editable: tap the arrows to send a player across, the
// cross to take them off, or pick someone from the roster to put them on.
function SideEditor({ label, color, side, list, other, onMove, onRemove, onAdd, roster }) {
  const taken = new Set([...list, ...other].map((p) => p.id));
  const free = roster.filter((p) => !taken.has(p.id)).sort(byName);
  return (
    <div className="tb-sides-col">
      <div className="tb-sides-head" style={{ color }}>
        {label} <span>{list.length}</span>
      </div>
      {list.length === 0 && <div className="tb-sides-empty">Nobody on this side.</div>}
      {list.map((p) => (
        <div key={p.id} className="tb-sides-row">
          <span className="tb-sides-name">{shortName(p.name)}</span>
          <IconButton
            icon={<Icon name="arrow-left-right" size={14} />}
            aria-label={'Move ' + p.name + ' to ' + (side === 'red' ? 'BLUE' : 'RED')}
            variant="ghost"
            size="sm"
            onClick={() => onMove(p.id)}
          />
          <IconButton
            icon={<Icon name="x" size={14} />}
            aria-label={'Take ' + p.name + ' off ' + label}
            variant="ghost"
            size="sm"
            onClick={() => onRemove(p.id)}
          />
        </div>
      ))}
      {free.length > 0 && (
        <select
          className="tb-sides-add"
          aria-label={'Add a player to ' + label}
          value=""
          onChange={(e) => {
            const p = free.find((x) => String(x.id) === e.target.value);
            if (p) onAdd({ id: p.id, name: p.name });
          }}
        >
          <option value="">+ Add player</option>
          {free.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export default function RecordResultDialog({
  teams,
  teamSize,
  match,
  weeks,
  existing,
  players = [],
  lockedBy = () => null,
  onSave,
  onClose,
}) {
  const [date, setDate] = useState(existing ? existing.date : match.date);
  const [played, setPlayed] = useState(existing ? existing.match.played : true);
  const [venue, setVenue] = useState(existing ? existing.venue || '' : match.venue || '');
  // A session is usually several games with the same two sides, so the scores are a
  // list. Editing is always one match — that is the thing you opened.
  const [rows, setRows] = useState(() => [
    {
      red: existing && existing.match.redScore != null ? existing.match.redScore : '',
      blue: existing && existing.match.blueScore != null ? existing.match.blueScore : '',
    },
  ]);

  // A recorded match keeps its own sides, and those can be put right here — someone
  // swapped bibs at half time, or the night's squad was entered wrong. A new result is
  // logged against the board, which is where its sides get changed.
  const [sides, setSides] = useState(() =>
    existing
      ? { red: existing.match.red || [], blue: existing.match.blue || [] }
      : {
          red: teams.red.map((p) => ({ id: p.id, name: p.name })),
          blue: teams.blue.map((p) => ({ id: p.id, name: p.name })),
        }
  );
  const flip = (k) => (k === 'red' ? 'blue' : 'red');
  const move = (from, id) =>
    setSides((s) => {
      const p = s[from].find((x) => x.id === id);
      return { [from]: s[from].filter((x) => x.id !== id), [flip(from)]: [...s[flip(from)], p] };
    });
  const removeFrom = (from, id) => setSides((s) => ({ ...s, [from]: s[from].filter((x) => x.id !== id) }));
  const addTo = (to, p) => setSides((s) => ({ ...s, [to]: [...s[to], p] }));

  // The other matches that night played with the very same sides. A session is
  // usually several games between one pair of teams, so fixing the line-up of one
  // nearly always means fixing all of them.
  const home = existing ? weeks.find((w) => w.matches.some((m) => m.id === existing.match.id)) : null;
  const twins = existing && home
    ? home.matches.filter(
        (m) =>
          m.id !== existing.match.id &&
          sig(m.red) === sig(existing.match.red) &&
          sig(m.blue) === sig(existing.match.blue)
      )
    : [];
  const [allTwins, setAllTwins] = useState(true);
  const changedSides =
    !!existing && (sig(sides.red) !== sig(existing.match.red) || sig(sides.blue) !== sig(existing.match.blue));
  const emptySide = !sides.red.length || !sides.blue.length;
  // Anyone taken off this night entirely who holds one of its awards.
  const gone = existing && home
    ? AWARDS.filter(([k]) => {
        const id = home.awards && home.awards[k];
        if (id == null) return false;
        const stays = [...sides.red, ...sides.blue].some((p) => p.id === id);
        const elsewhere = home.matches.some(
          (m) =>
            m.id !== existing.match.id &&
            !(allTwins && twins.some((t) => t.id === m.id)) &&
            [...(m.red || []), ...(m.blue || [])].some((p) => p.id === id)
        );
        return !stays && !elsewhere;
      }).map(([k, label]) => {
        const id = home.awards[k];
        const who = [...(existing.match.red || []), ...(existing.match.blue || [])].find((p) => p.id === id);
        return label + (who ? ' (' + shortName(who.name) + ')' : '');
      })
    : [];

  // Which match of that week's session this is — a Friday can hold several.
  const week = weeks.find((w) => w.date === date);
  const already = week ? week.matches.filter((m) => !existing || m.id !== existing.match.id).length : 0;
  const count = existing || !played ? 1 : rows.length;
  // Every match is played to a winner, so a level score is not a result. Blank scores are
  // still allowed — a match can be logged before the score is known.
  const level = played && rows.some((r) => r.red !== '' && r.blue !== '' && Number(r.red) === Number(r.blue));
  const setRow = (i, patch) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  function save() {
    const matches =
      played && !existing
        ? rows.map((r) => ({
            played: true,
            redScore: r.red !== '' ? Number(r.red) : null,
            blueScore: r.blue !== '' ? Number(r.blue) : null,
            red: sides.red,
            blue: sides.blue,
          }))
        : [
            {
              id: existing ? existing.match.id : undefined,
              played,
              redScore: played && rows[0].red !== '' ? Number(rows[0].red) : null,
              blueScore: played && rows[0].blue !== '' ? Number(rows[0].blue) : null,
              red: sides.red,
              blue: sides.blue,
            },
            // The rest of the session's games with the same sides follow, scores untouched.
            ...(existing && changedSides && allTwins
              ? twins.map((m) => ({ ...m, red: sides.red, blue: sides.blue, date: home.date }))
              : []),
          ];
    onSave({ isNew: !existing, date, venue: venue.trim(), teamSize: existing ? existing.teamSize : teamSize, matches });
  }

  const note = existing
    ? formatDate(date) + ' · editing match ' + (already + 1 > 1 ? 'in' : 'of') + ' this session'
    : formatDate(date) +
      ' · ' +
      (count === 1
        ? already
          ? 'match ' + (already + 1) + ' of this session'
          : 'first match of this session'
        : 'matches ' + (already + 1) + '–' + (already + count) + ' of this session');

  return (
    <Dialog
      open
      title={existing ? 'Edit match' : count > 1 ? 'Record ' + count + ' matches' : 'Record match'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save} disabled={!date || level || emptySide || !!lockedBy(date)}>
            {count > 1 ? 'Save ' + count + ' matches' : 'Save'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <Input
            label="Date played"
            type="date"
            style={{ flex: 1, minWidth: 0 }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            label="Pitch"
            placeholder="optional"
            style={{ flex: 1, minWidth: 0 }}
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          />
        </div>
        {date && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            {note}
          </div>
        )}
        {date && lockedBy(date) && (
          <div className="tb-sync-warn">
            {lockedBy(date).name} is complete, so nothing can be recorded on this date. Pick another date, or reopen the season on
            the Honours page.
          </div>
        )}

        <Switch
          checked={played}
          onChange={(e) => setPlayed(e.target.checked)}
          label={existing || count === 1 ? 'Match was played' : 'Matches were played'}
          style={{ fontSize: 'var(--text-sm)' }}
        />

        {played ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((r, i) => (
              <div key={i} className="tb-scorerow">
                {!existing && rows.length > 1 && <span className="tb-scorerow-n">{already + i + 1}</span>}
                <ScoreBox
                  label="RED"
                  aria={rows.length > 1 ? 'RED score, match ' + (already + i + 1) : 'RED score'}
                  showLabel={i === 0}
                  color="var(--team-red)"
                  value={r.red}
                  onChange={(v) => setRow(i, { red: v })}
                />
                <span
                  aria-hidden="true"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-tertiary)', paddingBottom: 10 }}
                >
                  –
                </span>
                <ScoreBox
                  label="BLUE"
                  aria={rows.length > 1 ? 'BLUE score, match ' + (already + i + 1) : 'BLUE score'}
                  showLabel={i === 0}
                  color="var(--team-blue)"
                  value={r.blue}
                  onChange={(v) => setRow(i, { blue: v })}
                />
                {!existing && rows.length > 1 && (
                  <IconButton
                    icon={<Icon name="trash-2" size={14} />}
                    aria-label={'Remove match ' + (already + i + 1)}
                    variant="ghost"
                    size="sm"
                    style={{ alignSelf: 'flex-end', marginBottom: 4 }}
                    onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                  />
                )}
              </div>
            ))}
            {level && (
              <div
                role="alert"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-warning-strong)',
                  background: 'var(--color-warning-subtle)',
                  border: '1px solid var(--amber-400)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '7px 10px',
                }}
              >
                Scores can\u2019t be level — every match is played to a winner.
              </div>
            )}
            {!existing && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Icon name="plus" size={15} />}
                style={{ alignSelf: 'flex-start' }}
                onClick={() => setRows((rs) => [...rs, { red: '', blue: '' }])}
              >
                Add another match
              </Button>
            )}
          </div>
        ) : (
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-warning-strong)',
              background: 'var(--color-warning-subtle)',
              border: '1px solid var(--amber-400)',
              borderRadius: 'var(--radius-sm)',
              padding: '7px 10px',
            }}
          >
            Logged as called off — the teams are kept, without a score.
          </div>
        )}

        {existing ? (
          <div className="tb-sides">
            <div className="tb-sides-title">Teams</div>
            <div className="tb-sides-cols">
              {[
                ['red', RED_LABEL, 'var(--team-red)'],
                ['blue', BLUE_LABEL, 'var(--team-blue)'],
              ].map(([k, label, color]) => (
                <SideEditor
                  key={k}
                  side={k}
                  label={label}
                  color={color}
                  list={sides[k]}
                  other={sides[flip(k)]}
                  roster={players}
                  onMove={(id) => move(k, id)}
                  onRemove={(id) => removeFrom(k, id)}
                  onAdd={(p) => addTo(k, p)}
                />
              ))}
            </div>
            {emptySide && <div className="tb-sync-warn">Each side needs at least one player.</div>}
            {!emptySide && sides.red.length !== sides.blue.length && (
              <div className="tb-sides-note">
                Uneven sides — {sides.red.length} v {sides.blue.length}. Fine if that is how it was played.
              </div>
            )}
            {changedSides && twins.length > 0 && (
              <Switch
                checked={allTwins}
                onChange={(e) => setAllTwins(e.target.checked)}
                label={
                  'Also change the other ' +
                  (twins.length === 1 ? 'match' : twins.length + ' matches') +
                  ' that night with these sides'
                }
                style={{ fontSize: 'var(--text-sm)' }}
              />
            )}
            {changedSides && gone.length > 0 && (
              <div className="tb-sides-note">
                {gone.join(', ')} — no longer played that night. Change the award from the week’s awards if it should
                move.
              </div>
            )}
            {changedSides && (
              <div className="tb-sides-note">
                Results, the table and honours recount from the new sides. Anyone added keeps the ratings they have now
                as that night’s snapshot.
              </div>
            )}
          </div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)', color: 'var(--color-text-tertiary)' }}>
            {count > 1 ? 'The same two sides for all ' + count + ' matches.' : 'The sides as drafted.'}
          </div>
          {[
            [RED_LABEL, sides.red],
            [BLUE_LABEL, sides.blue],
          ].map(([label, list]) => (
            <div key={label}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                {label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-tertiary)',
                  lineHeight: 'var(--leading-normal)',
                }}
              >
                {list.map((p) => shortName(p.name)).join(', ')}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </Dialog>
  );
}
