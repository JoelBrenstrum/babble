import type { WeeklySummary } from '@babble/domain';
import { CalendarDays, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '#/components/ui/card';
import { cn } from '#/lib/cn';
import { PlusBadge } from '#/features/plus-dialog';

const TREND = { up: TrendingUp, down: TrendingDown, same: Minus };

export function WeeklySummaryCard({
  summary,
  plusBadge = false,
  compact = false,
}: {
  summary: WeeklySummary;
  plusBadge?: boolean;
  compact?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-4 p-5" aria-labelledby="stats-weekly">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-on-primary-soft">
          <CalendarDays className="size-4" strokeWidth={2.75} />
        </span>
        <div className="flex-1">
          <h2 id="stats-weekly" className="text-row-title font-semibold">
            This week
          </h2>
          <p className="text-caption text-ink-3">The last 7 finished days, compared with the 7 before</p>
        </div>
        {plusBadge && <PlusBadge />}
      </div>
      <p className="text-body font-semibold">{summary.takeaway}</p>
      <dl className={cn('grid gap-2 sm:grid-cols-2', !compact && 'lg:grid-cols-3')}>
        {summary.rows.map((row) => {
          const Icon = row.trend ? TREND[row.trend] : null;
          return (
            <div key={row.label} className="flex items-center justify-between gap-3 rounded-tile bg-surface px-3 py-2">
              <div className="flex flex-col">
                <dt className="text-caption text-ink-2">{row.label}</dt>
                <dd className="tabular text-label font-semibold">{row.value}</dd>
              </div>
              {row.change && Icon && (
                <span className="tabular flex items-center gap-1 text-caption font-semibold text-ink-2">
                  <Icon aria-hidden className="size-3.5" strokeWidth={2.75} />
                  {row.change}
                </span>
              )}
            </div>
          );
        })}
      </dl>
    </Card>
  );
}
