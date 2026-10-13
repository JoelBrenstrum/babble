import type { ReactNode } from 'react';
import { cn } from '#/lib/cn';

export function BigButton({
  className,
  children,
  onClick,
  label,
}: {
  className: string;
  children: ReactNode;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'box-border flex items-center justify-center gap-[2cqmin] font-bold active:brightness-90',
        className,
      )}
    >
      {children}
    </button>
  );
}
