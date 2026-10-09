import { formatDuration, summariseSegments, type TimedSegment } from '@babble/domain';
import { Minus } from 'lucide-react';
import { Card } from '#/components/ui/card';
import { cn } from '#/lib/cn';

export function SessionBreakdown({
  segments,
  mergeGapMs,
  now,
  paused = false,
  noun = 'feeding',
  onTrimIdle,
}: {
  segments: readonly TimedSegment[];
  mergeGapMs: number;
  now: Date;
  paused?: boolean;
  noun?: 'feeding' | 'pumping';
  onTrimIdle?: () => void;
}) {
  const lastEnd = segments.at(-1)?.endedAt ?? null;
  const summary = summariseSegments(segments, { mergeGapMs, now, pausedSince: paused ? lastEnd : null });
  if (summary.rows.length === 0) return null;
  const trimmableIndex = summary.rows.at(-1)?.kind === 'side' ? summary.rows.length - 2 : -1;

  return (
    <Card className="divide-y divide-line">
      {summary.rows.map((row, index) => (
        <div key={index} className="flex min-h-tap items-center gap-3 px-4 py-2">
          {row.kind === 'side' ? (
            <span className={cn('size-3 rounded-full', row.side === 'left' ? 'bg-feed-left' : 'bg-feed-right')} />
          ) : (
            <span className="size-3 rounded-full border-2 border-dashed border-session-downtime" />
          )}
          <span className={cn('flex-1 text-body', row.kind === 'side' ? 'font-semibold' : 'text-ink-2')}>
            {row.kind === 'side' ? (row.side === 'left' ? 'Left' : 'Right') : 'Downtime'}
          </span>
          {row.kind === 'downtime' && (
            <span className="text-meta font-semibold text-on-session-downtime">
              {row.running ? 'idle · counting' : 'idle'}
            </span>
          )}
          {row.running && row.kind === 'side' && (
            <span
              className={cn(
                'text-meta font-semibold',
                row.side === 'left' ? 'text-on-feed-left' : 'text-on-feed-right',
              )}
            >
              running
            </span>
          )}
          <span className="tabular w-24 text-right text-body">{formatDuration(row.durationMs)}</span>
          {onTrimIdle && row.kind === 'downtime' && index === trimmableIndex && (
            <button
              type="button"
              aria-label="Take a minute off the idle time"
              onClick={onTrimIdle}
              className="-my-1 -mr-2 grid size-10 shrink-0 place-items-center rounded-full border border-line bg-raised text-ink hover:border-ink-3"
            >
              <Minus className="size-4" strokeWidth={3} />
            </button>
          )}
        </div>
      ))}
      <div className="flex items-baseline justify-between px-4 py-3 text-meta text-ink-2">
        <span>
          Total {noun}{' '}
          <span className="tabular text-body font-semibold text-ink">{formatDuration(summary.activeMs)}</span>
        </span>
        {summary.downtimeMs > 0 && <span className="tabular">lost {formatDuration(summary.downtimeMs)}</span>}
      </div>
    </Card>
  );
}
