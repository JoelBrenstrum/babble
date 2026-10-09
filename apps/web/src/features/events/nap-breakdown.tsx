import { formatDuration, napRows, type NapLike } from '@babble/domain';
import { Minus, Trash2 } from 'lucide-react';
import { Card } from '#/components/ui/card';
import { cn } from '#/lib/cn';

export function NapBreakdown({
  nap,
  now,
  trim = 'last',
  onTrimAwake,
  onRemoveAwake,
}: {
  nap: NapLike;
  now: Date;
  trim?: 'last' | 'all';
  onTrimAwake?: (awakeIndex: number) => void;
  onRemoveAwake?: (awakeIndex: number) => void;
}) {
  const rows = napRows(nap, now);
  const lastAwake = rows.at(-1)?.kind === 'asleep' ? rows.length - 2 : -1;
  const asleepMs = rows.filter((row) => row.kind === 'asleep').reduce((sum, row) => sum + row.durationMs, 0);
  const awakeMs = rows.filter((row) => row.kind === 'awake').reduce((sum, row) => sum + row.durationMs, 0);
  let awakeIndex = -1;

  return (
    <Card className="divide-y divide-line">
      {rows.map((row, index) => {
        if (row.kind === 'awake') awakeIndex += 1;
        const current = awakeIndex;
        const canTrim = row.kind === 'awake' && !row.running && (trim === 'all' || index === lastAwake);
        return (
          <div key={index} className="flex min-h-tap items-center gap-3 px-4 py-2">
            {row.kind === 'asleep' ? (
              <span className="size-3 rounded-full bg-sleep" />
            ) : (
              <span className="size-3 rounded-full border-2 border-dashed border-session-downtime" />
            )}
            <span className={cn('flex-1 text-body', row.kind === 'asleep' ? 'font-semibold' : 'text-ink-2')}>
              {row.kind === 'asleep' ? 'Asleep' : 'Awake'}
            </span>
            {row.running && (
              <span
                className={cn(
                  'text-meta font-semibold',
                  row.kind === 'asleep' ? 'text-on-sleep' : 'text-on-session-downtime',
                )}
              >
                {row.kind === 'asleep' ? 'sleeping' : 'awake · counting'}
              </span>
            )}
            <span className="tabular w-24 text-right text-body">{formatDuration(row.durationMs)}</span>
            {canTrim && onTrimAwake && (
              <button
                type="button"
                aria-label={`Take a minute off wake-up ${current + 1}`}
                onClick={() => onTrimAwake(current)}
                className="-my-1 grid size-10 shrink-0 place-items-center rounded-full border border-line bg-raised text-ink hover:border-ink-3"
              >
                <Minus className="size-4" strokeWidth={3} />
              </button>
            )}
            {row.kind === 'awake' && !row.running && onRemoveAwake && (
              <button
                type="button"
                aria-label={`Remove wake-up ${current + 1}`}
                onClick={() => onRemoveAwake(current)}
                className="-my-1 -mr-2 grid size-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-line hover:text-danger"
              >
                <Trash2 className="size-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
        );
      })}
      <div className="flex items-baseline justify-between px-4 py-3 text-meta text-ink-2">
        <span>
          Total asleep <span className="tabular text-body font-semibold text-ink">{formatDuration(asleepMs)}</span>
        </span>
        {awakeMs > 0 && <span className="tabular">awake {formatDuration(awakeMs)}</span>}
      </div>
    </Card>
  );
}
