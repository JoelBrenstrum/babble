import type { Size } from '@babble/domain';
import { cn } from '#/lib/cn';

const SIZES: { value: Size; label: string; dot: number }[] = [
  { value: 'tiny', label: 'Tiny', dot: 6 },
  { value: 'little', label: 'Little', dot: 10 },
  { value: 'medium', label: 'Medium', dot: 14 },
  { value: 'large', label: 'Large', dot: 18 },
  { value: 'massive', label: 'Massive', dot: 22 },
];

export function SizeSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Size | null;
  onChange: (value: Size | null) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label font-semibold">{label}</legend>
      <div role="radiogroup" className="grid grid-cols-5 gap-2">
        {SIZES.map((size) => {
          const selected = value === size.value;
          return (
            <button
              key={size.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(selected ? null : size.value)}
              className={cn(
                'flex h-[72px] flex-col items-center justify-center gap-2 rounded-tile border text-caption transition-colors duration-base',
                selected
                  ? 'border-primary bg-primary-soft font-semibold text-on-primary-soft'
                  : 'border-line bg-raised text-ink-2',
              )}
            >
              <span className="flex h-6 items-center">
                <span
                  className={cn('rounded-full', selected ? 'bg-primary' : 'bg-ink-3')}
                  style={{ width: size.dot, height: size.dot }}
                />
              </span>
              {size.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
