import type { BabyEvent, Units } from '../events/types';
import { formatLength, formatWeight, GRAMS_PER_POUND, MM_PER_INCH } from '../format/units';
import { calendarDayMs, dayKeyFor, formatShortDate, shiftDay } from '../time/local-time';
import { WHO_LMS } from './who-lms';
import { byStartedAtAsc } from '../time/instants';
import { DAY_MS } from '../time/constants';

export type BabySex = 'female' | 'male';
export type GrowthMeasure = keyof typeof WHO_LMS;
type Lms = readonly [number, number, number];

const DAYS_PER_MONTH = 365.25 / 12;
export const WHO_MAX_MONTHS = 24;
export const CURVE_PERCENTILES = [3, 15, 50, 85, 97] as const;

export function ageInMonths(birthDate: string, iso: string, timeZone: string): number {
  const measured = calendarDayMs(iso, timeZone);
  const born = Date.parse(`${birthDate}T00:00:00Z`);
  return (measured - born) / DAY_MS / DAYS_PER_MONTH;
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

const inches = (cm: number) => (cm * 10) / MM_PER_INCH;

const DISPLAY: Record<GrowthMeasure, Record<Units, { unit: string; fromBase: (value: number) => number }>> = {
  weight: {
    metric: { unit: 'kg', fromBase: (kg) => kg },
    imperial: { unit: 'lb', fromBase: (kg) => (kg * 1000) / GRAMS_PER_POUND },
  },
  length: { metric: { unit: 'cm', fromBase: (cm) => cm }, imperial: { unit: 'in', fromBase: inches } },
  head: { metric: { unit: 'cm', fromBase: (cm) => cm }, imperial: { unit: 'in', fromBase: inches } },
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

export interface GrowthEstimate extends ChartPoint {
  reading: string;
  percentile: string | null;
}

export interface GrowthMilestone extends ChartPoint {
  reading: string;
  dayKey: string;
}

export interface GrowthChart {
  key: GrowthMeasure;
  label: string;
  unit: string;
  latest: { value: string; percentile: string | null; at: string };
  points: MeasuredPoint[];
  estimate: GrowthEstimate | null;
  milestones: GrowthMilestone[];
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

export const ESTIMATE_MIN_POINTS = 3;
const ESTIMATE_RECENT_POINTS = 6;
const ESTIMATE_MAX_AHEAD_DAYS = 90;

export function linearFit(
  points: readonly { x: number; y: number }[],
): { at: (x: number) => number; slope: number } | null {
  const n = points.length;
  if (n < 2) return null;
  const meanX = points.reduce((total, point) => total + point.x, 0) / n;
  const meanY = points.reduce((total, point) => total + point.y, 0) / n;
  const spread = points.reduce((total, point) => total + (point.x - meanX) ** 2, 0);
  if (spread === 0) return null;
  const slope = points.reduce((total, point) => total + (point.x - meanX) * (point.y - meanY), 0) / spread;
  return { at: (x) => meanY + slope * (x - meanX), slope };
}

const NEWBORN_MONTHS = 14 / DAYS_PER_MONTH;
const Z_DRIFT_HALF_LIFE_MONTHS = 14 / DAYS_PER_MONTH;
const MAX_Z_DRIFT = 0.5;
const GROWTH_HALF_LIFE_MONTHS = 3;

export function fadingFit(
  points: readonly { x: number; y: number }[],
  halfLife: number,
  maxDrift = Infinity,
): (x: number) => number {
  // Weight loss and catch-up in the first two weeks would set a slope that doesn't last.
  const settled = points.filter((point) => point.x >= NEWBORN_MONTHS);
  const fit = settled.length >= ESTIMATE_MIN_POINTS ? linearFit(settled) : null;
  const last = points.at(-1)!;
  const start = fit ? fit.at(last.x) : last.y;
  const slope = fit?.slope ?? 0;
  return (x) => {
    const elapsed = Math.max(0, x - last.x);
    const drift = ((slope * halfLife) / Math.LN2) * (1 - 2 ** (-elapsed / halfLife));
    return start + Math.min(maxDrift, Math.max(-maxDrift, drift));
  };
}

type Trend = (months: number) => { value: number; z: number | null } | null;

function growthTrend(
  measure: GrowthMeasure,
  measured: readonly { months: number; value: number }[],
  sex: BabySex | null,
): Trend | null {
  const recent = measured.slice(-ESTIMATE_RECENT_POINTS);
  if (recent.length < ESTIMATE_MIN_POINTS) return null;
  const values = fadingFit(
    recent.map((point) => ({ x: point.months, y: point.value })),
    GROWTH_HALF_LIFE_MONTHS,
  );
  const zPoints = sex
    ? recent.flatMap((point) => {
        const lms = lmsAt(measure, sex, point.months);
        return lms ? [{ x: point.months, y: zScore(point.value, lms) }] : [];
      })
    : [];
  // Babies settle into a percentile band, so a climb through the percentiles eases off rather than carrying on.
  const z = zPoints.length === recent.length ? fadingFit(zPoints, Z_DRIFT_HALF_LIFE_MONTHS, MAX_Z_DRIFT) : null;
  return (months) => {
    const lms = sex ? lmsAt(measure, sex, months) : null;
    if (lms && z) {
      const position = z(months);
      return { value: valueAtZ(position, lms), z: position };
    }
    const value = values(months);
    return value > 0 ? { value, z: null } : null;
  };
}

const daysAfterLast = (measured: readonly { months: number }[], months: number) =>
  (months - (measured.at(-1)?.months ?? months)) * DAYS_PER_MONTH;

export function estimateToday(
  measure: GrowthMeasure,
  measured: readonly { months: number; value: number }[],
  sex: BabySex | null,
  todayMonths: number,
): { value: number; z: number | null } | null {
  const aheadDays = daysAfterLast(measured, todayMonths);
  if (aheadDays < 1 || aheadDays > ESTIMATE_MAX_AHEAD_DAYS) return null;
  return growthTrend(measure, measured, sex)?.(todayMonths) ?? null;
}

const MILESTONE_STEP: Record<GrowthMeasure, Record<Units, number> | null> = {
  weight: { metric: 1, imperial: 2 },
  length: { metric: 5, imperial: 2 },
  head: null,
};
const MILESTONE_AHEAD_DAYS = 120;
const MILESTONE_COUNT = 2;

export function nextMilestones(
  measure: GrowthMeasure,
  measured: readonly { months: number; value: number }[],
  sex: BabySex | null,
  todayMonths: number,
  units: Units,
): { target: number; days: number }[] {
  const step = MILESTONE_STEP[measure]?.[units];
  const last = measured.at(-1);
  const trend = growthTrend(measure, measured, sex);
  if (!step || !last || !trend || daysAfterLast(measured, todayMonths) > ESTIMATE_MAX_AHEAD_DAYS) return [];
  const { fromBase } = DISPLAY[measure][units];
  const reached = Math.max(fromBase(last.value), fromBase(trend(todayMonths)?.value ?? 0));
  let target = (Math.floor(reached / step) + 1) * step;
  const found: { target: number; days: number }[] = [];
  for (let days = 1; days <= MILESTONE_AHEAD_DAYS && found.length < MILESTONE_COUNT; days += 1) {
    const point = trend(todayMonths + days / DAYS_PER_MONTH);
    if (!point) break;
    while (fromBase(point.value) >= target && found.length < MILESTONE_COUNT) {
      found.push({ target, days });
      target += step;
    }
  }
  return found;
}

export function growthReport(
  events: readonly BabyEvent[],
  baby: { birthDate: string; sex: BabySex | null; timeZone: string },
  units: Units,
  estimateAt?: Date,
): GrowthReport {
  const growth = events
    .filter((event): event is Extract<BabyEvent, { type: 'growth' }> => event.type === 'growth' && !event.deletedAt)
    .sort(byStartedAtAsc);

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
    const todayMonths = estimateAt ? ageInMonths(baby.birthDate, estimateAt.toISOString(), baby.timeZone) : null;
    const estimated = todayMonths === null ? null : estimateToday(measure, measured, baby.sex, todayMonths);
    const estimate: GrowthEstimate | null =
      estimated && todayMonths !== null
        ? {
            months: todayMonths,
            value: display.fromBase(estimated.value),
            reading: formatBase(measure, estimated.value, units),
            percentile: estimated.z === null ? null : formatPercentile(normalCdf(estimated.z) * 100),
          }
        : null;
    const todayKey = estimateAt ? dayKeyFor(estimateAt.toISOString(), baby.timeZone, 0) : null;
    const milestones: GrowthMilestone[] =
      todayMonths === null || todayKey === null
        ? []
        : nextMilestones(measure, measured, baby.sex, todayMonths, units).map(({ target, days }) => ({
            months: todayMonths + days / DAYS_PER_MONTH,
            value: target,
            reading: `${target} ${display.unit}`,
            dayKey: shiftDay(todayKey, days),
          }));
    const lastMonths = Math.max(
      ...measured.map((item) => item.months),
      estimate?.months ?? 0,
      ...milestones.map((milestone) => milestone.months),
    );
    const xMax = Math.max(3, Math.ceil(lastMonths + 1));
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
    const values = [
      ...points,
      ...(estimate ? [estimate] : []),
      ...milestones,
      ...curves.flatMap((curve) => curve.points),
    ].map((point) => point.value);
    const low = Math.min(...values);
    const high = Math.max(...values);
    const pad = Math.max((high - low) * 0.06, 0.1);

    charts.push({
      key: measure,
      label: LABEL[measure],
      unit: display.unit,
      latest: { value: last.reading, percentile: last.percentile, at: last.at },
      points,
      estimate,
      milestones,
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

export function growthEstimateReadout(estimate: GrowthEstimate): string {
  const percentile = estimate.percentile ? ` · ${estimate.percentile} percentile` : '';
  return `Estimate for today · ${estimate.reading}${percentile}`;
}

export function growthMilestoneText(milestone: GrowthMilestone): string {
  return `${milestone.reading} around ${formatShortDate(`${milestone.dayKey}T12:00:00Z`, 'UTC')}`;
}
