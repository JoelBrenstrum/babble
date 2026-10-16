import {
  chartAxis,
  formatShortDate,
  growthEstimateReadout,
  growthMilestoneText,
  growthPointReadout,
  readoutEdge,
  type GrowthChart,
  type GrowthReport,
} from '@babble/domain';
import { Link } from '@tanstack/react-router';
import { Ruler } from 'lucide-react';
import { useState } from 'react';
import { Card } from '#/components/ui/card';
import { ChartTip } from '#/components/ui/chart-tip';
import { StatusMessage } from '#/components/ui/status';
import { PlusBadge } from '#/features/plus-dialog';
import { cn } from '#/lib/cn';

const WIDTH = 320;
const HEIGHT = 180;
const PAD = { left: 34, right: 8, top: 8, bottom: 22 };

const CURVE_STYLE: Record<number, string> = {
  3: 'stroke-ink-3/50 [stroke-dasharray:3_3]',
  15: 'stroke-ink-3/35',
  50: 'stroke-growth/60',
  85: 'stroke-ink-3/35',
  97: 'stroke-ink-3/50 [stroke-dasharray:3_3]',
};

export function GrowthCard({
  report,
  babyName,
  timeZone,
  canLog = true,
  plusBadge = false,
}: {
  report: GrowthReport;
  babyName: string;
  timeZone: string;
  canLog?: boolean;
  plusBadge?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-4 p-5" aria-labelledby="stats-growth">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-growth-soft text-on-growth">
          <Ruler className="size-4" strokeWidth={2.75} />
        </span>
        <h2 id="stats-growth" className="flex-1 text-row-title font-semibold">
          Growth
        </h2>
        {canLog && (
          <Link
            to="/track/$type/new"
            params={{ type: 'growth' }}
            className="text-meta font-semibold text-primary underline-offset-4 hover:underline"
          >
            Log growth
          </Link>
        )}
      </div>
      {report.needsSex && (
        <StatusMessage tone="info">
          Set {babyName}'s sex in{' '}
          <Link to="/settings" className="font-semibold underline underline-offset-4">
            Settings
          </Link>{' '}
          to compare with the WHO growth charts.
        </StatusMessage>
      )}
      {report.charts.length === 0 ? (
        <p className="text-body text-ink-2">No growth entries yet. Log a weight, length or head size to chart it.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {report.charts.map((chart) => (
            <GrowthChartView key={chart.key} chart={chart} timeZone={timeZone} plusBadge={plusBadge} />
          ))}
        </div>
      )}
      {report.charts.some((chart) => chart.curves.length > 0) && (
        <p className="text-caption text-ink-3">
          Lines show the WHO 3rd, 15th, 50th, 85th and 97th percentiles, up to 2 years.
        </p>
      )}
      {report.charts.some((chart) => chart.estimate || chart.milestones.length > 0) && (
        <p className="text-caption text-ink-3">
          Today's estimate and the milestones after it follow the trend of the last few measurements. They're a guide,
          not a measurement.
        </p>
      )}
    </Card>
  );
}

