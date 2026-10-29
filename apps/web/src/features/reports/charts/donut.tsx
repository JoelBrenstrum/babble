import { donutSlices, donutTotal, formatReportValue, type ReportResult, type Units } from '@babble/domain';
import { useState } from 'react';
import { cn } from '#/lib/cn';
import { toneLook } from '../tones';

const RADIUS = 60;
const THICKNESS = 18;

export function DonutChart({
  result,
  units,
  compact = false,
}: {
  result: ReportResult;
  units: Units;
  compact?: boolean;
}) {
  const slices = donutSlices(result, RADIUS, THICKNESS);
  const [active, setActive] = useState<string | null>(null);
  const total = donutTotal(result);
  const shown = slices.find((slice) => slice.key === active);
  return (
    <div className={cn('flex items-center gap-5', compact ? 'flex-col' : 'flex-col sm:flex-row')}>
      <svg
        viewBox={`${-RADIUS - 2} ${-RADIUS - 2} ${RADIUS * 2 + 4} ${RADIUS * 2 + 4}`}
        className={cn('shrink-0', compact ? 'size-28' : 'size-40')}
        role="img"
        aria-label={`${result.series.map((series) => series.label).join(', ')} as a share of the total`}
      >
        {slices.map((slice) => {
          const look = toneLook(slice.tone);
          return (
            <path
              key={slice.key}
              d={slice.d}
              className={cn(
                look.classes.fill,
                'stroke-raised transition-opacity',
                active && active !== slice.key && 'opacity-40',
              )}
              strokeWidth={1.5}
              style={look.style}
              onMouseEnter={() => setActive(slice.key)}
              onMouseLeave={() => setActive(null)}
            />
          );
        })}
        <text x={0} y={-2} textAnchor="middle" className="fill-ink text-[16px] font-bold tabular">
          {shown ? `${Math.round(shown.fraction * 100)}%` : formatReportValue(total, result.unit, units)}
        </text>
        <text x={0} y={14} textAnchor="middle" className="fill-ink-3 text-[9px]">
          {shown ? shown.label : 'Total'}
        </text>
      </svg>
      {!compact && (
        <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
          {slices.map((slice) => {
            const look = toneLook(slice.tone);
            return (
              <li
                key={slice.key}
                className="flex items-center gap-2 text-meta"
                onMouseEnter={() => setActive(slice.key)}
                onMouseLeave={() => setActive(null)}
              >
                <span className={cn('size-2.5 shrink-0 rounded-sm', look.classes.bg)} style={look.style} />
                <span className="min-w-0 flex-1 truncate">{slice.label}</span>
                <span className="tabular text-ink-2">{formatReportValue(slice.value, result.unit, units)}</span>
                <span className="w-10 text-right tabular text-ink-3">{Math.round(slice.fraction * 100)}%</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
