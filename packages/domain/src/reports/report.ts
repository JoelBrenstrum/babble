import type { BabyEvent } from '../events/types';
import { eventSpan } from '../events/event-span';
import { dayKeyFor, dayWindow, shiftDay } from '../time/local-time';
import type { TimeWindow } from '../time/windows';
import { aggregateValues, cumulative, rollingAverage } from './aggregate';
import { bucketing, dayTitle, previousDays, reportDays, type BucketDef, type Bucketing } from './buckets';
import { formatDelta, formatReportValue } from './format';
import { measureById, type Measure, type ReportUnit } from './measures';
import { nightsOver, type ReportSettings, type Sample } from './samples';
import { passesFilters, splitLabel, splitValues, SPLIT_ORDER } from './splits';
import type { Aggregate, ReportSpec, SplitKey } from './spec';

export interface ReportSeriesResult {
  key: string;
  label: string;
  tone: string;
  unit: ReportUnit;
  aggregate: Aggregate;
  perDay: boolean;
  values: (number | null)[];
  average?: (number | null)[];
  total: number | null;
  count: number;
}

export interface ReportGrid {
  rows: BucketDef[];
  cols: string[];
  values: number[][];
  max: number;
}

export interface ReportBin {
  from: number;
  to: number;
  label: string;
  count: number;
}

export interface ReportDistribution {
  bins: ReportBin[];
  median: number | null;
  count: number;
  width: number;
}

export interface RhythmBlock {
  type: BabyEvent['type'];
  tone: string;
  start: number;
  end: number;
  eventId: string;
}

export interface RhythmRow {
  dayKey: string;
  title: string;
  blocks: RhythmBlock[];
}

export interface ReportFigure {
  label: string;
  value: string;
  delta?: string | null;
}

export interface ReportResult {
  spec: ReportSpec;
  unit: ReportUnit;
  days: number;
  todayKey: string;
  buckets: BucketDef[];
  series: ReportSeriesResult[];
  max: number;
  figures: ReportFigure[];
  compare: { label: string; series: ReportSeriesResult[] } | null;
  grid: ReportGrid | null;
  distribution: ReportDistribution | null;
  rhythm: RhythmRow[] | null;
  empty: boolean;
}

const MAX_SPLIT_SERIES = 8;
const OTHER_KEY = '__other';

const SPLIT_TONES: Partial<Record<SplitKey, readonly string[]>> = {
  carer: ['person-1', 'person-2', 'person-3', 'person-4'],
  side: ['feed-left', 'feed-right'],
  dayNight: ['primary', 'sleep'],
  nappyKind: ['nappy/50', 'nappy', 'nappy/75'],
};
const DEFAULT_TONES = ['sleep', 'bottle', 'feed-left', 'nappy', 'pump', 'growth', 'solids', 'custom', 'ink-3'];
const RHYTHM_TONES: Partial<Record<BabyEvent['type'], string>> = {
  sleep: 'sleep',
  breast_feed: 'feed-left',
  bottle: 'bottle',
  pump: 'pump',
  nappy: 'nappy',
  solids: 'solids',
};

interface SeriesPlan {
  key: string;
  label: string;
  tone: string;
  measure: Measure;
  aggregate: Aggregate;
  samples: Sample[];
}

function splitTone(key: SplitKey, value: string, index: number): string {
  if (key === 'pooColour' && value !== 'unknown') return `poo-${value.replace(/_/g, '-')}`;
  const palette = SPLIT_TONES[key] ?? DEFAULT_TONES;
  return palette[index % palette.length]!;
}

function collectSamples(
  spec: ReportSpec,
  measure: Measure,
  events: readonly BabyEvent[],
  now: Date,
  settings: ReportSettings,
  range: TimeWindow,
  nights: TimeWindow[],
): Sample[] {
  const relevant = events.filter((event) => !event.deletedAt && measure.types.includes(event.type));
  const samples = measure.samples({ events: relevant, now, settings, range, nights });
  return samples.filter(
    (sample) =>
      (sample.end ?? sample.at) >= range.start.getTime() &&
      sample.at < range.end.getTime() &&
      passesFilters(sample, spec.filters, settings),
  );
}

