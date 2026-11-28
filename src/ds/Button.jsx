const sizes = {
  sm: { padding: '6px 12px', fontSize: 'var(--text-sm)', gap: 6 },
  md: { padding: '9px 16px', fontSize: 'var(--text-base)', gap: 8 },
  lg: { padding: '12px 22px', fontSize: 'var(--text-md)', gap: 8 },
};

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
    color: 'var(--color-text-primary)',
    border: '1px solid transparent',
  },
  danger: {
    background: 'var(--color-danger)',
    color: 'var(--white)',
    border: '1px solid var(--color-danger)',
  },
};

const hoverBg = {
  primary: 'var(--color-primary-hover)',
  secondary: 'var(--color-surface-sunken)',
  ghost: 'var(--color-surface-sunken)',
  danger: 'var(--color-danger-strong)',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  disabled = false,
  style,
  ...rest
}) {
  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.primary;
  return (
    <button
      disabled={disabled}
      style={{
        fontFamily: 'var(--font-body)',
        fontWeight: 'var(--weight-semibold)',
        borderRadius: 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        padding: s.padding,
        fontSize: s.fontSize,
        letterSpacing: 'var(--tracking-normal)',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 120ms ease,border-color 120ms ease',
        ...v,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = hoverBg[variant] || hoverBg.primary;
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.background = v.background;
      }}
      {...rest}
    >
      {icon && iconPosition === 'left' ? icon : null}
      {children}
      {icon && iconPosition === 'right' ? icon : null}
    </button>
  );
}
