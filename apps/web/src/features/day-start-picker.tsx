import { clockToMinutes, minutesToClock } from '@babble/domain';
import { Check } from 'lucide-react';
import { cn } from '#/lib/cn';
import { showNativePicker } from '#/lib/native-picker';

export function DayStartPicker({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const custom = value !== 0;
  const hh = String(Math.floor(value / 60)).padStart(2, '0');
  const mm = String(value % 60).padStart(2, '0');

  return (
    <div role="radiogroup" aria-label="Day start" className="flex flex-col gap-3">
      <Option
        selected={!custom}
        title="Midnight"
        description="A night's sleep is split across two days."
        onSelect={() => onChange(0)}
      />
      <Option
        selected={custom}
        title="Custom time"
        description="Keeps each night in one day."
        onSelect={() => onChange(custom ? value : 420)}
      >
        {custom && (
          <label className="mt-3 flex items-center gap-3 text-meta text-ink-2">
            Day starts at
            <input
              type="time"
              onClick={(event) => showNativePicker(event.currentTarget)}
              aria-label="Day start time"
              step={900}
              className="h-tap rounded-button border border-line-strong bg-raised px-3 text-body text-ink"
              value={`${hh}:${mm}`}
              onChange={(event) => {
                const minutes = clockToMinutes(event.target.value);
                if (minutes !== null && minutes !== 0) onChange(minutes);
              }}
            />
            <span className="tabular text-ink">{minutesToClock(value)}</span>
          </label>
        )}
      </Option>
    </div>
  );
}

function Option({
  selected,
  title,
  description,
  onSelect,
  children,
}: {
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-card border p-4 transition-colors duration-base',
        selected ? 'border-primary bg-primary-soft' : 'border-line bg-raised',
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className="flex w-full items-start gap-3 text-left"
      >
        <span
          className={cn(
            'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2',
            selected ? 'border-primary bg-primary text-on-primary' : 'border-line-strong',
          )}
        >
          {selected && <Check className="size-4" strokeWidth={3} />}
        </span>
        <span>
          <span className="block text-row-title font-semibold">{title}</span>
          <span className="block text-meta text-ink-2">{description}</span>
        </span>
      </button>
      {children}
    </div>
  );
}
