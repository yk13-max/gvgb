import { useMemo, useState } from 'react';
import { Button, Dialog, Icon } from '../ds/index.js';
import { whatsappText } from '../lib/whatsapp.js';

export default function ShareDialog({ teams, teamSize, onClose }) {
  const text = useMemo(() => whatsappText(teams, teamSize), [teams, teamSize]);
  const [copied, setCopied] = useState(false);
  // Phones can hand the text straight to WhatsApp; desktop falls back to the clipboard.
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
            lineHeight: 'var(--leading-normal)',
          }}
        >
          Paste straight into the group chat. Asterisks render as bold in WhatsApp; lines stay short enough to avoid
          wrapping on a phone.
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
              width: '26ch',
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
