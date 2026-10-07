import { clock } from '@babble/api';
import {
  EARLIER_START_OPTIONS_MIN,
  earlierStart,
  formatTimeOfDay,
  startChangeError,
  type BabyEvent,
} from '@babble/domain';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { DateTimeField } from '#/components/ui/field';

export function StartTimeButton({
  event,
  timeZone,
  onClick,
}: {
  event: BabyEvent;
  timeZone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Change start time, started ${formatTimeOfDay(event.startedAt, timeZone)}`}
      className="-mx-2 inline-flex items-center gap-1.5 self-start rounded-chip px-2 py-1 text-meta text-ink-2 hover:bg-black/5 hover:text-ink"
    >
      Started {formatTimeOfDay(event.startedAt, timeZone)}
      <Pencil className="size-3.5" strokeWidth={2.5} />
    </button>
  );
}

export function StartTimeEditor({
  event,
  timeZone,
  onSave,
  onCancel,
}: {
  event: BabyEvent;
  timeZone: string;
  onSave: (startedAt: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(event.startedAt);
  const error = value === event.startedAt ? null : startChangeError(event, value, clock.now());

  return (
    <div
      role="group"
      aria-label="Change start time"
      className="flex flex-col gap-3 rounded-tile bg-raised p-4 shadow-raised"
    >
      <p className="text-body font-semibold">Started earlier?</p>
      <div className="flex flex-wrap gap-2">
        {EARLIER_START_OPTIONS_MIN.map((minutes) => (
          <button
            key={minutes}
            type="button"
            onClick={() => onSave(earlierStart(event, minutes))}
            className="inline-flex h-11 items-center rounded-chip border border-line bg-raised px-4 text-label hover:border-ink-3"
          >
            {minutes} min earlier
          </button>
        ))}
      </div>
      <DateTimeField
        label="Start time"
        value={value}
        onChange={setValue}
        timeZone={timeZone}
        error={error ?? undefined}
      />
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={value === event.startedAt || error !== null} onClick={() => onSave(value)}>
          Save start
        </Button>
      </div>
    </div>
  );
}
