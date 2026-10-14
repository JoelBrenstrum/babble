import type { DayComparison } from '@babble/domain';
import { ArrowLeftRight, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '#/components/ui/card';
import { PlusBadge } from '#/features/plus-dialog';

const TREND = { up: TrendingUp, down: TrendingDown, same: Minus };

export function DayComparisonCard({
  comparison,
  currentLabel,
  plusBadge,
}: {
  comparison: DayComparison;
  currentLabel: string;
  plusBadge: boolean;
}) {
  return (
    <Card className="flex flex-col gap-4 p-5" aria-labelledby="timeline-comparison">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-on-primary-soft">
          <ArrowLeftRight className="size-4" strokeWidth={2.75} />
        </span>
        <div className="flex-1">
          <h2 id="timeline-comparison" className="text-row-title font-semibold">
            {comparison.title}
          </h2>
          <p className="text-caption text-ink-3">{comparison.note}</p>
        </div>
        {plusBadge && <PlusBadge />}
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="text-caption text-ink-3">
            <th scope="col" className="pb-1 font-semibold">
              <span className="sr-only">Measure</span>
            </th>
            <th scope="col" className="pb-1 text-right font-semibold">
              {comparison.previousLabel}
            </th>
            <th scope="col" className="pb-1 text-right font-semibold">
              {currentLabel}
            </th>
            <th scope="col" className="pb-1 text-right font-semibold">
              <span className="sr-only">Change</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {comparison.rows.map((row) => {
            const Icon = TREND[row.trend];
            return (
              <tr key={row.key} className="text-label">
                <th scope="row" className="py-2 font-normal text-ink-2">
                  {row.label}
                </th>
                <td className="tabular py-2 text-right text-ink-2">{row.previous}</td>
                <td className="tabular py-2 text-right font-semibold">{row.value}</td>
                <td className="py-2 pl-3 text-right">
                  <span className="tabular inline-flex items-center gap-1 text-caption font-semibold text-ink-2">
                    <Icon aria-hidden className="size-3.5" strokeWidth={2.75} />
                    {row.change}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
