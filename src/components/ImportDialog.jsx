import { useState } from 'react';
import { Button, Dialog, Icon } from '../ds/index.js';
import { bestMatch, parseList } from '../lib/parseList.js';

export default function ImportDialog({ players, onCancel, onConfirm }) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState(null);

  function scan() {
    const parsed = parseList(text);
    setRows(
      parsed.map((r) => {
        const m = bestMatch(r.name, players);
        return { ...r, matchId: m ? m.id : null, skip: !m && r.suspect };
      })
    );
  }

  const kept = rows ? rows.filter((r) => !r.skip) : [];
  const newCount = kept.filter((r) => !r.matchId).length;
  const opts = [{ value: '', label: '— new player —' }].concat(
    players.map((p) => ({ value: String(p.id), label: p.name }))
  );

  return (
    <Dialog
      open
      title="Paste signup list"
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          {rows ? (
            <Button variant="primary" size="sm" disabled={!kept.length} onClick={() => onConfirm(kept)}>
              Use {kept.length} player{kept.length === 1 ? '' : 's'}
            </Button>
          ) : (
            <Button variant="primary" size="sm" disabled={!text.trim()} onClick={scan}>
              Scan list
            </Button>
          )}
        </>
      }
    >
      {!rows ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              lineHeight: 'var(--leading-normal)',
            }}
          >
            Paste the WhatsApp thread or numbered list. Numbering, times and notes like “(GK)” are handled; header lines
            and chatter are pre-skipped for you to confirm.
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={11}
            aria-label="Signup list"
            placeholder={'1. Sam Okafor\n2. Jo (GK)\n3. Priya N\n4. Marcus'}
            style={{
              width: '100%',
              resize: 'vertical',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              lineHeight: 1.6,
              color: 'var(--color-text-primary)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-sm)',
              padding: 10,
            }}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            {kept.length - newCount} matched to your roster · {newCount} new
            {newCount ? ' — I’ll ask you for their stats next.' : ''}
            {rows.length - kept.length ? ' · ' + (rows.length - kept.length) + ' skipped' : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
            {rows.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 36px',
                  gap: 8,
                  alignItems: 'center',
                  padding: '6px 8px',
                  opacity: r.skip ? 0.5 : 1,
                  background: r.skip
                    ? 'var(--color-surface-sunken)'
                    : r.matchId
                      ? 'var(--color-surface)'
                      : 'var(--color-warning-subtle)',
                  border: '1px solid ' + (r.skip ? 'var(--color-border)' : r.matchId ? 'var(--color-border)' : 'var(--amber-400)'),
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--weight-semibold)',
                      color: 'var(--color-text-primary)',
                      textDecoration: r.skip ? 'line-through' : 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {r.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      color: 'var(--color-text-tertiary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {r.raw}
                  </div>
                </div>
                <select
                  disabled={r.skip}
                  aria-label={'Match for ' + r.name}
                  value={r.matchId ? String(r.matchId) : ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRows((rs) => rs.map((x, j) => (j === i ? { ...x, matchId: v ? Number(v) : null } : x)));
                  }}
                  style={{
                    width: '100%',
                    minWidth: 0,
                    minHeight: 34,
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-xs)',
                    padding: '5px 6px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--color-border-strong)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {opts.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={r.skip ? 'Include ' + r.name : 'Skip ' + r.name}
                  title={r.skip ? 'Include' : 'Skip this line'}
                  onClick={() => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, skip: !x.skip } : x)))}
                  style={{
                    cursor: 'pointer',
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: '1px solid var(--color-border-strong)',
                    borderRadius: 'var(--radius-xs)',
                    color: r.skip ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                  }}
                >
                  <Icon name={r.skip ? 'rotate-ccw' : 'x'} size={15} />
                </button>
              </div>
            ))}
            {!rows.length && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                No names found — check the paste and try again.
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
