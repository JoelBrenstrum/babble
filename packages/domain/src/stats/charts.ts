import { formatShortDate } from '../time/local-time';

export type ChartUnit = 'h' | 'min' | 'ml' | '';

export interface ChartBar {
  label: string;
  values: number[];
  title?: string;
}

export interface StatsChart {
  unit: ChartUnit;
  series: string[];
  legend: number[];
  bars: ChartBar[];
  max: number;
  weekly: boolean;
}

const WEEKLY_AFTER_DAYS = 31;

export function weeklyBars(bars: readonly ChartBar[]): ChartBar[] {
  if (bars.length <= WEEKLY_AFTER_DAYS) return [...bars];
  const weeks: ChartBar[] = [];
  for (let end = bars.length; end > 0; end -= 7) {
    const chunk = bars.slice(Math.max(0, end - 7), end);
    const width = chunk[0]!.values.length;
    weeks.unshift({
      label: chunk[0]!.label,
      values: Array.from(
        { length: width },
        (_, index) => chunk.reduce((total, bar) => total + bar.values[index]!, 0) / chunk.length,
      ),
    });
  }
  return weeks;
}

export function topSegment(values: readonly number[]): number {
  for (let index = values.length - 1; index >= 0; index -= 1) if (values[index]! > 0) return index;
  return -1;
}

export function chartValue(value: number, unit: ChartUnit): string {
  const rounded = value >= 10 && unit !== 'h' ? Math.round(value) : Math.round(value * 10) / 10;
  if (unit === 'h') return `${rounded}h`;
  return unit === '' ? String(rounded) : `${rounded} ${unit}`;
}

export const chartDayLabel = (key: string) => formatShortDate(`${key}T12:00:00Z`, 'UTC');

export const barTitle = (bar: ChartBar) => bar.title ?? chartDayLabel(bar.label);

export function chartEnds(chart: StatsChart): [string, string] | null {
  const first = chart.bars[0];
  const last = chart.bars.at(-1);
  if (!first || !last) return null;
  return [barTitle(first), last.title ? 'Now' : barTitle(last)];
}

export function barReadout(chart: StatsChart, bar: ChartBar): string {
  const values =
    chart.series.length === 1
      ? chartValue(bar.values[0]!, chart.unit)
      : `${chart.legend.map((index) => `${chart.series[index]} ${chartValue(bar.values[index]!, chart.unit)}`).join(', ')} · Total ${chartValue(
          bar.values.reduce((sum, value) => sum + value, 0),
          chart.unit,
        )}`;
  return `${chart.weekly ? 'Week of ' : ''}${barTitle(bar)}: ${values}`;
}

export function barAnchor(index: number, count: number): { edge: 'left' | 'center' | 'right'; percent: number } {
  if (index < count / 3) return { edge: 'left', percent: (index / count) * 100 };
  if (index >= (count * 2) / 3) return { edge: 'right', percent: ((count - index - 1) / count) * 100 };
  return { edge: 'center', percent: ((index + 0.5) / count) * 100 };
}

export function buildChart(
  unit: ChartUnit,
  series: string[],
  bars: ChartBar[],
  legend = series.map((_, index) => index),
): StatsChart {
  const grouped = bars.some((bar) => bar.title) ? bars : weeklyBars(bars);
  const max = grouped.reduce(
    (highest, bar) =>
      Math.max(
        highest,
        bar.values.reduce((sum, value) => sum + value, 0),
      ),
    0,
  );
  return { unit, series, legend, bars: grouped, max, weekly: grouped.length !== bars.length };
}

export function nextBarIndex(key: string, index: number, count: number): number | null {
  const target =
    key === 'ArrowLeft'
      ? index - 1
      : key === 'ArrowRight'
        ? index + 1
        : key === 'Home'
          ? 0
          : key === 'End'
            ? count - 1
            : -1;
  return target >= 0 && target < count ? target : null;
}
