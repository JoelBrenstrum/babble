import type { BabyEvent, Units } from '../events/types';
import { formatLength, formatWeight } from '../format/units';
import { dayKeyFor, formatShortDate } from '../time/local-time';
import { WHO_LMS } from './who-lms';

export type BabySex = 'female' | 'male';
export type GrowthMeasure = keyof typeof WHO_LMS;
type Lms = readonly [number, number, number];

const DAYS_PER_MONTH = 365.25 / 12;
export const WHO_MAX_MONTHS = 24;
export const CURVE_PERCENTILES = [3, 15, 50, 85, 97] as const;

export function ageInMonths(birthDate: string, iso: string, timeZone: string): number {
  const measured = Date.parse(`${dayKeyFor(iso, timeZone, 0)}T00:00:00Z`);
  const born = Date.parse(`${birthDate}T00:00:00Z`);
  return (measured - born) / 86_400_000 / DAYS_PER_MONTH;
}

export function lmsAt(measure: GrowthMeasure, sex: BabySex, months: number): Lms | null {
  if (months < 0 || months > WHO_MAX_MONTHS) return null;
  const table = WHO_LMS[measure][sex];
  const lower = Math.floor(months);
  const upper = Math.min(lower + 1, WHO_MAX_MONTHS);
  const t = months - lower;
  const [l0, m0, s0] = table[lower]!;
  const [l1, m1, s1] = table[upper]!;
  return [l0 + (l1 - l0) * t, m0 + (m1 - m0) * t, s0 + (s1 - s0) * t];
}

export function zScore(value: number, [l, m, s]: Lms): number {
  return l === 0 ? Math.log(value / m) / s : ((value / m) ** l - 1) / (l * s);
}

export function valueAtZ(z: number, [l, m, s]: Lms): number {
  return l === 0 ? m * Math.exp(s * z) : m * (1 + l * s * z) ** (1 / l);
}

export function normalCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

export function zForPercentile(percentile: number): number {
  let low = -6;
  let high = 6;
  for (let step = 0; step < 60; step += 1) {
    const mid = (low + high) / 2;
    if (normalCdf(mid) * 100 < percentile) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

export function formatPercentile(percentile: number): string {
  if (percentile < 1) return 'below 1st';
  if (percentile > 99) return 'above 99th';
  const rounded = Math.round(percentile);
  const tens = rounded % 100;
  const suffix =
    tens >= 11 && tens <= 13
      ? 'th'
      : rounded % 10 === 1
        ? 'st'
        : rounded % 10 === 2
          ? 'nd'
          : rounded % 10 === 3
            ? 'rd'
            : 'th';
  return `${rounded}${suffix}`;
}

const DISPLAY: Record<GrowthMeasure, Record<Units, { unit: string; fromBase: (value: number) => number }>> = {
  weight: {
    metric: { unit: 'kg', fromBase: (kg) => kg },
    imperial: { unit: 'lb', fromBase: (kg) => kg * 2.2046226218 },
  },
  length: { metric: { unit: 'cm', fromBase: (cm) => cm }, imperial: { unit: 'in', fromBase: (cm) => cm / 2.54 } },
  head: { metric: { unit: 'cm', fromBase: (cm) => cm }, imperial: { unit: 'in', fromBase: (cm) => cm / 2.54 } },
};

const LABEL: Record<GrowthMeasure, string> = { weight: 'Weight', length: 'Length', head: 'Head' };

export interface ChartPoint {
  months: number;
  value: number;
}

export interface MeasuredPoint extends ChartPoint {
  reading: string;
  percentile: string | null;
  at: string;
}

export interface GrowthChart {
  key: GrowthMeasure;
  label: string;
  unit: string;
  latest: { value: string; percentile: string | null; at: string };
  points: MeasuredPoint[];
  curves: { percentile: number; points: ChartPoint[] }[];
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface GrowthReport {
  needsSex: boolean;
  charts: GrowthChart[];
}

function baseValue(measure: GrowthMeasure, event: Extract<BabyEvent, { type: 'growth' }>): number | null {
  const { weightG, lengthMm, headCircumferenceMm } = event.details;
  if (measure === 'weight') return weightG === null ? null : weightG / 1000;
  if (measure === 'length') return lengthMm === null ? null : lengthMm / 10;
  return headCircumferenceMm === null ? null : headCircumferenceMm / 10;
}

function formatBase(measure: GrowthMeasure, value: number, units: Units): string {
  return measure === 'weight' ? formatWeight(value * 1000, units) : formatLength(value * 10, units);
}

export function growthReport(
  events: readonly BabyEvent[],
  baby: { birthDate: string; sex: BabySex | null; timeZone: string },
  units: Units,
): GrowthReport {
  const growth = events
    .filter((event): event is Extract<BabyEvent, { type: 'growth' }> => event.type === 'growth' && !event.deletedAt)
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));

  const charts: GrowthChart[] = [];
  for (const measure of ['weight', 'length', 'head'] as const) {
    const measured = growth.flatMap((event) => {
      const value = baseValue(measure, event);
      return value === null
        ? []
        : [{ event, value, months: ageInMonths(baby.birthDate, event.startedAt, baby.timeZone) }];
    });
    const latest = measured.at(-1);
    if (!latest) continue;

    const display = DISPLAY[measure][units];
    const xMax = Math.max(3, Math.ceil(Math.max(...measured.map((item) => item.months)) + 1));
    const curveEnd = Math.min(xMax, WHO_MAX_MONTHS);
    const curves = baby.sex
      ? CURVE_PERCENTILES.map((percentile) => {
          const z = zForPercentile(percentile);
          const points: ChartPoint[] = [];
          for (let months = 0; months <= curveEnd + 1e-9; months += 0.5) {
            points.push({ months, value: display.fromBase(valueAtZ(z, lmsAt(measure, baby.sex!, months)!)) });
          }
          return { percentile, points };
        })
      : [];
    const points: MeasuredPoint[] = measured.map((item) => {
      const lms = baby.sex ? lmsAt(measure, baby.sex, item.months) : null;
      return {
        months: item.months,
        value: display.fromBase(item.value),
        reading: formatBase(measure, item.value, units),
        percentile: lms ? formatPercentile(normalCdf(zScore(item.value, lms)) * 100) : null,
        at: item.event.startedAt,
      };
    });
    const last = points.at(-1)!;
    const values = [...points, ...curves.flatMap((curve) => curve.points)].map((point) => point.value);
    const low = Math.min(...values);
    const high = Math.max(...values);
    const pad = Math.max((high - low) * 0.06, 0.1);

    charts.push({
      key: measure,
      label: LABEL[measure],
      unit: display.unit,
      latest: { value: last.reading, percentile: last.percentile, at: last.at },
      points,
      curves,
      xMax,
      yMin: Math.max(0, low - pad),
      yMax: high + pad,
    });
  }
  return { needsSex: baby.sex === null && charts.length > 0, charts };
}

export function readoutEdge(fraction: number): 'left' | 'center' | 'right' {
  if (fraction < 0.25) return 'left';
  return fraction > 0.75 ? 'right' : 'center';
}

export function growthPointReadout(point: MeasuredPoint, timeZone: string): string {
  const percentile = point.percentile ? ` · ${point.percentile} percentile` : '';
  return `${formatShortDate(point.at, timeZone)} · ${point.reading}${percentile}`;
}
