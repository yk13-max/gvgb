import { useMemo, useState } from 'react';
import { Icon } from '../ds/index.js';
import { ask, examples } from '../lib/ask.js';
import { formatDate } from '../lib/whatsapp.js';

// A question box over the results. Type names, with "vs" between them to count
// meetings; the answer is worked out from the recorded matches as you type.
export default function AskBar({ players, weeks, seasonLabel }) {
  const [text, setText] = useState('');
  const [showMatches, setShowMatches] = useState(false);
  const result = useMemo(() => ask(text, players, weeks), [text, players, weeks]);
  const chips = useMemo(() => examples(players, weeks), [players, weeks]);
  const scope = seasonLabel && seasonLabel !== 'All time' ? seasonLabel : null;

  return (
    <div className="tb-ask" data-open={text.trim() ? '1' : '0'}>
      <div className="tb-ask-row">
        <Icon name="search" size={16} />
        <input
          type="search"
          aria-label="Ask the results"
          placeholder="Ask the results — e.g. Jo with Sam, Jo vs Sam, or Jo, Sam and Priya together"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setShowMatches(false);
          }}
          enterKeyHint="search"
          autoComplete="off"
        />
        {text && (
          <button type="button" className="tb-ask-clear" aria-label="Clear question" onClick={() => setText('')}>
            <Icon name="x" size={14} />
          </button>
        )}
      </div>

      {!text.trim() && chips.length > 0 && (
        <div className="tb-ask-chips" aria-label="Example questions">
          {chips.map((c) => (
            <button key={c} type="button" className="tb-ask-chip" onClick={() => setText(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      {result.kind === 'nobody' && (
        <div className="tb-ask-note" role="status">
          No player by that name. Try a first name, a nickname, or two names with “with” or “vs” between them.
        </div>
      )}

      {result.kind === 'ambiguous' && (
        <div className="tb-ask-note" role="status">
          {result.which.map((a) => (
            <div key={a.text}>
              Which {a.text.replace(/\b\w/g, (c) => c.toUpperCase())}?{' '}
              {a.options.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && ' or '}
                  <button type="button" className="tb-ask-link" onClick={() => setText(text.replace(new RegExp('\\b' + a.text + '\\b', 'i'), p.name))}>
                    {p.name}
                  </button>
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {result.kind === 'answer' && (
        <div className="tb-ask-answer" role="status" data-mode={result.mode}>
          <div className="tb-ask-headline">{result.headline}</div>
          {scope && <div className="tb-ask-scope">In {scope} · change the season above for all time</div>}
          <dl className="tb-ask-facts">
            {result.facts.map(([label, value]) => (
              <div key={label} className="tb-ask-fact">
                <dt>{label}</dt>
                <dd>{/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? formatDate(value) : value}</dd>
              </div>
            ))}
          </dl>
          {result.matches.length > 0 && (
            <>
              <button type="button" className="tb-ask-toggle" onClick={() => setShowMatches((v) => !v)} aria-expanded={showMatches}>
                <Icon name={showMatches ? 'chevron-up' : 'chevron-down'} size={13} />
                {showMatches ? 'Hide the matches' : 'Show the ' + result.matches.length + (result.matches.length === 1 ? ' match' : ' matches')}
              </button>
              {showMatches && (
                <ul className="tb-ask-matches">
                  {result.matches.slice(0, 30).map((m) => (
                    <li key={m.date + '-' + m.n} data-result={m.result}>
                      <span className="tb-ask-mdate">{formatDate(m.date)}</span>
                      <span className="tb-ask-mno">{m.of > 1 ? 'Match ' + m.n : ''}</span>
                      <span className="tb-ask-mscore">{m.score || 'no score'}</span>
                      <span className="tb-ask-mnote">
                        {m.side === 'red' || m.side === 'blue' ? (
                          <>
                            <span className="tb-ask-side" data-side={m.side}>
                              {m.side}
                            </span>{' '}
                            {m.result === 'won' ? 'won' : m.result === 'lost' ? 'lost' : m.result === 'level' ? 'level' : ''}
                          </>
                        ) : (
                          m.note
                        )}
                      </span>
                    </li>
                  ))}
                  {result.matches.length > 30 && <li className="tb-ask-more">and {result.matches.length - 30} more</li>}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
