import { useEffect, useState } from 'react';
import { Button, Icon } from '../ds/index.js';
import { savedFormulaCode } from '../lib/remote.js';

// The team formula has its own code on top of the group's password. This stands in front
// of the page until the server has accepted one; a code kept on the device is checked
// again each time, so changing it on the site locks every device out until re-entered.
export default function FormulaLock({ sync, onBack, children }) {
  const [state, setState] = useState(() => (savedFormulaCode() ? 'checking' : 'locked'));
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const kept = savedFormulaCode();
    if (!kept) return undefined;
    let live = true;
    sync.checkFormula(kept).then((r) => {
      if (!live) return;
      setState(r.ok ? 'open' : 'locked');
      if (!r.ok && !/not accepted/.test(r.message || '')) setErr(r.message);
    });
    return () => {
      live = false;
    };
    // Checked once when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A save turned away for want of a good code locks the page again.
  useEffect(() => {
    if (sync.formulaLocked) setState('locked');
  }, [sync.formulaLocked]);

  async function submit(e) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setErr(null);
    const r = await sync.checkFormula(code.trim());
    setBusy(false);
    if (r.ok) {
      setCode('');
      setState('open');
    } else setErr(r.message);
  }

  if (state === 'open') return children;

  return (
    <div className="fx">
      <header className="fx-cover">
        <svg className="fx-lines" viewBox="0 0 300 300" fill="none" aria-hidden="true">
          <circle cx="150" cy="150" r="70" />
          <line x1="0" y1="150" x2="300" y2="150" />
          <rect x="95" y="0" width="110" height="45" />
          <rect x="95" y="255" width="110" height="45" />
        </svg>
        <button type="button" className="fx-back" onClick={onBack}>
          <Icon name="arrow-left" size={16} /> Back
        </button>
        <div className="fx-kicker">FUFA · Team formula</div>
        <h1>How teams are made</h1>
        <p className="fx-sub">The team formula has its own code, separate from the group password. Enter it to see and change how teams are made.</p>
      </header>
      <form className="fx-lock" onSubmit={submit}>
        {state === 'checking' ? (
          <p className="fx-muted">Checking the code kept on this device…</p>
        ) : (
          <>
            <label className="fx-note">
              <span>Formula code</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                value={code}
                aria-label="Formula code"
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            {err && <p className="fx-err">{err}</p>}
            <Button type="submit" variant="primary" size="sm" disabled={busy || !code.trim()} icon={<Icon name="lock-open" size={15} />}>
              {busy ? 'Checking…' : 'Unlock'}
            </Button>
            <p className="fx-muted">Kept on this device until you sign out.</p>
          </>
        )}
      </form>
    </div>
  );
}
