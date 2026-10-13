import { DEFAULT_CUSTOM_DAY_START_MIN, minutesToClock } from '@babble/domain';
import { Check } from 'lucide-react';
import { cn } from '#/lib/cn';
import { MinutesTimeInput } from './minutes-time-input';

export function DayStartPicker({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const custom = value !== 0;

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
        onSelect={() => onChange(custom ? value : DEFAULT_CUSTOM_DAY_START_MIN)}
      >
        {custom && (
          <label className="mt-3 flex items-center gap-3 text-meta text-ink-2">
            Day starts at
            <MinutesTimeInput
              label="Day start time"
              minutes={value}
              accept={(minutes) => minutes !== 0}
              onChange={onChange}
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
