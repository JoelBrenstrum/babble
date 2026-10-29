import { median } from '../stats/maths';
import type { Aggregate } from './spec';

export function aggregateValues(values: readonly number[], aggregate: Aggregate, orderedLast?: number): number | null {
  if (aggregate === 'count') return values.length;
  if (aggregate === 'sum') return values.reduce((total, value) => total + value, 0);
  if (values.length === 0) return null;
  switch (aggregate) {
    case 'avg':
      return values.reduce((total, value) => total + value, 0) / values.length;
    case 'median':
      return median(values);
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'last':
      return orderedLast ?? values[values.length - 1]!;
  }
}

export function rollingAverage(values: readonly (number | null)[], window: number): (number | null)[] {
  return values.map((_, index) => {
    const slice = values
      .slice(Math.max(0, index - window + 1), index + 1)
      .filter((value): value is number => value !== null);
    return slice.length ? slice.reduce((total, value) => total + value, 0) / slice.length : null;
  });
}

export function cumulative(values: readonly (number | null)[]): (number | null)[] {
  let running = 0;
  return values.map((value) => {
    running += value ?? 0;
    return running;
  });
}