function GrowthChartView({ chart, timeZone, plusBadge }: { chart: GrowthChart; timeZone: string; plusBadge: boolean }) {
  const [active, setActive] = useState<number | 'estimate' | `milestone-${number}` | null>(null);
  const x = (months: number) => PAD.left + (months / chart.xMax) * (WIDTH - PAD.left - PAD.right);
  const y = (value: number) =>
    PAD.top + (1 - (value - chart.yMin) / (chart.yMax - chart.yMin)) * (HEIGHT - PAD.top - PAD.bottom);
  const path = (points: { months: number; value: number }[]) =>
    points
      .map((point, order) => `${order ? 'L' : 'M'}${x(point.months).toFixed(1)},${y(point.value).toFixed(1)}`)
      .join(' ');
  const { yTicks, xTicks } = chartAxis(chart);
  const { estimate } = chart;
  const last = chart.points.at(-1)!;
  const ahead = [...(estimate ? [estimate] : []), ...chart.milestones];
  const milestone =
    typeof active === 'string' && active.startsWith('milestone-')
      ? chart.milestones[Number(active.slice(10))]
      : undefined;
  const tip =
    active === 'estimate' && estimate
      ? { point: estimate, text: growthEstimateReadout(estimate) }
      : milestone
        ? { point: milestone, text: growthMilestoneText(milestone) }
        : typeof active === 'number' && chart.points[active]
          ? { point: chart.points[active], text: growthPointReadout(chart.points[active], timeZone) }
          : null;
  const hover = (key: NonNullable<typeof active>) => ({
    onMouseEnter: () => setActive(key),
    onMouseLeave: () => setActive(null),
    onFocus: () => setActive(key),
    onBlur: () => setActive(null),
    onClick: () => setActive(key),
  });

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-label font-semibold">{chart.label}</span>
        <span className="text-right">
          <span className="tabular text-label font-bold">{chart.latest.value}</span>
          {chart.latest.percentile && (
            <span className="block text-caption text-ink-2">{chart.latest.percentile} percentile</span>
          )}
          <span className="block text-caption text-ink-3">{formatShortDate(chart.latest.at, timeZone)}</span>
        </span>
      </figcaption>
      {estimate && (
        <div className="flex items-center justify-between gap-2 rounded-tile bg-growth-soft px-3 py-2 text-on-growth">
          <span className="flex flex-col">
            <span className="text-caption">Estimate for today</span>
            <span className="tabular text-label font-bold">
              {estimate.reading}
              {estimate.percentile && <span className="font-semibold"> · {estimate.percentile} percentile</span>}
            </span>
          </span>
          {plusBadge && <PlusBadge />}
        </div>
      )}
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`${chart.label} by age in months, latest ${chart.latest.value}${chart.latest.percentile ? `, ${chart.latest.percentile} percentile` : ''}`}
          className="w-full overflow-visible"
        >
          {yTicks.map((value) => (
            <g key={value}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(value)} y2={y(value)} className="stroke-line" />
              <text
                x={PAD.left - 6}
                y={y(value)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-ink-3 text-[10px]"
              >
                {Math.round(value * 10) / 10}
              </text>
            </g>
          ))}
          {xTicks.map((months) => (
            <text key={months} x={x(months)} y={HEIGHT - 6} textAnchor="middle" className="fill-ink-3 text-[10px]">
              {months}
            </text>
          ))}
          <text x={WIDTH - PAD.right} y={HEIGHT - 6} textAnchor="end" className="fill-ink-3 text-[10px]" dy={-12}>
            months
          </text>
          <text x={PAD.left - 6} y={PAD.top - 2} textAnchor="end" className="fill-ink-3 text-[10px]" dy={-2}>
            {chart.unit}
          </text>
          {chart.curves.map((curve) => (
            <path
              key={curve.percentile}
              d={path(curve.points)}
              fill="none"
              strokeWidth={1.5}
              className={CURVE_STYLE[curve.percentile]}
            />
          ))}
          {chart.points.length > 1 && (
            <path d={path(chart.points)} fill="none" strokeWidth={2} className="stroke-growth" />
          )}
          {ahead.length > 0 && (
            <path
              d={path([last, ...ahead])}
              fill="none"
              strokeWidth={2}
              className="stroke-growth [stroke-dasharray:4_3]"
            />
          )}
          {chart.milestones.map((point, index) => (
            <g key={point.reading}>
              <circle
                cx={x(point.months)}
                cy={y(point.value)}
                r={active === `milestone-${index}` ? 5 : 3}
                className="pointer-events-none fill-raised stroke-growth"
                strokeWidth={1.5}
              />
              <circle
                cx={x(point.months)}
                cy={y(point.value)}
                r={12}
                tabIndex={0}
                role="img"
                aria-label={growthMilestoneText(point)}
                className="cursor-pointer fill-transparent outline-none focus-visible:stroke-primary"
                strokeWidth={2}
                {...hover(`milestone-${index}`)}
              />
            </g>
          ))}
          {estimate && (
            <g>
              <circle
                cx={x(estimate.months)}
                cy={y(estimate.value)}
                r={active === 'estimate' ? 5.5 : 4}
                className="pointer-events-none fill-raised stroke-growth"
                strokeWidth={2}
              />
              <circle
                cx={x(estimate.months)}
                cy={y(estimate.value)}
                r={12}
                tabIndex={0}
                role="img"
                aria-label={growthEstimateReadout(estimate)}
                className="cursor-pointer fill-transparent outline-none focus-visible:stroke-primary"
                strokeWidth={2}
                onMouseEnter={() => setActive('estimate')}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive('estimate')}
                onBlur={() => setActive(null)}
                onClick={() => setActive('estimate')}
              />
            </g>
          )}
          {chart.points.map((point, index) => (
            <g key={index}>
              <circle
                cx={x(point.months)}
                cy={y(point.value)}
                r={active === index ? 5.5 : 3.5}
                className="pointer-events-none fill-growth stroke-raised"
                strokeWidth={1.5}
              />
              <circle
                cx={x(point.months)}
                cy={y(point.value)}
                r={12}
                tabIndex={0}
                role="img"
                aria-label={growthPointReadout(point, timeZone)}
                className="cursor-pointer fill-transparent outline-none focus-visible:stroke-primary"
                strokeWidth={2}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(index)}
              />
            </g>
          ))}
        </svg>
        {tip && <PointTip text={tip.text} left={x(tip.point.months) / WIDTH} top={y(tip.point.value) / HEIGHT} />}
      </div>
    </figure>
  );
}

function PointTip({ text, left, top }: { text: string; left: number; top: number }) {
  const edge = readoutEdge(left);
  return (
    <ChartTip
      className={cn(
        'mb-3 -translate-y-full',
        edge === 'center' && '-translate-x-1/2',
        edge === 'right' && '-translate-x-full',
      )}
      style={{ left: `${left * 100}%`, top: `calc(${top * 100}% - 10px)` }}
    >
      {text}
    </ChartTip>
  );
}