function splitSeries(spec: ReportSpec, plan: SeriesPlan, settings: ReportSettings): SeriesPlan[] {
  const key = spec.splitBy!;
  const groups = new Map<string, Sample[]>();
  for (const sample of plan.samples) {
    for (const value of splitValues(sample, key, settings)) {
      const list = groups.get(value) ?? [];
      list.push(sample);
      groups.set(value, list);
    }
  }
  const weight = (samples: Sample[]) => samples.reduce((total, sample) => total + sample.value, 0);
  const preset = SPLIT_ORDER[key];
  const ordered = [...groups.entries()].sort((a, b) => {
    if (preset) {
      const ai = preset.indexOf(a[0]);
      const bi = preset.indexOf(b[0]);
      if (ai !== bi) return (ai === -1 ? preset.length : ai) - (bi === -1 ? preset.length : bi);
    }
    return weight(b[1]) - weight(a[1]);
  });
  const kept = ordered.slice(0, MAX_SPLIT_SERIES);
  const rest = ordered.slice(MAX_SPLIT_SERIES);
  const plans = kept.map(([value, samples], index) => ({
    ...plan,
    key: `${plan.key}:${value}`,
    label: splitLabel(key, value, settings),
    tone: splitTone(key, value, index),
    samples,
  }));
  if (rest.length) {
    plans.push({
      ...plan,
      key: `${plan.key}:${OTHER_KEY}`,
      label: 'Other',
      tone: 'ink-3',
      samples: rest.flatMap(([, samples]) => samples),
    });
  }
  return plans;
}

function bucketValues(plan: SeriesPlan, buckets: Bucketing, perDayScale: boolean): (number | null)[] {
  const perBucket: number[][] = buckets.defs.map(() => []);
  const lastAt: number[] = buckets.defs.map(() => -Infinity);
  const lastValue: number[] = buckets.defs.map(() => 0);
  for (const sample of plan.samples) {
    const pieces =
      plan.measure.interval && sample.end !== undefined
        ? buckets.splitInterval({ start: sample.at, end: sample.end }).map((piece) => ({
            index: piece.index,
            value: piece.interval.end - piece.interval.start,
          }))
        : [{ index: buckets.indexOfInstant(sample.at), value: sample.value }];
    for (const piece of pieces) {
      if (piece.index < 0) continue;
      perBucket[piece.index]!.push(piece.value);
      if (sample.at >= lastAt[piece.index]!) {
        lastAt[piece.index] = sample.at;
        lastValue[piece.index] = piece.value;
      }
    }
  }
  return buckets.defs.map((def, index) => {
    const value = aggregateValues(perBucket[index]!, plan.aggregate, lastValue[index]);
    if (value === null) return null;
    return perDayScale && plan.measure.perDay && plan.aggregate === 'sum' && def.days > 0 ? value / def.days : value;
  });
}

function seriesTotal(plan: SeriesPlan, buckets: Bucketing, days: number): number | null {
  if (plan.aggregate === 'sum' || plan.aggregate === 'count') {
    const inRange = plan.samples.flatMap((sample) =>
      plan.measure.interval && sample.end !== undefined
        ? buckets
            .splitInterval({ start: sample.at, end: sample.end })
            .map((piece) => piece.interval.end - piece.interval.start)
        : buckets.indexOfInstant(sample.at) >= 0
          ? [sample.value]
          : [],
    );
    const total = aggregateValues(inRange, plan.aggregate) ?? 0;
    return plan.measure.perDay && days > 0 ? total / days : total;
  }
  const values = plan.samples.filter((sample) => buckets.indexOfInstant(sample.at) >= 0).map((sample) => sample.value);
  const ordered = [...plan.samples].sort((a, b) => a.at - b.at);
  return aggregateValues(values, plan.aggregate, ordered.at(-1)?.value);
}

