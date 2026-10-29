import type { ChartPad, ChartSize } from '../growth/geometry';
import type { ReportResult } from './report';

export interface LinePoint {
  x: number;
  y: number;
  index: number;
}

export interface LineGeometry extends ChartSize {
  series: {
    key: string;
    tone: string;
    path: string;
    areaPath: string;
    points: LinePoint[];
    averagePath: string | null;
  }[];
  compare: { key: string; path: string }[];
  yTicks: { y: number; label: number }[];
  baseline: number;
  xAt: (index: number) => number;
}

export const REPORT_PAD: ChartPad = { left: 0, right: 0, top: 8, bottom: 0 };

function pathOf(points: readonly { x: number; y: number }[]): string {
  return points.map((point, order) => `${order ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}

export function lineGeometry(result: ReportResult, size: ChartSize, stacked: boolean): LineGeometry {
  const { width, height, pad } = size;
  const count = result.buckets.length;
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const xAt = (index: number) => pad.left + (count <= 1 ? innerWidth / 2 : (index / (count - 1)) * innerWidth);
  const max = result.max > 0 ? result.max : 1;
  const yAt = (value: number) => pad.top + (1 - Math.min(value, max) / max) * innerHeight;
  const baseline = pad.top + innerHeight;
  const running = Array.from({ length: count }, () => 0);
  const series = result.series.map((item) => {
    const points: LinePoint[] = [];
    const tops: { x: number; y: number }[] = [];
    const bottoms: { x: number; y: number }[] = [];
    item.values.forEach((value, index) => {
      if (value === null) return;
      const below = stacked ? running[index]! : 0;
      const top = below + value;
      if (stacked) running[index] = top;
      points.push({ x: xAt(index), y: yAt(top), index });
      tops.push({ x: xAt(index), y: yAt(top) });
      bottoms.push({ x: xAt(index), y: yAt(below) });
    });
    const averagePoints = item.average
      ? item.average.flatMap((value, index) => (value === null ? [] : [{ x: xAt(index), y: yAt(value) }]))
      : [];
    return {
      key: item.key,
      tone: item.tone,
      path: pathOf(tops),
      areaPath: tops.length ? `${pathOf(tops)} ${pathOf([...bottoms].reverse()).replace(/^M/, 'L')} Z` : '',
      points,
      averagePath: averagePoints.length > 1 ? pathOf(averagePoints) : null,
    };
  });
  const compare = (result.compare?.series ?? []).map((item) => ({
    key: item.key,
    path: pathOf(item.values.flatMap((value, index) => (value === null ? [] : [{ x: xAt(index), y: yAt(value) }]))),
  }));
  const yTicks = [0.5, 1].map((fraction) => ({ y: yAt(max * fraction), label: max * fraction }));
  return { width, height, pad, series, compare, yTicks, baseline, xAt };
}

export interface DonutSlice {
  key: string;
  label: string;
  tone: string;
  value: number;
  fraction: number;
  d: string;
}

export function donutSlices(result: ReportResult, radius: number, thickness: number): DonutSlice[] {
  const totals = result.series.map((series) => ({
    key: series.key,
    label: series.label,
    tone: series.tone,
    value: Math.max(0, series.total === null ? 0 : series.perDay ? series.total * result.days : series.total),
  }));
  const sum = totals.reduce((total, item) => total + item.value, 0);
  if (sum <= 0) return [];
  let angle = -Math.PI / 2;
  const inner = radius - thickness;
  return totals
    .filter((item) => item.value > 0)
    .map((item) => {
      const fraction = item.value / sum;
      const sweep = fraction * Math.PI * 2;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      const large = sweep > Math.PI ? 1 : 0;
      const point = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
      const d =
        fraction >= 0.9999
          ? `M${point(radius, start)} A${radius},${radius} 0 1 1 ${point(radius, start + Math.PI)} A${radius},${radius} 0 1 1 ${point(radius, start)} M${point(inner, start)} A${inner},${inner} 0 1 0 ${point(inner, start + Math.PI)} A${inner},${inner} 0 1 0 ${point(inner, start)} Z`
          : `M${point(radius, start)} A${radius},${radius} 0 ${large} 1 ${point(radius, end)} L${point(inner, end)} A${inner},${inner} 0 ${large} 0 ${point(inner, start)} Z`;
      return { ...item, fraction, d };
    });
}

export function heatIntensity(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.min(1, 0.15 + (value / max) * 0.85);
}

export function donutTotal(result: ReportResult): number {
  return result.series.reduce(
    (total, series) =>
      total + Math.max(0, series.total === null ? 0 : series.perDay ? series.total * result.days : series.total),
    0,
  );
}
