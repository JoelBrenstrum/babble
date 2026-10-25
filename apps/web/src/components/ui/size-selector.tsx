import { SIZE_LABELS, SIZES, type Size } from '@babble/domain';
import { cn } from '#/lib/cn';

const DOTS: Record<Size, number> = { tiny: 6, little: 10, medium: 14, large: 18, massive: 22 };

export function SizeSelector({
  label,
  labels = SIZE_LABELS,
  value,
  onChange,
}: {
  label: string;
  labels?: Record<Size, string>;
  value: Size | null;
  onChange: (value: Size | null) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label font-semibold">{label}</legend>
      <div role="radiogroup" className="grid grid-cols-5 gap-2">
        {SIZES.map((size) => {
          const selected = value === size;
          return (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(selected ? null : size)}
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
                  style={{ width: DOTS[size], height: DOTS[size] }}
                />
              </span>
              {labels[size]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
