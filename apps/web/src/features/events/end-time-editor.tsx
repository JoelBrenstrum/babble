import { clock } from '@babble/api';
import {
  EARLIER_END_OPTIONS_MIN,
  earlierEnd,
  endChangeError,
  formatTimeOfDay,
  sessionNoun,
  suggestedEnd,
  type BabyEvent,
} from '@babble/domain';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { DateTimeField } from '#/components/ui/field';

export function EndTimeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-center rounded-chip px-3 py-1 text-meta text-ink-2 underline-offset-2 hover:bg-black/5 hover:text-ink hover:underline"
    >
      Ended earlier?
    </button>
  );
}

export function EndTimeEditor({
  event,
  timeZone,
  onEnd,
  onCancel,
}: {
  event: BabyEvent;
  timeZone: string;
  onEnd: (endedAt: string) => void;
  onCancel: () => void;
}) {
  const now = clock.now();
  const [value, setValue] = useState(() => suggestedEnd(event, now));
  const error = endChangeError(event, value, now);
  const noun = sessionNoun(event.type);

  return (
    <div role="group" aria-label="End earlier" className="flex flex-col gap-3 rounded-tile bg-raised p-4 shadow-raised">
      <p className="text-body font-semibold">Ended earlier?</p>
      <div className="flex flex-wrap gap-2">
        {EARLIER_END_OPTIONS_MIN.map((minutes) => {
          const at = earlierEnd(now, minutes);
          return (
            <button
              key={minutes}
              type="button"
              disabled={endChangeError(event, at, now) !== null}
              onClick={() => onEnd(at)}
              className="inline-flex h-11 items-center rounded-chip border border-line bg-raised px-4 text-label hover:border-ink-3 disabled:opacity-45"
            >
              {minutes} min ago
            </button>
          );
        })}
      </div>
      <DateTimeField
        label="End time"
        value={value}
        onChange={setValue}
        timeZone={timeZone}
        error={error ?? undefined}
      />
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={error !== null} onClick={() => onEnd(value)}>
          End {noun} at {formatTimeOfDay(value, timeZone)}
        </Button>
      </div>
    </div>
  );
}
