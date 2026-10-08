import type { BabyEvent, GrowthDetails, Units } from '../events/types';
import { formatShortDate } from '../time/local-time';

type Measure = keyof GrowthDetails;

const MEASURES: Measure[] = ['weightG', 'lengthMm', 'headCircumferenceMm'];

export function growthInputUnit(measure: Measure, units: Units): { label: string; divisor: number } {
  if (measure === 'weightG')
    return units === 'metric' ? { label: 'kg', divisor: 1000 } : { label: 'lb', divisor: 453.59237 };
  return units === 'metric' ? { label: 'cm', divisor: 10 } : { label: 'in', divisor: 25.4 };
}

export function toGrowthInput(value: number, measure: Measure, units: Units): string {
  return String(Number((value / growthInputUnit(measure, units).divisor).toFixed(2)));
}

export function growthPlaceholders(
  events: readonly BabyEvent[],
  units: Units,
  timeZone: string,
  excludeId?: string,
): Record<Measure, string | null> {
  const growth = events
    .filter((event) => event.type === 'growth' && !event.deletedAt && event.id !== excludeId)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const placeholders = {} as Record<Measure, string | null>;
  for (const measure of MEASURES) {
    const latest = growth.find((event) => event.type === 'growth' && event.details[measure] !== null);
    const value = latest?.type === 'growth' ? latest.details[measure] : null;
    placeholders[measure] =
      latest && value !== null
        ? `Last: ${toGrowthInput(value, measure, units)} ${growthInputUnit(measure, units).label} · ${formatShortDate(latest.startedAt, timeZone)}`
        : null;
  }
  return placeholders;
}
