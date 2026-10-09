import type { ButtonHTMLAttributes, Ref } from 'react';
import { cn } from '#/lib/cn';
import { Spinner } from './spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'lg' | 'md' | 'icon';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-on-primary-soft dark:hover:bg-on-primary-soft',
  secondary: 'bg-raised text-ink border border-line hover:bg-surface',
  ghost: 'bg-transparent text-ink-2 hover:bg-surface hover:text-ink',
  destructive: 'bg-danger text-ink-on-solid hover:opacity-90',
};

const sizes: Record<Size, string> = {
  lg: 'h-tap-lg px-6 text-row-title',
  md: 'h-tap px-4 text-body',
  icon: 'size-tap',
};

export function buttonClassName({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-button font-semibold transition-colors duration-fast',
    'disabled:pointer-events-none disabled:opacity-45 aria-busy:opacity-100',
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  loading = false,
  disabled,
  children,
  ref,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClassName({ variant, size, className })}
      {...props}
    >
      {loading && <Spinner label="Working" />}
      {children}
    </button>
  );
}
