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

function Table({ table }) {
  if (!table || !table.rows.length) return null;
  return (
    <ol className="tb-ask-table">
      {table.rows.slice(0, 12).map((r, i) => (
        <li key={r.name + i}>
          <span className="tb-ask-trank">{i + 1}</span>
          <span className="tb-ask-tname">{r.name}</span>
          <span className="tb-ask-tvalue">{show(r.value)}</span>
        </li>
      ))}
      {table.rows.length > 12 && <li className="tb-ask-more">and {table.rows.length - 12} more</li>}
    </ol>
  );
}

function Answer({ result, compact }) {
  const [showMatches, setShowMatches] = useState(!!result.expand);
  const bits = result.bits || [];
  return (
    <div className="tb-ask-answer" data-mode={result.mode} data-compact={compact ? '1' : '0'}>
      <div className="tb-ask-headline">{show(result.headline)}</div>
      {result.sub && !compact && <div className="tb-ask-sub">{show(result.sub)}</div>}
      {bits.length > 0 && !compact && <div className="tb-ask-scope">{bits.map(show).join(' · ')}</div>}
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
              {s.table && <Table table={s.table} />}
            </div>
          ))}
          {result.table && result.table.rows.length > 0 && (
            <div className="tb-ask-section">
              <div className="tb-ask-section-title">{result.table.title}</div>
              <Table table={result.table} />
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
                          // Who was on which side, then who won — the score alone is Red's and Blue's.
                          <>
                            {m.us && <span className="tb-ask-mwho">{m.us}</span>} on{' '}
                            <span className="tb-ask-side" data-side={m.side}>
                              {m.side}
                            </span>
                            {m.them && (
                              <>
                                {' '}v <span className="tb-ask-mwho">{m.them}</span> on{' '}
                                <span className="tb-ask-side" data-side={m.side === 'red' ? 'blue' : 'red'}>
                                  {m.side === 'red' ? 'blue' : 'red'}
                                </span>
                              </>
                            )}
                            {' · '}
                            <span className="tb-ask-mresult" data-result={m.result}>
                              {m.them
                                ? m.result === 'won'
                                  ? m.us + ' won'
                                  : m.result === 'lost'
                                    ? m.them + ' won'
                                    : m.result === 'level'
                                      ? 'level'
                                      : 'no score'
                                : m.result === 'won'
                                  ? 'won'
                                  : m.result === 'lost'
                                    ? 'lost'
                                    : m.result === 'level'
                                      ? 'level'
                                      : 'no score'}
                            </span>
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

// `weeks` is the whole history; the season picker's key sets the default slice, and a
// question can widen or narrow it itself ("all time", "since September", "last night").
export default function AskBar({ players, weeks, seasons = [], pickerKey, showValues = true, today }) {
  const [text, setText] = useState('');
  const [thread, setThread] = useState([]); // [{ q, result }], oldest first
  const [openIdx, setOpenIdx] = useState(null); // an earlier answer opened back up
  const [recent, setRecent] = useState(readRecent);
  // The starter chips show only while the box has focus: an empty box is a quiet line,
  // and the suggestions appear when you reach for it.
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const data = useMemo(() => ({ players, weeks, seasons, pickerKey, showValues, today: today || new Date().toISOString().slice(0, 10) }), [players, weeks, seasons, pickerKey, showValues, today]);
  const last = thread.length ? thread[thread.length - 1] : null;
  const context = last ? last.result.subject : null;
  const live = useMemo(() => ask(text, data, context), [text, data, context]);
  const chips = useMemo(() => examples(data), [data]);
  const next = useMemo(() => followUps(last ? last.result : null, showValues), [last, showValues]);

  // A changed season, slice or roster changes every answer in the thread: recompute them.
  useEffect(() => {
    setThread((t) => {
      let ctx = null;
      return t.map((item) => {
        const result = ask(item.q, data, ctx);
        ctx = result.kind === 'answer' ? result.subject : ctx;
        return { ...item, result };
      });
    });
  }, [data]);

  function commit(q) {
    const question = (q == null ? text : q).trim();
    if (!question) return;
    const result = q == null ? live : ask(question, data, context);
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
    <div
      className="tb-ask"
      data-open={text.trim() || thread.length ? '1' : '0'}
      onBlur={(e) => {
        // Focus moving to a chip or button inside the box keeps the chips up.
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
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
                <Answer result={item.result} compact={!open} />
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
          onFocus={() => setFocused(true)}
          type="search"
          aria-label="Ask the results"
          placeholder={thread.length ? 'Ask a follow-up — e.g. and against?, what about with Priya?, streak?, since September?' : 'Ask the results — e.g. Jo with Sam, scores where Jo was POTM, who has the best record?'}
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

      {idle && focused && (chips.length > 0 || recent.length > 0) && (
        // Pressing a chip must not blur the box first, or the chip is gone before the click lands.
        <div className="tb-ask-starters" onPointerDown={(e) => e.preventDefault()}>
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
          Nothing to go on there. Try a name or two (“Jo with Sam”, “Sam vs Jo”), a club or position (“who supports Arsenal?”, “which defender has the best record?”), a night (“last night”, “4/9”), or everyone (“who has the most POTMs?”, “biggest win”).
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
          <Answer key={text} result={live} />
          <div className="tb-ask-hint">Press Enter to keep this answer and ask a follow-up.</div>
        </div>
      )}
    </div>
  );
}
