import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../ds/index.js';
import { ask, examples, followUps } from '../lib/ask.js';
import { formatDate } from '../lib/whatsapp.js';

// A question box over the results. The answer is worked out from the recorded matches
// as you type; Enter keeps it, clears the box and lets the next question build on it
// ("and against?", "what about with Priya?", "streak?"). Recent questions are kept on
// this device only.

const RECENT_KEY = 'fufa.tb.asked.v1';
const RECENT_MAX = 8;

function readRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(list) ? list.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function remember(q) {
  const list = [q, ...readRecent().filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return list;
}

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v));
const show = (v) => (isDate(v) ? formatDate(v) : String(v).replace(/(\d{4}-\d{2}-\d{2})/g, (d) => formatDate(d)));

function Facts({ facts }) {
  if (!facts || !facts.length) return null;
  return (
    <dl className="tb-ask-facts">
      {facts.map(([label, value]) => (
        <div key={label} className="tb-ask-fact">
          <dt>{show(label)}</dt>
          <dd>{show(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Answer({ result, scope, compact }) {
  const [showMatches, setShowMatches] = useState(false);
  return (
    <div className="tb-ask-answer" data-mode={result.mode} data-compact={compact ? '1' : '0'}>
      <div className="tb-ask-headline">{show(result.headline)}</div>
      {result.sub && !compact && <div className="tb-ask-sub">{show(result.sub)}</div>}
      {scope && !compact && <div className="tb-ask-scope">In {scope} · change the season above for all time</div>}
      {!compact && (
        <>
          <Facts facts={result.facts} />
          {(result.sections || []).map((s) => (
            <div key={s.title} className="tb-ask-section">
              <div className="tb-ask-section-title">{s.title}</div>
              {s.line && <div className="tb-ask-section-line">{show(s.line)}</div>}
              {s.form && (
                <div className="tb-ask-form" aria-label={'Last ' + s.form.length + ' results'}>
                  {s.form.map((r, i) => (
                    <span key={i} className="tb-ask-pip" data-r={r}>
                      {r}
                    </span>
                  ))}
                </div>
              )}
              <Facts facts={s.facts} />
            </div>
          ))}
          {result.table && result.table.rows.length > 0 && (
            <div className="tb-ask-section">
              <div className="tb-ask-section-title">{result.table.title}</div>
              <ol className="tb-ask-table">
                {result.table.rows.slice(0, 12).map((r, i) => (
                  <li key={r.name + i}>
                    <span className="tb-ask-trank">{i + 1}</span>
                    <span className="tb-ask-tname">{r.name}</span>
                    <span className="tb-ask-tvalue">{show(r.value)}</span>
                  </li>
                ))}
                {result.table.rows.length > 12 && <li className="tb-ask-more">and {result.table.rows.length - 12} more</li>}
              </ol>
            </div>
          )}
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
        </>
      )}
    </div>
  );
}

export default function AskBar({ players, weeks, seasonLabel }) {
  const [text, setText] = useState('');
  const [thread, setThread] = useState([]); // [{ q, result }], oldest first
  const [openIdx, setOpenIdx] = useState(null); // an earlier answer opened back up
  const [recent, setRecent] = useState(readRecent);
  const inputRef = useRef(null);
  const last = thread.length ? thread[thread.length - 1] : null;
  const context = last ? last.result.subject : null;
  const live = useMemo(() => ask(text, players, weeks, context), [text, players, weeks, context]);
  const chips = useMemo(() => examples(players, weeks), [players, weeks]);
  const scope = seasonLabel && seasonLabel !== 'All time' ? seasonLabel : null;
  const next = useMemo(() => followUps(last ? last.result : null), [last]);

  // A changed season or roster changes every answer in the thread: recompute them in place.
  useEffect(() => {
    setThread((t) => {
      let ctx = null;
      return t.map((item) => {
        const result = ask(item.q, players, weeks, ctx);
        ctx = result.kind === 'answer' ? result.subject : ctx;
        return { ...item, result };
      });
    });
  }, [players, weeks]);

  function commit(q) {
    const question = (q == null ? text : q).trim();
    if (!question) return;
    const result = q == null ? live : ask(question, players, weeks, context);
    if (result.kind !== 'answer') {
      if (q != null) setText(question);
      return;
    }
    setThread((t) => [...t, { q: question, result }]);
    setOpenIdx(null);
    setRecent(remember(question));
    setText('');
    if (inputRef.current) inputRef.current.focus();
  }

  function startOver() {
    setThread([]);
    setOpenIdx(null);
    setText('');
  }

  const idle = !text.trim() && !thread.length;

  return (
    <div className="tb-ask" data-open={text.trim() || thread.length ? '1' : '0'}>
      {thread.length > 0 && (
        <div className="tb-ask-thread">
          {thread.map((item, i) => {
            const isLast = i === thread.length - 1;
            const open = isLast || openIdx === i;
            return (
              <div key={i} className="tb-ask-turn" data-last={isLast ? '1' : '0'}>
                <button type="button" className="tb-ask-q" onClick={() => !isLast && setOpenIdx(open ? null : i)} aria-expanded={open} disabled={isLast}>
                  <Icon name="message-circle" size={13} />
                  <span>{item.q}</span>
                </button>
                <Answer result={item.result} scope={scope} compact={!open} />
              </div>
            );
          })}
          {!text.trim() && next.length > 0 && (
            <div className="tb-ask-chips tb-ask-next" aria-label="Follow-up questions">
              {next.map((c) => (
                <button key={c} type="button" className="tb-ask-chip" onClick={() => commit(c)}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="tb-ask-row">
        <Icon name="search" size={16} />
        <input
          ref={inputRef}
          type="search"
          aria-label="Ask the results"
          placeholder={thread.length ? 'Ask a follow-up — e.g. and against?, what about with Priya?, streak?' : 'Ask the results — e.g. Jo with Sam, Jo vs Sam, who has played the most nights?'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
            if (e.key === 'Escape') setText('');
          }}
          enterKeyHint="search"
          autoComplete="off"
        />
        {text && (
          <button type="button" className="tb-ask-clear" aria-label="Clear question" onClick={() => setText('')}>
            <Icon name="x" size={14} />
          </button>
        )}
        {thread.length > 0 && (
          <button type="button" className="tb-ask-reset" onClick={startOver}>
            <Icon name="rotate-ccw" size={13} />
            <span>Start over</span>
          </button>
        )}
      </div>

      {idle && (chips.length > 0 || recent.length > 0) && (
        <div className="tb-ask-starters">
          {recent.length > 0 && (
            <div className="tb-ask-chips" aria-label="Recent questions">
              <span className="tb-ask-chiplabel">Recent</span>
              {recent.map((c) => (
                <button key={c} type="button" className="tb-ask-chip" data-recent="1" onClick={() => commit(c)}>
                  {c}
                </button>
              ))}
            </div>
          )}
          {chips.length > 0 && (
            <div className="tb-ask-chips" aria-label="Example questions">
              <span className="tb-ask-chiplabel">Try</span>
              {chips.map((c) => (
                <button key={c} type="button" className="tb-ask-chip" onClick={() => commit(c)}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {live.kind === 'nobody' && (
        <div className="tb-ask-note" role="status">
          No player by that name. Try a first name, a nickname, or two names with “with” or “vs” between them — or ask about everyone: “who has played the most nights?”, “biggest win”.
        </div>
      )}

      {live.kind === 'ambiguous' && (
        <div className="tb-ask-note" role="status">
          {live.which.map((a) => (
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

      {live.kind === 'answer' && (
        <div className="tb-ask-live" role="status">
          <Answer result={live} scope={scope} />
          <div className="tb-ask-hint">Press Enter to keep this answer and ask a follow-up.</div>
        </div>
      )}
    </div>
  );
}