function buildSeries(
  plans: readonly SeriesPlan[],
  buckets: Bucketing,
  spec: ReportSpec,
  days: number,
  perDayScale: boolean,
): { defs: BucketDef[]; series: ReportSeriesResult[] } {
  let defs = buckets.defs;
  let columns = plans.map((plan) => bucketValues(plan, buckets, perDayScale));
  if (spec.options.emptyDays === false && spec.bucket !== 'hour' && spec.bucket !== 'weekday') {
    const keep = defs.map((_, index) => columns.some((values) => (values[index] ?? 0) !== 0));
    defs = defs.filter((_, index) => keep[index]);
    columns = columns.map((values) => values.filter((_, index) => keep[index]));
  }
  const series = plans.map((plan, order) => {
    let values = columns[order]!;
    if (spec.options.cumulative && (spec.bucket === 'day' || spec.bucket === 'week' || spec.bucket === 'month')) {
      values = cumulative(values);
    }
    const average =
      spec.options.average && spec.bucket === 'day' ? rollingAverage(values, spec.options.average) : undefined;
    return {
      key: plan.key,
      label: plan.label,
      tone: plan.tone,
      unit: plan.measure.unit,
      aggregate: plan.aggregate,
      perDay: plan.measure.perDay && plan.aggregate === 'sum',
      values,
      ...(average ? { average } : {}),
      total: seriesTotal(plan, buckets, days),
      count: plan.samples.filter((sample) => buckets.indexOfInstant(sample.at) >= 0 || plan.measure.interval).length,
    };
  });
  return { defs, series };
}

function heatmapGrid(plans: readonly SeriesPlan[], dayKeys: readonly string[], settings: ReportSettings): ReportGrid {
  const days = bucketing('day', dayKeys, settings);
  const hours = bucketing('hour', dayKeys, settings);
  const cells: number[][][] = dayKeys.map(() => Array.from({ length: 24 }, () => []));
  for (const plan of plans) {
    for (const sample of plan.samples) {
      if (plan.measure.interval && sample.end !== undefined) {
        for (const piece of days.splitInterval({ start: sample.at, end: sample.end })) {
          for (const hourPiece of hours.splitInterval(piece.interval)) {
            cells[piece.index]![hourPiece.index]!.push(hourPiece.interval.end - hourPiece.interval.start);
          }
        }
      } else {
        const dayIndex = days.indexOfInstant(sample.at);
        const hour = hours.indexOfInstant(sample.at);
        if (dayIndex >= 0 && hour >= 0) cells[dayIndex]![hour]!.push(sample.value);
      }
    }
  }
  const aggregate = plans[0]?.aggregate ?? 'sum';
  const values = cells.map((row) => row.map((cell) => aggregateValues(cell, aggregate) ?? 0));
  return {
    rows: days.defs,
    cols: hours.defs.map((def) => def.label),
    values,
    max: values.reduce((highest, row) => Math.max(highest, ...row), 0),
  };
}

const NICE_WIDTHS: Record<ReportUnit, number[]> = {
  h: [5, 10, 15, 30, 60, 120, 180].map((minutes) => minutes * 60_000),
  min: [1, 2, 5, 10, 15, 30].map((minutes) => minutes * 60_000),
  ml: [5, 10, 20, 25, 50, 100],
  g: [10, 25, 50, 100, 250, 500],
  mm: [5, 10, 20, 50],
  count: [1, 2, 5, 10],
};

function distribution(
  plan: SeriesPlan,
  buckets: Bucketing,
  unit: ReportUnit,
  format: (value: number) => string,
): ReportDistribution {
  const values = plan.samples.filter((sample) => buckets.indexOfInstant(sample.at) >= 0).map((sample) => sample.value);
  if (values.length === 0) return { bins: [], median: null, count: 0, width: 0 };
  const highest = Math.max(...values);
  const widths = NICE_WIDTHS[unit];
  const width =
    widths.find((candidate) => highest / candidate <= 12) ??
    widths.at(-1)! * Math.ceil(highest / (widths.at(-1)! * 12));
  const binCount = Math.max(1, Math.ceil((highest + 1e-9) / width));
  const bins: ReportBin[] = Array.from({ length: binCount }, (_, index) => ({
    from: index * width,
    to: (index + 1) * width,
    label: `${format(index * width)} to ${format((index + 1) * width)}`,
    count: 0,
  }));
  for (const value of values) bins[Math.min(binCount - 1, Math.floor(value / width))]!.count += 1;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianValue = sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return { bins, median: medianValue, count: values.length, width };
}

