import { Minus, Plus } from 'lucide-react';
import { useId } from 'react';

type StepperProps = {
  label: string;
  step: number;
  min?: number;
  max?: number;
  unit: string;
  placeholder?: string;
} & (
  | { required?: false; value: number | null; onChange: (value: number | null) => void }
  | { required: true; value: number; onChange: (value: number) => void }
);

export function Stepper(props: StepperProps) {
  const { label, value, step, min = 0, max, unit, placeholder = '—' } = props;
  const id = useId();
  const commit = (next: number | null) => {
    if (props.required) {
      if (next !== null) props.onChange(next);
    } else props.onChange(next);
  };
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
          onClick={() => commit(value === null ? null : clamp(value - step))}
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
              if (raw === '') return commit(null);
              const parsed = Number(raw);
              if (!Number.isNaN(parsed)) commit(parsed);
            }}
          />
          <span className="text-meta text-ink-2">{unit}</span>
        </div>
        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()} by ${step}`}
          className="grid size-tap place-items-center rounded-full border border-line bg-raised text-ink"
          onClick={() => commit(clamp((value ?? 0) + step))}
        >
          <Plus className="size-5" strokeWidth={2.75} />
        </button>
      </div>
    </div>
  );
}
