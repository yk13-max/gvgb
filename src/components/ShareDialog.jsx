import { useMemo, useState } from 'react';
import { Button, Dialog, Icon, Input, Switch } from '../ds/index.js';
import { whatsappText } from '../lib/whatsapp.js';

export default function ShareDialog({ teams, match, onMatchChange, onClose }) {
  // Ratings stay out of the group chat unless you ask for them.
  const [showScores, setShowScores] = useState(false);
  const text = useMemo(() => whatsappText(teams, match, showScores), [teams, match, showScores]);
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const set = (patch) => onMatchChange({ ...match, ...patch });

  function copy() {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    };
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        done();
      } catch {
        // Clipboard unavailable — the text is on screen to copy by hand.
      }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  function share() {
    navigator.share({ text }).catch(() => {
      // Share sheet dismissed — nothing to do.
    });
  }

  return (
    <Dialog
      open
      title="Send to WhatsApp"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          {canShare && (
            <Button variant="secondary" size="sm" icon={<Icon name="share-2" size={15} />} onClick={share}>
              Share
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={<Icon name={copied ? 'check' : 'copy'} size={15} />}
            onClick={copy}
          >
            {copied ? 'Copied' : 'Copy text'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <Input
            label="Date"
            type="date"
            style={{ flex: 1, minWidth: 0 }}
            value={match.date}
            onChange={(e) => set({ date: e.target.value })}
          />
          <Input
            label="Kick-off"
            type="time"
            style={{ flex: 1, minWidth: 0 }}
            value={match.time}
            onChange={(e) => set({ time: e.target.value })}
          />
        </div>
        <Input
          label="Pitch"
          placeholder="e.g. Tolworth Pitch 8"
          value={match.venue}
          onChange={(e) => set({ venue: e.target.value })}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            borderTop: '1px solid var(--color-border)',
            paddingTop: 12,
          }}
        >
          <Switch
            checked={showScores}
            onChange={(e) => setShowScores(e.target.checked)}
            label="Include ratings"
            style={{ fontSize: 'var(--text-sm)' }}
          />
        </div>

        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
            lineHeight: 'var(--leading-normal)',
          }}
        >
          Paste straight into the group chat. Blank details are left out of the first line.
        </div>
        <div
          style={{
            background: 'var(--slate-100)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 12,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <pre
            style={{
              margin: 0,
              width: '32ch',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              lineHeight: 1.65,
              color: 'var(--color-text-primary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {text}
          </pre>
        </div>
      </div>
    </Dialog>
  );
}
