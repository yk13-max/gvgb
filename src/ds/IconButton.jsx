const sizes = { sm: 32, md: 38, lg: 46 };

const variants = {
  primary: {
    background: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    border: '1px solid var(--color-primary)',
  },
  secondary: {
    background: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border-strong)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    border: '1px solid transparent',
  },
};

export default function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  disabled,
  'aria-label': ariaLabel,
  style,
  ...rest
}) {
  const d = sizes[size] || sizes.md;
  const v = variants[variant] || variants.ghost;
  return (
    <button
      aria-label={ariaLabel}
      disabled={disabled}
      style={{
        width: d,
        height: d,
        borderRadius: 'var(--radius-sm)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 120ms ease',
        ...v,
        ...style,
      }}
      {...rest}
    >
      {icon}
    </button>
  );
}
