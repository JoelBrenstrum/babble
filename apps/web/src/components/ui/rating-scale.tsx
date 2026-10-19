import { cn } from '#/lib/cn';

export function RatingScale<T extends number>({
  label,
  options,
  labels,
  value,
  onChange,
  low,
  high,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T | null;
  onChange: (value: T | null) => void;
  low: string;
  high: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label font-semibold">{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex gap-2">
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${option}: ${labels[option]}`}
              onClick={() => onChange(selected ? null : option)}
              className={cn(
                'tabular grid h-12 flex-1 place-items-center rounded-chip border text-row-title font-semibold transition-colors duration-base',
                selected ? 'border-sleep bg-sleep text-ink-on-solid' : 'border-line bg-raised text-ink',
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between gap-3 text-meta text-ink-3">
        <span>{low}</span>
        <span className="text-right">{high}</span>
      </div>
      {value !== null && (
        <p className="text-meta font-semibold text-on-sleep" aria-live="polite">
          {labels[value]}
        </p>
      )}
    </fieldset>
  );
}