const fraction = (part: number, whole: number) => Math.round((part / whole) * 1e5) / 1e5;

export function rhythmRows(
  events: readonly BabyEvent[],
  dayKeys: readonly string[],
  types: readonly BabyEvent['type'][],
  settings: ReportSettings,
  now: Date,
): RhythmRow[] {
  return dayKeys.map((dayKey) => {
    const window = dayWindow(dayKey, settings.timeZone, settings.dayStartMinutes);
    const length = window.end.getTime() - window.start.getTime();
    const blocks = events
      .filter((event) => !event.deletedAt && types.includes(event.type))
      .flatMap((event) => {
        const span = eventSpan(event, now);
        const start = Math.max(span.start.getTime(), window.start.getTime());
        const end = Math.min(Math.max(span.end.getTime(), span.start.getTime() + 1), window.end.getTime());
        if (end <= start && !(span.start >= window.start && span.start < window.end)) return [];
        return [
          {
            type: event.type,
            tone: RHYTHM_TONES[event.type] ?? 'custom',
            start: fraction(start - window.start.getTime(), length),
            end: fraction(Math.max(start, end) - window.start.getTime(), length),
            eventId: event.id,
          },
        ];
      })
      .sort((a, b) => a.start - b.start);
    return { dayKey, title: dayTitle(dayKey), blocks };
  });
}

function figuresFor(result: Omit<ReportResult, 'figures'>, settings: ReportSettings): ReportFigure[] {
  const format = (value: number | null, unit: ReportUnit) => formatReportValue(value, unit, settings.units);
  const figures: ReportFigure[] = [];
  const single = result.series.length === 1;
  for (const series of result.series.slice(0, single ? 1 : 4)) {
    const compared = result.compare?.series.find((item) => item.key === series.key);
    const label = single ? (series.perDay ? 'Per day' : aggregateLabel(series.aggregate)) : series.label;
    figures.push({
      label,
      value: format(series.total, series.unit),
      delta: compared ? formatDelta(series.total, compared.total, series.unit, settings.units) : null,
    });
  }
  if (single) {
    const series = result.series[0]!;
    if (series.perDay && result.days > 1) {
      const total = series.total === null ? null : series.total * result.days;
      figures.push({ label: 'Total', value: format(total, series.unit) });
    }
    const highest = series.values.reduce<{ value: number; index: number } | null>(
      (best, value, index) => (value !== null && (!best || value > best.value) ? { value, index } : best),
      null,
    );
    if (highest && result.buckets.length > 1) {
      figures.push({
        label: `Highest ${bucketNoun(result.spec)}`,
        value: `${format(highest.value, series.unit)} · ${result.buckets[highest.index]!.title}`,
      });
    }
  }
  if (result.distribution && result.distribution.median !== null) {
    figures.push({ label: 'Median', value: format(result.distribution.median, result.unit) });
    figures.push({ label: 'Entries', value: String(result.distribution.count) });
  }
  return figures;
}

function aggregateLabel(aggregate: Aggregate): string {
  switch (aggregate) {
    case 'avg':
      return 'Average';
    case 'median':
      return 'Median';
    case 'min':
      return 'Lowest';
    case 'max':
      return 'Highest';
    case 'last':
      return 'Latest';
    case 'count':
      return 'Entries';
    case 'sum':
      return 'Total';
  }
}

function bucketNoun(spec: ReportSpec): string {
  switch (spec.bucket) {
    case 'day':
      return 'day';
    case 'week':
      return 'week';
    case 'month':
      return 'month';
    case 'hour':
      return 'hour';
    case 'weekday':
      return 'weekday';
  }
}

