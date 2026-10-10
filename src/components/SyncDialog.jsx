import { useState } from 'react';
import { Button, Dialog, Icon, Input } from '../ds/index.js';

function ago(iso) {
  if (!iso) return null;
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return m + ' minute' + (m === 1 ? '' : 's') + ' ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + ' hour' + (h === 1 ? '' : 's') + ' ago';
  const d = Math.round(h / 24);
  return d + ' day' + (d === 1 ? '' : 's') + ' ago';
}

// What the dot in the header means, in one place: the chip, the sheet row and this
// dialog all read their colour and wording from here.
export function syncLook(sync) {
  if (sync.conflict) return { tone: 'warn', icon: 'triangle-alert', label: 'Clash', title: 'Someone else saved' };
  if (sync.mode === 'loading') return { tone: 'idle', icon: 'cloud', label: 'Loading', title: 'Loading the shared data' };
  if (sync.mode === 'local') return { tone: 'idle', icon: 'cloud-off', label: 'On this device', title: 'No shared store — this browser only' };
  if (!sync.online) return { tone: 'warn', icon: 'cloud-off', label: 'Offline', title: 'Offline — changes are kept and sent when the connection is back' };
  if (!sync.unlocked) return { tone: 'idle', icon: 'lock', label: 'View only', title: 'Signed out — showing the shared data, read only' };
  if (sync.saving) return { tone: 'busy', icon: 'refresh-cw', label: 'Saving', title: 'Saving to the shared store' };
  if (sync.dirty) return { tone: 'busy', icon: 'cloud', label: 'Unsaved', title: 'Unsaved changes' };
  if (sync.empty) return { tone: 'warn', icon: 'cloud', label: 'Not saved yet', title: 'Nothing has been saved to the shared store yet' };
  return { tone: 'ok', icon: 'cloud', label: 'Saved', title: 'Everything is saved to the shared store' };
}

function Row({ children }) {
  return <div className="tb-sync-row">{children}</div>;
}

export default function SyncDialog({ sync, onClose }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const look = syncLook(sync);

  async function signIn(e) {
    e.preventDefault();
    if (!pw.trim() || busy) return;
    setBusy(true);
    setErr(null);
    const res = await sync.unlock(pw);
    setBusy(false);
    if (res.ok) {
      setPw('');
      onClose();
    } else setErr(res.message);
  }

  // Once a clash is settled there is nothing left to decide, so the dialog gets out of
  // the way rather than sitting there showing a question that has been answered.
  function settle(choice) {
    sync.resolve(choice);
    onClose();
  }

  const when = ago(sync.updatedAt);

  return (
    <Dialog
      open
      title="Shared data"
      onClose={onClose}
      footer={
        <>
          {sync.mode === 'remote' && !sync.conflict && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Icon name="refresh-cw" size={15} />}
              onClick={() => sync.refresh()}
            >
              Reload
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="tb-sync-body">
        <div className="tb-sync-state" data-tone={look.tone}>
          <Icon name={look.icon} size={17} />
          <div>
            <div className="tb-sync-head">{look.label}</div>
            <div className="tb-sync-sub">{look.title}</div>
          </div>
        </div>

        {sync.conflict && (
          <>
            <p className="tb-sync-note">
              Somebody else saved {ago(sync.conflict.updatedAt) || 'since you loaded this'}, so the two copies have
              drifted apart. There is no sensible way to merge two rosters automatically — pick the one to keep.
            </p>
            <Row>
              <Button variant="secondary" size="sm" onClick={() => settle('theirs')}>
                Use theirs
              </Button>
              <Button variant="danger" size="sm" onClick={() => settle('mine')}>
                Overwrite with mine
              </Button>
            </Row>
            <p className="tb-sync-fine">
              Export a copy from the Data button first if you want to keep both.
            </p>
          </>
        )}

        {sync.mode === 'local' && (
          <p className="tb-sync-note">
            This copy is not talking to a shared store, so everything stays in this browser. That is how it runs from
            `npm run dev` or any plain static host — deploy it to Netlify and the whole group sees one set of data.
          </p>
        )}

        {sync.mode === 'remote' && !sync.conflict && (
          <>
            <p className="tb-sync-note">
              {sync.empty
                ? 'The shared store is empty. Sign in and the roster on this device will be the first thing saved to it.'
                : 'Everyone with the link sees this data. ' +
                  (when ? 'Last saved ' + when + '.' : '') +
                  ' It reloads by itself when somebody saves.'}
            </p>
            {sync.disabled && (
              <p className="tb-sync-warn">
                {sync.error || 'Saving is turned off on this site because no password has been configured.'}
              </p>
            )}
            {sync.unlocked ? (
              <>
                <Row>
                  <span className="tb-sync-signed">
                    <Icon name="lock-open" size={14} /> Signed in on this device — your changes save automatically.
                  </span>
                </Row>
                <Row>
                  {sync.dirty && !sync.saving && (
                    <Button variant="primary" size="sm" onClick={() => sync.saveNow()}>
                      Save now
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" icon={<Icon name="lock" size={15} />} onClick={sync.lock}>
                    Sign out
                  </Button>
                </Row>
              </>
            ) : (
              <form onSubmit={signIn} className="tb-sync-form">
                <Input
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Shared password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                />
                <Button type="submit" variant="primary" size="sm" disabled={!pw.trim() || busy}>
                  {busy ? 'Checking…' : 'Sign in to edit'}
                </Button>
              </form>
            )}
            {err && <p className="tb-sync-warn">{err}</p>}
            {sync.error && !sync.disabled && <p className="tb-sync-warn">{sync.error}</p>}
          </>
        )}
      </div>
    </Dialog>
  );
}
