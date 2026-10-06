import { cn } from '#/lib/cn';

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-button bg-surface p-1"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-11 rounded-tile text-label transition-colors duration-base',
              selected ? 'bg-raised font-bold text-ink shadow-raised' : 'font-medium text-ink-2',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