export function runReport(
  spec: ReportSpec,
  events: readonly BabyEvent[],
  todayKey: string,
  now: Date,
  settings: ReportSettings,
): ReportResult {
  const dayKeys = reportDays(spec.range, todayKey, settings.birthDate);
  const measures = spec.series
    .map((series) => ({ series, measure: measureById(series.measure) }))
    .filter((item): item is { series: ReportSpec['series'][number]; measure: Measure } => item.measure !== null);
  const unit = measures[0]?.measure.unit ?? 'count';

  const compute = (keys: readonly string[]) => {
    const range: TimeWindow = {
      start: dayWindow(keys[0]!, settings.timeZone, settings.dayStartMinutes).start,
      end: dayWindow(keys.at(-1)!, settings.timeZone, settings.dayStartMinutes).end,
    };
    const nights = nightsOver([shiftDay(keys[0]!, -1), ...keys], settings);
    const basePlans: SeriesPlan[] = measures.map(({ series, measure }) => ({
      key: measure.id,
      label: series.label ?? measure.label,
      tone: measure.tone,
      measure,
      aggregate: series.aggregate ?? measure.aggregate,
      samples: collectSamples(spec, measure, events, now, settings, range, nights),
    }));
    const plans = spec.splitBy && basePlans[0] ? splitSeries(spec, basePlans[0], settings) : basePlans;
    const buckets = bucketing(spec.bucket, keys, settings);
    const finishedDays = keys.filter((key) => key < todayKey).length || keys.length;
    const built = buildSeries(plans, buckets, spec, finishedDays, spec.bucket !== 'day');
    return { keys, plans, buckets, series: built.series, defs: built.defs, finishedDays };
  };

  const current = compute(dayKeys);
  const buckets = current.defs;
  const { series } = current;

  const compare =
    spec.compare === 'previous' && !spec.splitBy
      ? (() => {
          const previous = compute(previousDays(dayKeys));
          return { label: `Previous ${dayKeys.length} days`, series: previous.series };
        })()
      : null;

  const stacked = spec.options.stack !== false && (spec.chart === 'bar' || spec.chart === 'area') && series.length > 1;
  const max = buckets.reduce((highest, _, index) => {
    const column = series.map((item) => item.values[index] ?? 0);
    const value = stacked ? column.reduce((total, item) => total + item, 0) : Math.max(0, ...column);
    const compared = compare ? Math.max(0, ...compare.series.map((item) => item.values[index] ?? 0)) : 0;
    return Math.max(highest, value, compared);
  }, 0);

  const first = current.plans[0];
  const partial: Omit<ReportResult, 'figures'> = {
    spec,
    unit,
    days: current.finishedDays,
    todayKey,
    buckets,
    series,
    max,
    compare,
    grid: spec.chart === 'heatmap' && current.plans.length ? heatmapGrid(current.plans, dayKeys, settings) : null,
    distribution:
      spec.chart === 'histogram' && first
        ? distribution(first, current.buckets, first.measure.unit, (value) =>
            formatReportValue(value, first.measure.unit, settings.units),
          )
        : null,
    rhythm:
      spec.chart === 'rhythm'
        ? rhythmRows(events, dayKeys, [...new Set(measures.flatMap((item) => item.measure.types))], settings, now)
        : null,
    empty: current.plans.every((plan) => plan.samples.length === 0),
  };
  return { ...partial, figures: figuresFor(partial, settings) };
}

export function bucketReadout(result: ReportResult, index: number, units: ReportSettings['units']): string[] {
  const bucket = result.buckets[index];
  if (!bucket) return [];
  const lines = result.series.map(
    (series) => `${series.label} ${formatReportValue(series.values[index] ?? null, series.unit, units)}`,
  );
  if (
    result.series.length > 1 &&
    result.spec.options.stack !== false &&
    result.series.every((item) => item.unit === result.unit)
  ) {
    const total = result.series.reduce((sum, series) => sum + (series.values[index] ?? 0), 0);
    lines.push(`Total ${formatReportValue(total, result.unit, units)}`);
  }
  const compared =
    result.compare?.series.map(
      (series) => `${series.label} before ${formatReportValue(series.values[index] ?? null, series.unit, units)}`,
    ) ?? [];
  return [bucket.title, ...lines, ...compared];
}

export function reportDayKeyAt(result: ReportResult, index: number): string | null {
  const bucket = result.buckets[index];
  return bucket?.lastDay ?? null;
}

export const todayKeyFor = (now: Date, settings: Pick<ReportSettings, 'timeZone' | 'dayStartMinutes'>) =>
  dayKeyFor(now.toISOString(), settings.timeZone, settings.dayStartMinutes);
