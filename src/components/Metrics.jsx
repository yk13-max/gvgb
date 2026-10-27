import { ABBR, SHORT, STATS, balanceScore, countPos, overall, ovrAvg, ovrTotal, statAvg } from '../lib/model.js';
import { INFLUENCE, influencePoints } from '../lib/strength.js';
import { formula } from '../lib/formula.js';

function CompareRow({ k, r, b }) {
  const rw = (r / 100) * 100;
  const bw = (b / 100) * 100;
  const lead = r > b ? 'red' : b > r ? 'blue' : null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 42px 1fr', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-2xs)',
            color: lead === 'red' ? 'var(--team-red)' : 'var(--color-text-tertiary)',
          }}
        >
          {Math.round(r)}
        </span>
        <div
          style={{
            width: '100%',
            height: 5,
            background: 'var(--slate-100)',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            justifyContent: 'flex-end',
            overflow: 'hidden',
          }}
        >
          <div style={{ width: rw + '%', height: '100%', background: 'var(--team-red)', opacity: lead === 'red' ? 1 : 0.45 }} />
        </div>
      </div>
      <div
        style={{
          textAlign: 'center',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-2xs)',
          letterSpacing: 'var(--tracking-wide)',
          color: 'var(--color-text-secondary)',
        }}
      >
        {ABBR[k]}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: '100%', height: 5, background: 'var(--slate-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <div style={{ width: bw + '%', height: '100%', background: 'var(--team-blue)', opacity: lead === 'blue' ? 1 : 0.45 }} />
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-2xs)',
            color: lead === 'blue' ? 'var(--team-blue)' : 'var(--color-text-tertiary)',
          }}
        >
          {Math.round(b)}
        </span>
      </div>
    </div>
  );
}

function TeamHead({ team, list }) {
  const col = team === 'red' ? 'var(--team-red)' : 'var(--team-blue)';
  return (
    <div style={{ flex: 1, borderTop: '2px solid ' + col, paddingTop: 8 }}>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-bold)',
          letterSpacing: 'var(--tracking-wide)',
          color: col,
        }}
      >
        {team.toUpperCase()}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--weight-bold)',
          color: 'var(--color-text-primary)',
          lineHeight: 1.1,
        }}
      >
        {ovrAvg(list).toFixed(1)}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-2xs)',
          color: 'var(--color-text-tertiary)',
          letterSpacing: 'var(--tracking-wide)',
        }}
      >
        AVG OVR · TOTAL {ovrTotal(list)}
      </div>
    </div>
  );
}

function PositionMix({ red, blue }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-2xs)',
          letterSpacing: 'var(--tracking-widest)',
          textTransform: 'uppercase',
          color: 'var(--color-text-tertiary)',
        }}
      >
        Position mix
      </div>
      {['Goalkeeper', 'Defender', 'Midfielder', 'Striker', 'Any'].map((pos) => {
        const r = countPos(red, pos);
        const b = countPos(blue, pos);
        if (!r && !b) return null;
        return (
          <div
            key={pos}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span style={{ color: 'var(--team-red)' }}>{r}</span>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                letterSpacing: 'var(--tracking-wide)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              {SHORT[pos]}
            </span>
            <span style={{ color: 'var(--team-blue)' }}>{b}</span>
          </div>
        );
      })}
    </div>
  );
}

