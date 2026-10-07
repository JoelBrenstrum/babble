import { formatShortDate, type GrowthChart, type GrowthReport } from '@babble/domain';
import { Link } from '@tanstack/react-router';
import { Ruler } from 'lucide-react';
import { Card } from '#/components/ui/card';
import { StatusMessage } from '#/components/ui/status';

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

function niceStep(range: number): number {
  const raw = range / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((factor) => factor * magnitude).find((step) => step >= raw) ?? raw;
}

export function GrowthCard({
  report,
  babyName,
  timeZone,
}: {
  report: GrowthReport;
  babyName: string;
  timeZone: string;
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
        <Link
          to="/track/$type/new"
          params={{ type: 'growth' }}
          className="text-meta font-semibold text-primary underline-offset-4 hover:underline"
        >
          Log growth
        </Link>
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
            <GrowthChartView key={chart.key} chart={chart} timeZone={timeZone} />
          ))}
        </div>
      )}
      {report.charts.some((chart) => chart.curves.length > 0) && (
        <p className="text-caption text-ink-3">
          Lines show the WHO 3rd, 15th, 50th, 85th and 97th percentiles, up to 2 years.
        </p>
      )}
    </Card>
  );
}

function GrowthChartView({ chart, timeZone }: { chart: GrowthChart; timeZone: string }) {
  const x = (months: number) => PAD.left + (months / chart.xMax) * (WIDTH - PAD.left - PAD.right);
  const y = (value: number) =>
    PAD.top + (1 - (value - chart.yMin) / (chart.yMax - chart.yMin)) * (HEIGHT - PAD.top - PAD.bottom);
  const path = (points: { months: number; value: number }[]) =>
    points
      .map((point, index) => `${index ? 'L' : 'M'}${x(point.months).toFixed(1)},${y(point.value).toFixed(1)}`)
      .join(' ');
  const yStep = niceStep(chart.yMax - chart.yMin);
  const yTicks: number[] = [];
  for (let value = Math.ceil(chart.yMin / yStep) * yStep; value <= chart.yMax; value += yStep) yTicks.push(value);
  const xStep = chart.xMax <= 6 ? 1 : chart.xMax <= 12 ? 2 : chart.xMax <= 24 ? 3 : 6;
  const xTicks: number[] = [];
  for (let months = 0; months <= chart.xMax; months += xStep) xTicks.push(months);

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
        {chart.points.map((point, index) => (
          <circle
            key={index}
            cx={x(point.months)}
            cy={y(point.value)}
            r={3.5}
            className="fill-growth stroke-raised"
            strokeWidth={1.5}
          />
        ))}
      </svg>
    </figure>
  );
}
