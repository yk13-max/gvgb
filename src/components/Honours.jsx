import { Button, Icon } from '../ds/index.js';
import { HONOURS, PICKED, backing, bestPlayer, frontRunners, hasStarted, isFinished, lead } from '../lib/honours.js';
import { initials, shortName } from '../lib/names.js';
import { matchWord, sortSeasons } from '../lib/seasons.js';
import { standings } from '../lib/standings.js';
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

function SeasonBlock({ season, seasons, weeks, players, today, canEdit, onEdit }) {
  const finished = isFinished(season, seasons, today);
  const started = hasStarted(season, today);
  const rows = standings(weeks, players);
  const best = bestPlayer(weeks, players);
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
            {finished ? ' · finished' : started ? ' · in progress' : ' · not started'}
            {min > 0 ? ' · ' + matchWord(min) + ' to place' : ''}
          </div>
        </div>
        {canEdit && (
          <Button variant="secondary" size="sm" icon={<Icon name="pencil" size={15} />} onClick={() => onEdit(season)}>
            {named ? 'Edit honours' : 'Name honours'}
          </Button>
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

export default function Honours({ seasons, weeks, players, today, canEdit, onBack, onEdit }) {
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
