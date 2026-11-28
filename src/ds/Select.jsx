export default function Select({ label, options = [], value, onChange, disabled, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-body)', ...style }}>
      {label && (
        <label
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
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{
          border: '1px solid var(--color-border-strong)',
          borderRadius: 'var(--radius-sm)',
          padding: '9px 10px',
          fontSize: 'var(--text-base)',
          color: 'var(--color-text-primary)',
          background: disabled ? 'var(--color-surface-sunken)' : 'var(--color-surface)',
          fontFamily: 'var(--font-body)',
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