// How much results count when balancing. Ratings stay as they are; this only changes
// how strong each player counts as when the sides are split.
function Influence({ value, onChange, teams, strength }) {
  const { red, blue } = teams;
  const counting = value !== 'off' && red.length && blue.length;
  return (
    <div className="tb-influence">
      <div className="tb-influence-head">
        <span>Results in balancing</span>
        <div className="tb-viewtoggle" role="group" aria-label="Results in balancing">
          {Object.entries(INFLUENCE).map(([k, v]) => (
            <button key={k} type="button" data-on={value === k ? '1' : '0'} aria-pressed={value === k} onClick={() => onChange(k)}>
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="tb-influence-note">
        {value === 'off'
          ? 'Sides are split on ratings alone.'
          : 'Each player counts as up to ' + influencePoints(value) + ' points stronger or weaker by their record and last ' + formula().results.form + '. Ratings are not changed. Re-balance to use it.'}
      </div>
      {counting ? (
        <div className="tb-influence-now">
          With results: balance <strong>{balanceScore(red, blue, strength)}</strong>/100 · Red {ovrAvg(red, strength).toFixed(1)} v Blue {ovrAvg(blue, strength).toFixed(1)}
        </div>
      ) : null}
    </div>
  );
}

export default function Metrics({ teams, showValues = true, influence = 'off', onInfluence, strength = overall }) {
  const { red, blue } = teams;
  if (!red.length || !blue.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {showValues && onInfluence && <Influence value={influence} onChange={onInfluence} teams={teams} strength={strength} />}
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          {showValues ? 'Select a squad and balance to see the split.' : 'Nobody has balanced a side yet.'}
        </div>
      </div>
    );
  }
  // Every number in the readout is an average of ratings. Signed out, the one thing
  // left that isn't is the shape of each side.
  if (!showValues) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-normal)' }}>
          Ratings and the balance readout are hidden until you sign in from the shared-data button.
        </div>
        <PositionMix red={red} blue={blue} />
      </div>
    );
  }
  const score = balanceScore(red, blue);
  const delta = Math.abs(ovrAvg(red) - ovrAvg(blue));
  const edge = (t, o) => {
    const diffs = STATS.map((k) => ({ k, d: statAvg(t, k) - statAvg(o, k) })).sort((a, b) => b.d - a.d);
    return { best: diffs[0], worst: diffs[diffs.length - 1] };
  };
  const rE = edge(red, blue);
  const bE = edge(blue, red);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {onInfluence && <Influence value={influence} onChange={onInfluence} teams={teams} strength={strength} />}
      <div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-2xs)',
            letterSpacing: 'var(--tracking-widest)',
            textTransform: 'uppercase',
            color: 'var(--color-text-tertiary)',
            marginBottom: 6,
          }}
        >
          Balance
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-4xl)',
              fontWeight: 'var(--weight-bold)',
              color: score >= 90 ? 'var(--color-primary)' : score >= 75 ? 'var(--color-accent)' : 'var(--color-danger)',
              lineHeight: 1,
            }}
          >
            {score}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            /100 · Δ{delta.toFixed(1)} avg OVR
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <TeamHead team="red" list={red} />
        <TeamHead team="blue" list={blue} />
      </div>
      <div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-2xs)',
            letterSpacing: 'var(--tracking-widest)',
            textTransform: 'uppercase',
            color: 'var(--color-text-tertiary)',
            marginBottom: 8,
          }}
        >
          Stat by stat
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {STATS.map((k) => (
            <CompareRow key={k} k={k} r={statAvg(red, k)} b={statAvg(blue, k)} />
          ))}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          borderTop: '1px solid var(--color-border)',
          paddingTop: 12,
        }}
      >
        {[
          ['red', rE],
          ['blue', bE],
        ].map(([t, e]) => (
          <div
            key={t}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              lineHeight: 'var(--leading-normal)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 'var(--weight-bold)',
                letterSpacing: 'var(--tracking-wide)',
                color: t === 'red' ? 'var(--team-red)' : 'var(--team-blue)',
              }}
            >
              {t.toUpperCase()}
            </span>{' '}
            strongest in <strong style={{ color: 'var(--color-text-primary)' }}>{ABBR[e.best.k]}</strong> (+
            {e.best.d.toFixed(1)}), weakest in{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>{ABBR[e.worst.k]}</strong> ({e.worst.d.toFixed(1)})
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
        <PositionMix red={red} blue={blue} />
      </div>
    </div>
  );
}
