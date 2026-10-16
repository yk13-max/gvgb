export default function Switch({ checked, onChange, label, disabled, style }) {
  const toggle = () => !disabled && onChange && onChange({ target: { checked: !checked } });
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-base)',
        color: 'var(--color-text-primary)',
        ...style,
      }}
    >
      <span
        role="switch"
        aria-checked={!!checked}
        aria-label={typeof label === 'string' ? label : undefined}
        tabIndex={disabled ? -1 : 0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            toggle();
          }
        }}
        style={{
          width: 38,
          height: 22,
          borderRadius: 'var(--radius-full)',
          background: checked ? 'var(--color-primary)' : 'var(--slate-300)',
          position: 'relative',
          transition: 'background 150ms ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'var(--white)',
            transition: 'left 150ms ease',
            boxShadow: 'var(--shadow-sm)',
          }}
        />
      </span>
      {label}
    </label>
  );
}
