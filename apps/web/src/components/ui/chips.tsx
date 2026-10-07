import { Check } from 'lucide-react';
import { cn } from '#/lib/cn';

interface ChipOption<T extends string> {
  value: T;
  label: string;
}

function Chip({
  selected,
  label,
  onClick,
  disabled,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 items-center gap-1.5 rounded-chip border px-4 text-label transition-colors duration-base disabled:opacity-45',
        selected
          ? 'border-primary bg-primary-soft font-semibold text-on-primary-soft'
          : 'border-line bg-raised text-ink',
      )}
    >
      {selected && <Check className="size-4" strokeWidth={3} />}
      {label}
    </button>
  );
}

export function MultiChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly ChipOption<T>[];
  value: readonly T[];
  onChange: (value: T[]) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.includes(option.value);
          return (
            <Chip
              key={option.value}
              label={option.label}
              selected={selected}
              onClick={() => onChange(selected ? value.filter((v) => v !== option.value) : [...value, option.value])}
            />
          );
        })}
      </div>
    </fieldset>
  );
}

export function SingleChips<T extends string>({
  label,
  options,
  value,
  onChange,
  allowNone = true,
}: {
  label: string;
  options: readonly ChipOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  allowNone?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onClick={() => onChange(value === option.value && allowNone ? null : option.value)}
          />
        ))}
      </div>
    </fieldset>
  );
}
