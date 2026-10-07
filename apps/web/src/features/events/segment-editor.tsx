import {
  editableRowsToSegments,
  segmentsToEditableRows,
  type EditableRow,
  type Side,
  type TimedSegment,
} from '@babble/domain';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '#/lib/cn';

function splitDuration(ms: number) {
  const totalSeconds = Math.round(ms / 1000);
  return { minutes: Math.floor(totalSeconds / 60), seconds: totalSeconds % 60 };
}

function DurationInputs({ label, ms, onChange }: { label: string; ms: number; onChange: (ms: number) => void }) {
  const { minutes, seconds } = splitDuration(ms);
  const clamp = (value: string, max: number) => Math.min(max, Math.max(0, Number(value.replace(/\D/g, '')) || 0));
  return (
    <span className="flex items-center gap-1 text-meta text-ink-2">
      <input
        aria-label={`${label} minutes`}
        inputMode="numeric"
        className="tabular h-10 w-14 rounded-tile border border-line-strong bg-raised px-2 text-right text-body text-ink"
        value={minutes}
        onChange={(event) => onChange((clamp(event.target.value, 999) * 60 + seconds) * 1000)}
      />
      m
      <input
        aria-label={`${label} seconds`}
        inputMode="numeric"
        className="tabular h-10 w-12 rounded-tile border border-line-strong bg-raised px-2 text-right text-body text-ink"
        value={String(seconds).padStart(2, '0')}
        onChange={(event) => onChange((minutes * 60 + clamp(event.target.value, 59)) * 1000)}
      />
      s
    </span>
  );
}

export function SegmentEditor({
  startedAt,
  segments,
  onChange,
}: {
  startedAt: string;
  segments: readonly TimedSegment[];
  onChange: (next: { segments: TimedSegment[]; endedAt: string }) => void;
}) {
  const [rows, setRows] = useState<EditableRow[]>(() => segmentsToEditableRows(segments, new Date()));

  function update(next: EditableRow[]) {
    setRows(next);
    onChange(editableRowsToSegments(startedAt, next));
  }

  function lastSide(): Side {
    const sides = rows.filter((row): row is Extract<EditableRow, { kind: 'side' }> => row.kind === 'side');
    return sides.at(-1)?.side === 'left' ? 'right' : 'left';
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label font-semibold">Session</legend>
      <ol className="flex flex-col divide-y divide-line rounded-card border border-line">
        {rows.map((row, index) => (
          <li key={index} className="flex flex-wrap items-center gap-3 px-3 py-2">
            {row.kind === 'side' ? (
              <div role="radiogroup" aria-label={`Segment ${index + 1} side`} className="flex gap-1">
                {(['left', 'right'] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    role="radio"
                    aria-checked={row.side === side}
                    aria-label={side === 'left' ? 'Left' : 'Right'}
                    onClick={() => update(rows.map((r, i) => (i === index ? { ...row, side } : r)))}
                    className={cn(
                      'grid size-10 place-items-center rounded-full text-label font-bold',
                      row.side === side
                        ? side === 'left'
                          ? 'bg-feed-left text-ink-on-solid'
                          : 'bg-feed-right text-ink-on-solid'
                        : 'border border-line bg-raised text-ink-2',
                    )}
                  >
                    {side === 'left' ? 'L' : 'R'}
                  </button>
                ))}
              </div>
            ) : (
              <span className="flex w-[84px] items-center gap-2 text-body text-ink-2">
                <span className="size-3 rounded-full border-2 border-dashed border-session-downtime" />
                Idle
              </span>
            )}
            <span className="flex-1" />
            <DurationInputs
              label={row.kind === 'side' ? `Segment ${index + 1}` : `Downtime ${index + 1}`}
              ms={row.durationMs}
              onChange={(durationMs) => update(rows.map((r, i) => (i === index ? { ...r, durationMs } : r)))}
            />
            <button
              type="button"
              aria-label={`Remove ${row.kind === 'side' ? 'segment' : 'downtime'} ${index + 1}`}
              onClick={() => update(rows.filter((_, i) => i !== index))}
              className="grid size-10 place-items-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-on-danger"
            >
              <Trash2 className="size-4" strokeWidth={2.5} />
            </button>
          </li>
        ))}
      </ol>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => update([...rows, { kind: 'side', side: lastSide(), durationMs: 5 * 60_000 }])}
          className="inline-flex h-10 items-center gap-1 rounded-chip border border-line bg-raised px-3 text-label font-semibold hover:bg-surface"
        >
          <Plus className="size-4" strokeWidth={3} />
          Add side
        </button>
        <button
          type="button"
          onClick={() => update([...rows, { kind: 'downtime', durationMs: 60_000 }])}
          className="inline-flex h-10 items-center gap-1 rounded-chip border border-line bg-raised px-3 text-label font-semibold hover:bg-surface"
        >
          <Plus className="size-4" strokeWidth={3} />
          Add downtime
        </button>
      </div>
      <p className="text-meta text-ink-2">Times are recalculated in order from the start time.</p>
    </fieldset>
  );
}
