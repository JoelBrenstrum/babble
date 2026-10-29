import { reportCsv, splitLabel, type ReportResult, type ReportSettings, type Units } from '@babble/domain';
import { ChartColumn, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Card } from '#/components/ui/card';
import { SectionSpinner } from '#/components/ui/spinner';
import { PlusBadge } from '#/features/plus-dialog';
import { cn } from '#/lib/cn';
import { BarsChart } from './charts/bars';
import { DonutChart } from './charts/donut';
import { HeatmapChart } from './charts/heatmap';
import { HistogramChart } from './charts/histogram';
import { LineChart } from './charts/line';
import { NumberChart } from './charts/number';
import { RhythmChart } from './charts/rhythm';
import { TableChart } from './charts/table';
import { TILE_LOOK, toneLook } from './tones';

export type ReportCardSize = 'xs' | 's' | 'm' | 'l';

export function ReportChart({
  result,
  units,
  size = 'm',
}: {
  result: ReportResult;
  units: Units;
  size?: ReportCardSize;
}) {
  const [active, setActive] = useState<number | null>(null);
  switch (result.spec.chart) {
    case 'bar':
      return <BarsChart result={result} units={units} active={active} onActive={setActive} />;
    case 'line':
      return <LineChart result={result} units={units} area={false} active={active} onActive={setActive} />;
    case 'area':
      return <LineChart result={result} units={units} area active={active} onActive={setActive} />;
    case 'donut':
      return <DonutChart result={result} units={units} compact={size === 'xs' || size === 's'} />;
    case 'number':
      return <NumberChart result={result} units={units} />;
    case 'table':
      return <TableChart result={result} units={units} />;
    case 'heatmap':
      return <HeatmapChart result={result} units={units} rows={size === 'xs' || size === 's' ? 7 : undefined} />;
    case 'histogram':
      return <HistogramChart result={result} units={units} />;
    case 'rhythm':
      return <RhythmChart result={result} rows={size === 'l' ? 14 : 7} />;
  }
}

function Legend({ result }: { result: ReportResult }) {
  if (result.series.length < 2 || result.spec.chart === 'donut' || result.spec.chart === 'table') return null;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {result.series.map((series) => {
        const look = toneLook(series.tone);
        return (
          <span key={series.key} className="flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-sm', look.classes.bg)} style={look.style} />
            {series.label}
          </span>
        );
      })}
    </span>
  );
}

function chartEnds(result: ReportResult): [string, string] | null {
  if (result.spec.chart !== 'bar' && result.spec.chart !== 'line' && result.spec.chart !== 'area') return null;
  const first = result.buckets[0];
  const last = result.buckets.at(-1);
  if (!first || !last || first === last) return null;
  return [first.title, last.lastDay === result.todayKey ? 'Today' : last.title];
}

export function ReportCard({
  result,
  units,
  title,
  meta,
  icon: Icon = ChartColumn,
  group = 'logging',
  size = 'm',
  loading = false,
  plusBadge = false,
  menu,
  footer,
  className,
  headingId,
}: {
  result: ReportResult | null;
  units: Units;
  title: string;
  meta?: string | null;
  icon?: LucideIcon;
  group?: string;
  size?: ReportCardSize;
  loading?: boolean;
  plusBadge?: boolean;
  menu?: ReactNode;
  footer?: ReactNode;
  className?: string;
  headingId?: string;
}) {
  const compact = size === 'xs' || size === 's';
  const ends = result ? chartEnds(result) : null;
  return (
    <Card className={cn('flex flex-col gap-4', compact ? 'p-4' : 'p-5', className)} aria-labelledby={headingId}>
      <div className="flex items-center gap-3">
        <span
          className={cn('grid size-9 shrink-0 place-items-center rounded-full', TILE_LOOK[group] ?? TILE_LOOK.logging)}
        >
          <Icon className="size-4" strokeWidth={2.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="truncate text-row-title font-semibold">
            {title}
          </h2>
          {meta && <p className="truncate text-caption text-ink-2">{meta}</p>}
        </div>
        {plusBadge && <PlusBadge />}
        {menu}
      </div>
      {result && !compact && result.figures.length > 0 && result.spec.chart !== 'number' && (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {result.figures.map((figure) => (
            <div key={figure.label} className="flex flex-col rounded-tile bg-surface px-3 py-2">
              <dt className="text-caption text-ink-2">{figure.label}</dt>
              <dd className="tabular text-label font-semibold">{figure.value}</dd>
              {figure.delta && <dd className="text-caption text-ink-3">{figure.delta} on the previous period</dd>}
            </div>
          ))}
        </dl>
      )}
      <div
        className={cn('mt-auto flex flex-col gap-1.5 transition-opacity', loading && 'opacity-60')}
        aria-busy={loading}
      >
        {!result ? (
          <SectionSpinner />
        ) : result.empty ? (
          <p className="grid h-32 place-items-center text-center text-meta text-ink-3">
            Nothing logged in this range yet
          </p>
        ) : (
          <>
            {!compact && (
              <div className="flex items-start justify-between gap-3 text-caption text-ink-3">
                <Legend result={result} />
                {result.compare && <span className="shrink-0">dashed: {result.compare.label.toLowerCase()}</span>}
              </div>
            )}
            <ReportChart result={result} units={units} size={size} />
            {ends && !compact && (
              <div className="flex justify-between text-caption text-ink-3">
                <span>{ends[0]}</span>
                <span>{ends[1]}</span>
              </div>
            )}
          </>
        )}
      </div>
      {footer}
    </Card>
  );
}

export function downloadCsv(result: ReportResult, units: Units, name: string) {
  const blob = new Blob([reportCsv(result, units)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name.replace(/[^\w\- ]+/g, '').trim() || 'report'}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function filterSummary(spec: ReportResult['spec'], settings: ReportSettings): string[] {
  return spec.filters.map((filter) =>
    filter.key === 'text'
      ? `Text contains "${filter.text}"`
      : filter.values.map((value) => splitLabel(filter.key, value, settings)).join(', '),
  );
}
