import { chartAxis } from './axis';
import type { ChartPoint, GrowthChart } from './growth';

export interface ChartPad {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface ChartSize {
  width: number;
  height: number;
  pad: ChartPad;
}

export interface GrowthGeometry extends ChartSize {
  x: (months: number) => number;
  y: (value: number) => number;
  path: (points: readonly ChartPoint[]) => string;
  curves: { percentile: number; d: string }[];
  measuredPath: string | null;
  aheadPath: string | null;
  yTicks: { value: number; y: number; label: string }[];
  xTicks: { months: number; x: number }[];
}

export function growthChartGeometry(chart: GrowthChart, size: ChartSize): GrowthGeometry {
  const { width, height, pad } = size;
  const x = (months: number) => pad.left + (months / chart.xMax) * (width - pad.left - pad.right);
  const y = (value: number) =>
    pad.top + (1 - (value - chart.yMin) / (chart.yMax - chart.yMin)) * (height - pad.top - pad.bottom);
  const path = (points: readonly ChartPoint[]) =>
    points
      .map((point, order) => `${order ? 'L' : 'M'}${x(point.months).toFixed(1)},${y(point.value).toFixed(1)}`)
      .join(' ');
  const { yTicks, xTicks } = chartAxis(chart);
  const last = chart.points.at(-1);
  const ahead = [...(chart.estimate ? [chart.estimate] : []), ...chart.milestones];
  return {
    width,
    height,
    pad,
    x,
    y,
    path,
    curves: chart.curves.map((curve) => ({ percentile: curve.percentile, d: path(curve.points) })),
    measuredPath: chart.points.length > 1 ? path(chart.points) : null,
    aheadPath: last && ahead.length > 0 ? path([last, ...ahead]) : null,
    yTicks: yTicks.map((value) => ({ value, y: y(value), label: String(Math.round(value * 10) / 10) })),
    xTicks: xTicks.map((months) => ({ months, x: x(months) })),
  };
}
