import { useCallback, useEffect, useState } from 'react';
import { Button, Dialog, Icon } from '../ds/index.js';
import { formatDate } from '../lib/whatsapp.js';

// The change log and the backups, for password holders.
const REASON = { weekly: 'Weekly', manual: 'Saved by hand', 'before-restore': 'Before a restore' };

const when = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return formatDate(iso.slice(0, 10)) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};
// ISO dates inside a change ("Recorded 2 matches on 2026-09-04") read as the app writes them.
const readable = (t) => t.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (d) => formatDate(d));

export default function HousekeepingDialog({ sync, onClose }) {
  const [tab, setTab] = useState('changes');
  const [log, setLog] = useState(null);
  const [backups, setBackups] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  const load = useCallback(async () => {
    const [l, b] = await Promise.all([sync.loadLog(), sync.loadBackups()]);
    setLog(l.kind === 'log' ? l.entries : []);
    setBackups(b.kind === 'backups' ? b.list : []);
    if (l.kind !== 'log' || b.kind !== 'backups') setNote({ tone: 'warn', text: 'Could not load everything. Check the connection and try again.' });
  }, [sync]);

  useEffect(() => {
    load();
  }, [load]);

  async function backUp() {
    setBusy(true);
    const r = await sync.makeBackup();
    setBusy(false);
    setNote(r.kind === 'ok' ? { tone: 'ok', text: 'Backed up.' } : { tone: 'warn', text: 'The backup did not go through.' });
    load();
  }

  async function restore(b) {
    setBusy(true);
    const r = await sync.restore(b.id);
    setBusy(false);
    setConfirm(null);
    setNote(r.ok ? { tone: 'ok', text: 'Restored the backup from ' + when(b.at) + '. What was there before is kept as a backup too.' } : { tone: 'warn', text: r.message });
    load();
  }

  return (
    <Dialog
      open
      title="Backups & change history"
      onClose={onClose}
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="tb-hk">
        <div className="tb-viewtoggle tb-hk-tabs" role="tablist">
          {[
            ['changes', 'Changes'],
            ['backups', 'Backups'],
          ].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} data-on={tab === k ? '1' : '0'} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>
        {note && (
          <p className={note.tone === 'ok' ? 'tb-sync-note' : 'tb-sync-warn'} role="status">
            {note.text}
          </p>
        )}

        {tab === 'changes' &&
          (log == null ? (
            <p className="tb-sync-note">Loading…</p>
          ) : log.length === 0 ? (
            <p className="tb-sync-note">No changes logged yet. Every save from now on is listed here, with who made it.</p>
          ) : (
            <ol className="tb-hk-log">
              {log.map((e, i) => (
                <li key={e.rev + '-' + i} data-restore={e.restore ? '1' : '0'}>
                  <div className="tb-hk-meta">
                    <strong>{e.by}</strong> · {when(e.at)}
                  </div>
                  <ul>
                    {e.changes.map((c, j) => (
                      <li key={j}>{readable(c)}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ))}

        {tab === 'backups' && (
          <>
            <p className="tb-sync-note">
              A copy is kept automatically once a week, the first time anyone saves. The newest twelve are kept. Restoring
              replaces the shared data for everyone, and backs up what is there first.
            </p>
            <div className="tb-sync-row">
              <Button variant="secondary" size="sm" icon={<Icon name="download" size={15} />} onClick={backUp} disabled={busy}>
                Back up now
              </Button>
            </div>
            {backups == null ? (
              <p className="tb-sync-note">Loading…</p>
            ) : backups.length === 0 ? (
              <p className="tb-sync-note">No backups yet. The first one is made at the next save, or now with the button above.</p>
            ) : (
              <ol className="tb-hk-backups">
                {backups.map((b, i) => (
                  <li key={b.id}>
                    <div>
                      <div className="tb-hk-meta">
                        <strong>{when(b.at)}</strong>
                        {i === 0 && <span className="tb-hk-tag">Latest</span>}
                      </div>
                      <div className="tb-hk-sub">
                        {REASON[b.reason] || b.reason} · {b.players} players · {b.weeks} nights · by {b.by}
                      </div>
                    </div>
                    {confirm === b.id ? (
                      <div className="tb-hk-confirm">
                        <span>Replace the shared data with this?</span>
                        <Button variant="danger" size="sm" onClick={() => restore(b)} disabled={busy}>
                          {busy ? 'Restoring…' : 'Restore'}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setConfirm(null)} disabled={busy}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button variant="secondary" size="sm" icon={<Icon name="rotate-ccw" size={15} />} onClick={() => setConfirm(b.id)} disabled={busy}>
                        Restore
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
