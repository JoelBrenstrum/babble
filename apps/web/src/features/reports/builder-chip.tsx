import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '#/lib/cn';

export function BuilderChip({
  selected,
  label,
  onClick,
  disabled,
  reason,
  selectedClass,
  trailing,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  reason?: string | null;
  selectedClass?: string;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-disabled={disabled || undefined}
      title={reason ?? undefined}
      onClick={() => {
        if (!disabled) onClick();
      }}
      className={cn(
        'inline-flex h-10 items-center gap-1.5 rounded-chip border px-3 text-label transition-colors duration-base',
        selected
          ? (selectedClass ?? 'border-primary bg-primary-soft font-semibold text-on-primary-soft')
          : 'border-line bg-raised text-ink',
        disabled && !selected && 'cursor-not-allowed opacity-45',
      )}
    >
      {selected && <Check className="size-4" strokeWidth={3} />}
      {label}
      {trailing}
    </button>
  );
}
