import { useState } from 'react';
import { Button, Dialog, Icon } from '../ds/index.js';
import { HONOURS, PICKED, backing, bestPlayer, completion, frontRunners, hasStarted, isFinished, lead, tableOf } from '../lib/honours.js';
import { initials, shortName } from '../lib/names.js';
import { matchWord, sortSeasons } from '../lib/seasons.js';
import { weeksIn } from '../lib/seasons.js';
import { formatDate } from '../lib/whatsapp.js';
import Crest from './Crest.jsx';

// `live` is a season still running: the card shows who is in line for the honour and
// what they lead by, not who won it.
function Card({ honour, row, season, hero, live }) {
  const [key, label, icon, tone, blurb] = honour;
  const r = live ? row && row.row : row;
  return (
    <div className="tb-honour" data-tone={tone} data-hero={hero ? '1' : '0'} data-empty={r ? '0' : '1'} data-live={live ? '1' : '0'}>
      <div className="tb-honour-glyph" aria-hidden="true">
        <Icon name={icon} size={hero ? 120 : 84} strokeWidth={1.2} />
      </div>
      <div className="tb-honour-label">
        <Icon name={icon} size={14} />
        <span>{label}</span>
      </div>
      {r ? (
        <>
          <div className="tb-honour-medal" aria-hidden="true">
            {initials(r.name)}
          </div>
          <div className="tb-honour-name">
            {r.club && <Crest code={r.club} size={hero ? 26 : 16} className="tb-honour-crest" />}
            {hero ? r.name : shortName(r.name)}
          </div>
          <div className="tb-honour-back">
            {backing(r, key)}
            {live && (
              <span className="tb-honour-lead" data-short={row.needs > 0 ? '1' : '0'}>
                {' '}
                · {lead(row)}
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="tb-honour-medal" aria-hidden="true">
            ?
          </div>
          <div className="tb-honour-name tb-honour-tba">{live ? 'Nobody yet' : 'Not yet named'}</div>
          <div className="tb-honour-back">{blurb}</div>
        </>
      )}
      <div className="tb-honour-season">{live ? 'Front runner' : season.name}</div>
    </div>
  );
}

// What completing a season will do, and what it will record, before it is done.
function CompleteDialog({ season, weeks, players, onConfirm, onClose }) {
  const c = completion(season, weeks, players);
  const min = season.minGames || 0;
  const top = c.table.filter((r) => r.short === 0 && r.pct != null).slice(0, 3);
  const best = bestPlayer(weeks, players, c.table);
  const h = season.honours || {};
  const nameOf = (id) => (c.table.find((r) => r.id === id) || {}).name || 'someone no longer listed';
  const picked = h.winner != null && (!c.winner || h.winner !== c.winner.id) ? nameOf(h.winner) : null;
  const short = c.table.filter((r) => r.short > 0 && r.games > 0).length;
  // Level with the winner on win ratio: the table's tie-breaks decided it, and that is worth saying.
  const level = c.winner ? c.table.filter((r) => r.id !== c.winner.id && r.short === 0 && r.pct === c.winner.pct) : [];
  const lines = [
    ['Season winner', c.winner ? c.winner.name + ' · top of the table' : 'Nobody — no one has a result' + (min ? ' and ' + matchWord(min) : '')],
    ['Best player', best ? best.name + ' · ' + backing(best, 'player') : 'Nobody — no POTM awards'],
    ...PICKED.filter(([k]) => k !== 'winner').map(([k, label]) => [label, h[k] != null ? nameOf(h[k]) : null]),
  ];
  return (
    <Dialog
      open
      title={'Complete ' + season.name + '?'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" icon={<Icon name="check" size={15} />} onClick={() => onConfirm(c)}>
            Complete season
          </Button>
        </>
      }
    >
      <div className="tb-complete">
        <p className="tb-sync-note">
          Completing reveals the honours to everyone, locks this season’s nights — no new results, edits, deletions or
          nominations — and keeps the final table exactly as it stands. You can reopen it later.
        </p>
        <div className="tb-complete-h">Final top three</div>
        {top.length ? (
          <ol className="tb-complete-top">
            {top.map((r) => (
              <li key={r.id}>
                <span>{r.name}</span>
                <span className="tb-complete-n">
                  {r.won}–{r.lost} · {r.pct.toFixed(3)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="tb-complete-miss">Nobody has qualified for the table yet.</p>
        )}
        {short > 0 && (
          <p className="tb-complete-note">
            {short} player{short === 1 ? '' : 's'} played fewer than {matchWord(min)} and won’t take a place.
          </p>
        )}
        <div className="tb-complete-h">Honours</div>
        <ul className="tb-complete-list">
          {lines.map(([label, v]) => (
            <li key={label} data-missing={v ? '0' : '1'}>
              <span>{label}</span>
              <span>{v || 'Not named yet'}</span>
            </li>
          ))}
        </ul>
        {level.length > 0 && (
          <p className="tb-complete-note">
            Level at the top on win ratio with {level.map((r) => r.name).join(', ')}. The table’s tie-breaks — more matches played,
            then more wins, then more nominations — put {c.winner.name} first. You can change the winner afterwards with Edit
            honours.
          </p>
        )}
        {picked && <p className="tb-complete-note">The winner is set from the table, replacing {picked}, who was named by hand.</p>}
        {lines.some(([, v]) => !v) && <p className="tb-complete-note">You can complete anyway and name the rest later.</p>}
      </div>
    </Dialog>
  );
}

function SeasonBlock({ season, seasons, weeks, players, today, canEdit, onEdit, onComplete, onReopen }) {
  const finished = isFinished(season, seasons, today);
  const started = hasStarted(season, today);
  const [asking, setAsking] = useState(null); // 'complete' | 'reopen'
  // A completed season is judged by the table it was completed with.
  const rows = tableOf(season, weeks, players);
  const best = bestPlayer(weeks, players, rows);
  // Best player is worked out, not picked; everything else comes from the organiser.
  const rowOf = (key) => (key === 'player' ? best : h[key] == null ? null : rows.find((r) => r.id === h[key]) || null);
  const h = season.honours || {};
  const named = PICKED.filter(([k]) => h[k] != null).length;
  const nights = weeks.length;
  // While the season runs, the cards show who is in line, worked out from the table —
  // never the organiser's early picks, which stay private until the season is done.
  const live = started && !finished;
  const min = season.minGames || 0;
  const fr = live ? frontRunners(weeks, players, min) : null;
  const cards = (
    <div className="tb-honours">
      <Card honour={HONOURS[0]} row={live ? fr.winner : rowOf('winner')} season={season} hero live={live} />
      <div className="tb-honours-grid">
        {HONOURS.slice(1).map((hn) => (
          <Card key={hn[0]} honour={hn} row={live ? fr[hn[0]] : rowOf(hn[0])} season={season} live={live} />
        ))}
      </div>
    </div>
  );

  return (
    <section className="tb-season" data-finished={finished ? '1' : '0'}>
      <div className="tb-season-head">
        <div>
          <div className="tb-season-name">{season.name}</div>
          <div className="tb-season-sub">
            From {formatDate(season.start)} · {nights} night{nights === 1 ? '' : 's'}
            {season.completed ? '' : finished ? ' · finished' : started ? ' · in progress' : ' · not started'}
            {min > 0 ? ' · ' + matchWord(min) + ' to place' : ''}
            {season.completed ? ' · completed ' + formatDate(season.completed.on) : ''}
          </div>
        </div>
        {canEdit && (
          <div className="tb-season-acts">
            <Button variant="secondary" size="sm" icon={<Icon name="pencil" size={15} />} onClick={() => onEdit(season)}>
              {named ? 'Edit honours' : 'Name honours'}
            </Button>
            {season.completed ? (
              <Button variant="secondary" size="sm" icon={<Icon name="lock-open" size={15} />} onClick={() => setAsking('reopen')}>
                Reopen season
              </Button>
            ) : (
              started && (
                <Button variant="primary" size="sm" icon={<Icon name="check" size={15} />} onClick={() => setAsking('complete')}>
                  Complete season
                </Button>
              )
            )}
          </div>
        )}
        {asking === 'complete' && (
          <CompleteDialog
            season={season}
            weeks={weeks}
            players={players}
            onClose={() => setAsking(null)}
            onConfirm={(c) => {
              setAsking(null);
              onComplete(season, c);
            }}
          />
        )}
        {asking === 'reopen' && (
          <Dialog
            open
            title={'Reopen ' + season.name + '?'}
            onClose={() => setAsking(null)}
            footer={
              <>
                <Button variant="secondary" size="sm" onClick={() => setAsking(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setAsking(null);
                    onReopen(season);
                  }}
                >
                  Reopen season
                </Button>
              </>
            }
          >
            <p className="tb-sync-note">
              Its nights unlock for editing, and the table goes back to being worked out from the matches. The honours stay as
              named, the winner included{isFinished({ ...season, completed: null }, seasons, today) ? '' : ', but are hidden again until the next season starts'}.
            </p>
          </Dialog>
        )}
      </div>

      {finished ? (
        cards
      ) : (
        <>
          <div className="tb-season-wait" data-live={live ? '1' : '0'}>
            <Icon name="trophy" size={live ? 22 : 28} />
            <div>
              <div className="tb-season-wait-head">{started ? 'Season in progress' : 'Season not started'}</div>
              <div className="tb-season-wait-sub">
                {started
                  ? 'Front runners as the table stands' +
                    (nights ? '' : ' — nothing played yet') +
                    '. Honours are revealed when the next season starts.' +
                    (canEdit && named ? ' ' + named + ' of 4 already named.' : canEdit ? ' You can name them now; nobody else sees them until then.' : '')
                  : 'Starts ' + formatDate(season.start) + '.'}
              </div>
            </div>
          </div>
          {live && cards}
        </>
      )}
    </section>
  );
}

export default function Honours({ seasons, weeks, players, today, canEdit, onBack, onEdit, onComplete, onReopen }) {
  const sorted = sortSeasons(seasons).slice().reverse();
  return (
    <div className="tb-page-stats tb-honourspage">
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
            Season honours
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {sorted.length ? 'Winner and the best in each line, season by season' : 'No seasons yet'}
          </div>
        </div>
        <Button variant="secondary" size="sm" icon={<Icon name="arrow-left" size={15} />} onClick={onBack}>
          Back to table
        </Button>
      </div>

      <div className="tb-honourslist">
        {sorted.map((season) => (
          <SeasonBlock
            key={season.id}
            season={season}
            seasons={seasons}
            weeks={weeksIn(weeks, String(season.id), seasons)}
            players={players}
            today={today}
            canEdit={canEdit}
            onEdit={onEdit}
            onComplete={onComplete}
            onReopen={onReopen}
          />
        ))}
        {!sorted.length && (
          <div className="tb-histempty">
            {canEdit ? 'Create a season from the Seasons button on Results or the Table, and its honours appear here once it ends.' : 'Nothing to show yet.'}
          </div>
        )}
      </div>
    </div>
  );
}
