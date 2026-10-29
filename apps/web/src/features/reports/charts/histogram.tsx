import { formatReportValue, type ReportResult, type Units } from '@babble/domain';
import { useState } from 'react';
import { ChartTip } from '#/components/ui/chart-tip';
import { cn } from '#/lib/cn';
import { toneLook } from '../tones';
import { tipPosition } from './shared';

export function HistogramChart({ result, units }: { result: ReportResult; units: Units }) {
  const distribution = result.distribution;
  const series = result.series[0];
  const [active, setActive] = useState<number | null>(null);
  if (!distribution || !series) return null;
  const look = toneLook(series.tone);
  const max = Math.max(1, ...distribution.bins.map((bin) => bin.count));
  const medianAt =
    distribution.median !== null && distribution.width > 0
      ? distribution.median / (distribution.bins.length * distribution.width)
      : null;
  const count = distribution.bins.length;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative flex h-32 items-end gap-[3px] border-b border-line">
        {distribution.bins.map((bin, index) => (
          <div
            key={bin.from}
            role="img"
            aria-label={`${bin.label}: ${bin.count}`}
            className={cn('flex h-full min-w-0 flex-1 flex-col-reverse rounded-t-sm', active === index && 'opacity-80')}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
          >
            <div
              className={cn(look.classes.bg, 'rounded-t-sm')}
              style={{ height: `${(bin.count / max) * 100}%`, ...look.style }}
            />
          </div>
        ))}
        {medianAt !== null && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 border-l border-dashed border-ink"
            style={{ left: `${Math.min(100, medianAt * 100)}%` }}
          />
        )}
        {active !== null && distribution.bins[active] && (
          <ChartTip
            className={cn('bottom-full mb-2', tipPosition(active, count).className)}
            style={tipPosition(active, count).style}
          >
            {`${distribution.bins[active].label}: ${distribution.bins[active].count}`}
          </ChartTip>
        )}
      </div>
      <div className="flex justify-between text-caption text-ink-3">
        <span>{formatReportValue(0, series.unit, units)}</span>
        {distribution.median !== null && (
          <span>Median {formatReportValue(distribution.median, series.unit, units)}</span>
        )}
        <span>{formatReportValue(distribution.bins.at(-1)?.to ?? 0, series.unit, units)}</span>
      </div>
    </div>
  );
}
