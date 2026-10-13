import { clock } from '@babble/api';
import {
  clampDurationPart,
  editableRowsToSegments,
  joinDuration,
  MINUTE_MS,
  segmentsToEditableRows,
  splitDuration,
  type EditableRow,
  type Side,
  type TimedSegment,
} from '@babble/domain';
import { Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '#/lib/cn';

const MAX_MINUTES = 999;
const MAX_SECONDS = 59;
const DEFAULT_SIDE_MS = 5 * MINUTE_MS;
const DEFAULT_DOWNTIME_MS = MINUTE_MS;
const SIDES: readonly Side[] = ['left', 'right'];
const SIDE_ACTIVE: Record<Side, string> = {
  left: 'bg-feed-left text-ink-on-solid',
  right: 'bg-feed-right text-ink-on-solid',
};

type KeyedRow = EditableRow & { id: number };

function DurationInputs({ label, ms, onChange }: { label: string; ms: number; onChange: (ms: number) => void }) {
  const { minutes, seconds } = splitDuration(ms);
  return (
    <span className="flex items-center gap-1 text-meta text-ink-2">
      <input
        aria-label={`${label} minutes`}
        inputMode="numeric"
        className="tabular h-10 w-14 rounded-tile border border-line-strong bg-raised px-2 text-right text-body text-ink"
        value={minutes}
        onChange={(event) => onChange(joinDuration(clampDurationPart(event.target.value, MAX_MINUTES), seconds))}
      />
      m
      <input
        aria-label={`${label} seconds`}
        inputMode="numeric"
        className="tabular h-10 w-12 rounded-tile border border-line-strong bg-raised px-2 text-right text-body text-ink"
        value={String(seconds).padStart(2, '0')}
        onChange={(event) => onChange(joinDuration(minutes, clampDurationPart(event.target.value, MAX_SECONDS)))}
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
  const nextId = useRef(0);
  const keyed = (row: EditableRow): KeyedRow => ({ ...row, id: nextId.current++ });
  const [rows, setRows] = useState<KeyedRow[]>(() => segmentsToEditableRows(segments, clock.now()).map(keyed));

  function update(next: KeyedRow[]) {
    setRows(next);
    onChange(editableRowsToSegments(startedAt, next));
  }

  function lastSide(): Side {
    const sides = rows.filter((row) => row.kind === 'side');
    return sides.at(-1)?.side === 'left' ? 'right' : 'left';
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label font-semibold">Session</legend>
      <ol className="flex flex-col divide-y divide-line rounded-card border border-line">
        {rows.map((row, index) => (
          <li key={row.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
            {row.kind === 'side' ? (
              <div role="radiogroup" aria-label={`Segment ${index + 1} side`} className="flex gap-1">
                {SIDES.map((side) => (
                  <button
                    key={side}
                    type="button"
                    role="radio"
                    aria-checked={row.side === side}
                    aria-label={side === 'left' ? 'Left' : 'Right'}
                    onClick={() => update(rows.map((r, i) => (i === index ? { ...row, side } : r)))}
                    className={cn(
                      'grid size-10 place-items-center rounded-full text-label font-bold',
                      row.side === side ? SIDE_ACTIVE[side] : 'border border-line bg-raised text-ink-2',
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
          onClick={() => update([...rows, keyed({ kind: 'side', side: lastSide(), durationMs: DEFAULT_SIDE_MS })])}
          className="inline-flex h-10 items-center gap-1 rounded-chip border border-line bg-raised px-3 text-label font-semibold hover:bg-surface"
        >
          <Plus className="size-4" strokeWidth={3} />
          Add side
        </button>
        <button
          type="button"
          onClick={() => update([...rows, keyed({ kind: 'downtime', durationMs: DEFAULT_DOWNTIME_MS })])}
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
