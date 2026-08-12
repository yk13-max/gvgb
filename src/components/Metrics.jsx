import { ABBR, SHORT, STATS, balanceScore, countPos, ovrAvg, ovrTotal, statAvg } from '../lib/model.js';

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

export default function Metrics({ teams }) {
  const { red, blue } = teams;
  if (!red.length || !blue.length) {
    return (
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
        Select a squad and balance to see the split.
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          borderTop: '1px solid var(--color-border)',
          paddingTop: 12,
        }}
      >
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
    </div>
  );
}
