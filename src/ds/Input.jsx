import { useId } from 'react';

export default function Input({ label, error, prefixIcon, suffixIcon, disabled, style, id, ...rest }) {
  const auto = useId();
  const inputId = id || auto;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-body)', ...style }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-medium)',
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--tracking-wide)',
          }}
        >
          {label}
        </label>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          border: '1px solid ' + (error ? 'var(--color-danger)' : 'var(--color-border-strong)'),
          borderRadius: 'var(--radius-sm)',
          padding: '0 10px',
          background: disabled ? 'var(--color-surface-sunken)' : 'var(--color-surface)',
        }}
      >
        {prefixIcon}
        <input
          id={inputId}
          disabled={disabled}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            padding: '9px 0',
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-body)',
          }}
          {...rest}
        />
        {suffixIcon}
      </div>
      {error && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>{error}</span>}
    </div>
  );
}
