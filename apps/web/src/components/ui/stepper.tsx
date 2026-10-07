import { Minus, Plus } from 'lucide-react';
import { useId } from 'react';

export function Stepper({
  label,
  value,
  onChange,
  step,
  min = 0,
  max,
  unit,
  placeholder = '—',
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  step: number;
  min?: number;
  max?: number;
  unit: string;
  placeholder?: string;
}) {
  const id = useId();
  const clamp = (next: number) => Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, next));
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label font-semibold">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()} by ${step}`}
          className="grid size-tap place-items-center rounded-full border border-line bg-raised text-ink"
          onClick={() => onChange(value === null ? null : clamp(value - step))}
        >
          <Minus className="size-5" strokeWidth={2.75} />
        </button>
        <div className="flex flex-1 items-center justify-center gap-1 rounded-button bg-surface px-3">
          <input
            id={id}
            inputMode="decimal"
            className="tabular h-tap w-24 bg-transparent text-center text-timer-md font-semibold text-ink outline-none"
            placeholder={placeholder}
            value={value ?? ''}
            onChange={(event) => {
              const raw = event.target.value.trim();
              if (raw === '') return onChange(null);
              const parsed = Number(raw);
              if (!Number.isNaN(parsed)) onChange(parsed);
            }}
          />
          <span className="text-meta text-ink-2">{unit}</span>
        </div>
        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()} by ${step}`}
          className="grid size-tap place-items-center rounded-full border border-line bg-raised text-ink"
          onClick={() => onChange(clamp((value ?? 0) + step))}
        >
          <Plus className="size-5" strokeWidth={2.75} />
        </button>
      </div>
    </div>
  );
}
