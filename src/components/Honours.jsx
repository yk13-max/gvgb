import { Button, Icon } from '../ds/index.js';
import { HONOURS, PICKED, backing, bestPlayer, hasStarted, isFinished } from '../lib/honours.js';
import { initials, shortName } from '../lib/names.js';
import { sortSeasons } from '../lib/seasons.js';
import { standings } from '../lib/standings.js';
import { weeksIn } from '../lib/seasons.js';
import { formatDate } from '../lib/whatsapp.js';

function Card({ honour, row, season, hero }) {
  const [key, label, icon, tone, blurb] = honour;
  return (
    <div className="tb-honour" data-tone={tone} data-hero={hero ? '1' : '0'} data-empty={row ? '0' : '1'}>
      <div className="tb-honour-glyph" aria-hidden="true">
        <Icon name={icon} size={hero ? 120 : 84} strokeWidth={1.2} />
      </div>
      <div className="tb-honour-label">
        <Icon name={icon} size={14} />
        <span>{label}</span>
      </div>
      {row ? (
        <>
          <div className="tb-honour-medal" aria-hidden="true">
            {initials(row.name)}
          </div>
          <div className="tb-honour-name">{hero ? row.name : shortName(row.name)}</div>
          <div className="tb-honour-back">{backing(row, key)}</div>
        </>
      ) : (
        <>
          <div className="tb-honour-medal" aria-hidden="true">
            ?
          </div>
          <div className="tb-honour-name tb-honour-tba">Not yet named</div>
          <div className="tb-honour-back">{blurb}</div>
        </>
      )}
      <div className="tb-honour-season">{season.name}</div>
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

  return (
    <section className="tb-season" data-finished={finished ? '1' : '0'}>
      <div className="tb-season-head">
        <div>
          <div className="tb-season-name">{season.name}</div>
          <div className="tb-season-sub">
            From {formatDate(season.start)} · {nights} night{nights === 1 ? '' : 's'}
            {finished ? ' · finished' : started ? ' · in progress' : ' · not started'}
          </div>
        </div>
        {canEdit && (
          <Button variant="secondary" size="sm" icon={<Icon name="pencil" size={15} />} onClick={() => onEdit(season)}>
            {named ? 'Edit honours' : 'Name honours'}
          </Button>
        )}
      </div>

      {finished ? (
        <div className="tb-honours">
          <Card honour={HONOURS[0]} row={rowOf('winner')} season={season} hero />
          <div className="tb-honours-grid">
            {HONOURS.slice(1).map((hn) => (
              <Card key={hn[0]} honour={hn} row={rowOf(hn[0])} season={season} />
            ))}
          </div>
        </div>
      ) : (
        <div className="tb-season-wait">
          <Icon name="trophy" size={28} />
          <div>
            <div className="tb-season-wait-head">
              {started ? 'Season in progress' : 'Season not started'}
            </div>
            <div className="tb-season-wait-sub">
              {started
                ? 'Honours are revealed when the next season starts.' +
                  (canEdit && named ? ' ' + named + ' of 4 already named.' : canEdit ? ' You can name them now; nobody else sees them until then.' : '')
                : 'Starts ' + formatDate(season.start) + '.'}
            </div>
          </div>
        </div>
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
