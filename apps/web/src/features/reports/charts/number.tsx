import { formatReportValue, lineGeometry, REPORT_PAD, type ReportResult, type Units } from '@babble/domain';
import { cn } from '#/lib/cn';
import { toneLook } from '../tones';

const SPARK = { width: 120, height: 32, pad: { ...REPORT_PAD, top: 3, bottom: 3 } };

export function NumberChart({ result, units }: { result: ReportResult; units: Units }) {
  const series = result.series[0];
  if (!series) return null;
  const figure = result.figures[0];
  const geometry = lineGeometry(result, SPARK, false);
  const look = toneLook(series.tone);
  const delta = figure?.delta ?? null;
  const tone = delta?.startsWith('Up')
    ? 'bg-success-soft text-on-success'
    : delta?.startsWith('Down')
      ? 'bg-caution-soft text-on-caution'
      : 'bg-surface text-ink-2';
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-caption text-ink-2">{figure?.label ?? series.label}</span>
        <span className="tabular text-timer-md font-bold leading-none">
          {formatReportValue(series.total, series.unit, units)}
        </span>
        {delta && (
          <span
            className={cn(
              'mt-1 inline-flex w-fit items-center rounded-chip px-2 py-0.5 text-caption font-semibold',
              tone,
            )}
          >
            {delta} on the {result.compare?.label.toLowerCase()}
          </span>
        )}
      </div>
      {geometry.series[0]?.points.length ? (
        <svg viewBox={`0 0 ${SPARK.width} ${SPARK.height}`} className="h-8 w-32" aria-hidden>
          <path
            d={geometry.series[0].path}
            fill="none"
            className={look.classes.stroke}
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={look.style}
          />
        </svg>
      ) : null}
    </div>
  );
}
