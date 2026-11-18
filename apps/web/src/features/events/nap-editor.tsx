import {
  addWakeUpRow,
  clampDurationPart,
  editRowsToNap,
  editRowTotals,
  formatDuration,
  joinHoursMinutes,
  napToEditRows,
  removeWakeUpRow,
  splitHoursMinutes,
  type NapEditRow,
  type DraftOfType,
} from '@babble/domain';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '#/lib/cn';

const MAX_HOURS = 23;
const MAX_MINUTES = 59;

function HoursMinutesInputs({ label, ms, onChange }: { label: string; ms: number; onChange: (ms: number) => void }) {
  const { hours, minutes } = splitHoursMinutes(ms);
  return (
    <span className="flex items-center gap-1 text-meta text-ink-2">
      <input
        aria-label={`${label} hours`}
        inputMode="numeric"
        className="tabular h-10 w-12 rounded-tile border border-line-strong bg-raised px-2 text-right text-body text-ink"
        value={hours}
        onChange={(event) => onChange(joinHoursMinutes(clampDurationPart(event.target.value, MAX_HOURS), minutes))}
      />
      h
      <input
        aria-label={`${label} minutes`}
        inputMode="numeric"
        className="tabular h-10 w-12 rounded-tile border border-line-strong bg-raised px-2 text-right text-body text-ink"
        value={String(minutes).padStart(2, '0')}
        onChange={(event) => onChange(joinHoursMinutes(hours, clampDurationPart(event.target.value, MAX_MINUTES)))}
      />
      m
    </span>
  );
}

export function NapEditor({
  startedAt,
  endedAt,
  segments,
  onChange,
}: {
  startedAt: string;
  endedAt: string;
  segments: DraftOfType<'sleep'>['segments'];
  onChange: (next: ReturnType<typeof editRowsToNap>) => void;
}) {
  const [rows, setRows] = useState<NapEditRow[]>(() => napToEditRows(startedAt, endedAt, segments));
  const { asleepMs, awakeMs } = editRowTotals(rows);

  function update(next: NapEditRow[]) {
    setRows(next);
    onChange(editRowsToNap(startedAt, next));
  }

  let wakeUp = 0;
  let stretch = 0;

  return (
    <section className="flex flex-col gap-2" aria-label="Wake-ups">
      <span className="text-label font-semibold">Sleep and wake-ups</span>
      <ol className="flex flex-col divide-y divide-line rounded-card border border-line">
        {rows.map((row, index) => {
          const number = row.kind === 'awake' ? ++wakeUp : ++stretch;
          const label = row.kind === 'awake' ? `Wake-up ${number}` : `Sleep ${number}`;
          return (
            <li key={index} className="flex min-h-tap items-center gap-3 px-3 py-2">
              {row.kind === 'asleep' ? (
                <span className="size-3 rounded-full bg-sleep" />
              ) : (
                <span className="size-3 rounded-full border-2 border-dashed border-session-downtime" />
              )}
              <span className={cn('flex-1 text-body', row.kind === 'asleep' ? 'font-semibold' : 'text-ink-2')}>
                {row.kind === 'asleep' ? 'Asleep' : 'Awake'}
              </span>
              <HoursMinutesInputs
                label={label}
                ms={row.durationMs}
                onChange={(durationMs) => update(rows.map((r, i) => (i === index ? { ...r, durationMs } : r)))}
              />
              {row.kind === 'awake' ? (
                <button
                  type="button"
                  aria-label={`Remove wake-up ${number}`}
                  onClick={() => update(removeWakeUpRow(rows, index))}
                  className="grid size-10 place-items-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-on-danger"
                >
                  <Trash2 className="size-4" strokeWidth={2.5} />
                </button>
              ) : (
                <span className="size-10" />
              )}
            </li>
          );
        })}
        <li className="flex items-baseline justify-between px-4 py-3 text-meta text-ink-2">
          <span>
            Total asleep{' '}
            <span className="tabular text-body font-semibold text-ink">
              {formatDuration(asleepMs, { seconds: false })}
            </span>
          </span>
          {awakeMs > 0 && <span className="tabular">awake {formatDuration(awakeMs, { seconds: false })}</span>}
        </li>
      </ol>
      <button
        type="button"
        disabled={asleepMs <= 0}
        onClick={() => update(addWakeUpRow(rows))}
        className="inline-flex h-10 items-center gap-1 self-start rounded-chip border border-line bg-raised px-3 text-label font-semibold hover:bg-surface disabled:opacity-50"
      >
        <Plus className="size-4" strokeWidth={3} />
        Add a wake-up
      </button>
      <p className="text-meta text-ink-2">Times are recalculated in order from when they fell asleep.</p>
    </section>
  );
}
