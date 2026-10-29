export const REPORT_RANGE_PRESETS = ['7d', '14d', '30d', '90d', '6m', 'all'] as const;
export type ReportRangePreset = (typeof REPORT_RANGE_PRESETS)[number];

export const REPORT_RANGE_LABELS: Record<ReportRangePreset, string> = {
  '7d': '7 days',
  '14d': '14 days',
  '30d': '30 days',
  '90d': '90 days',
  '6m': '6 months',
  all: 'All',
};

export type ReportRange = { preset: ReportRangePreset } | { from: string; to: string };

export const REPORT_BUCKETS = ['day', 'week', 'month', 'hour', 'weekday'] as const;
export type ReportBucket = (typeof REPORT_BUCKETS)[number];

export const REPORT_BUCKET_LABELS: Record<ReportBucket, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  hour: 'Hour of day',
  weekday: 'Weekday',
};

export const CHART_TYPES = [
  'bar',
  'line',
  'area',
  'donut',
  'number',
  'table',
  'heatmap',
  'histogram',
  'rhythm',
] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: 'Bar',
  line: 'Line',
  area: 'Area',
  donut: 'Donut',
  number: 'Number',
  table: 'Table',
  heatmap: 'Heatmap',
  histogram: 'Histogram',
  rhythm: 'Rhythm',
};

export const AGGREGATES = ['sum', 'avg', 'count', 'median', 'min', 'max', 'last'] as const;
export type Aggregate = (typeof AGGREGATES)[number];

export const SPLIT_KEYS = [
  'location',
  'fallAsleep',
  'startMood',
  'endMood',
  'quality',
  'side',
  'bottleContent',
  'nappyKind',
  'wetSize',
  'pooSize',
  'pooColour',
  'pooTexture',
  'solidsAmount',
  'solidsReaction',
  'carer',
  'device',
  'source',
  'weekday',
  'dayNight',
] as const;
export type SplitKey = (typeof SPLIT_KEYS)[number];

export const SPLIT_LABELS: Record<SplitKey, string> = {
  location: 'Location',
  fallAsleep: 'Fall asleep',
  startMood: 'Mood at start',
  endMood: 'Mood at end',
  quality: 'Sleep quality',
  side: 'Side',
  bottleContent: 'Bottle content',
  nappyKind: 'Nappy',
  wetSize: 'Wet size',
  pooSize: 'Poo size',
  pooColour: 'Poo colour',
  pooTexture: 'Poo texture',
  solidsAmount: 'Amount eaten',
  solidsReaction: 'Reaction',
  carer: 'Carer',
  device: 'Device',
  source: 'Source',
  weekday: 'Weekday',
  dayNight: 'Day or night',
};

export type ReportFilter = { key: SplitKey; values: string[] } | { key: 'text'; text: string };

export interface ReportSeries {
  measure: string;
  aggregate?: Aggregate;
  label?: string;
}

export interface ReportOptions {
  average?: 7 | 14;
  cumulative?: boolean;
  emptyDays?: boolean;
  stack?: boolean;
}

export interface ReportSpec {
  version: 1;
  range: ReportRange;
  bucket: ReportBucket;
  series: ReportSeries[];
  splitBy?: SplitKey;
  chart: ChartType;
  compare?: 'previous';
  filters: ReportFilter[];
  options: ReportOptions;
}

export const MAX_SERIES = 4;

export const DEFAULT_SPEC: ReportSpec = {
  version: 1,
  range: { preset: '30d' },
  bucket: 'day',
  series: [],
  chart: 'bar',
  filters: [],
  options: { emptyDays: true, stack: true },
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const oneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value);
const isDayKey = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

function parseRange(value: unknown): ReportRange | null {
  if (!isRecord(value)) return null;
  if (oneOf(REPORT_RANGE_PRESETS, value.preset)) return { preset: value.preset };
  if (isDayKey(value.from) && isDayKey(value.to) && value.from <= value.to) return { from: value.from, to: value.to };
  return null;
}

function parseSeries(value: unknown): ReportSeries | null {
  if (!isRecord(value) || typeof value.measure !== 'string') return null;
  const series: ReportSeries = { measure: value.measure };
  if (oneOf(AGGREGATES, value.aggregate)) series.aggregate = value.aggregate;
  if (typeof value.label === 'string' && value.label.trim()) series.label = value.label.trim();
  return series;
}

function parseFilter(value: unknown): ReportFilter | null {
  if (!isRecord(value)) return null;
  if (value.key === 'text')
    return typeof value.text === 'string' && value.text.trim() ? { key: 'text', text: value.text.trim() } : null;
  if (!oneOf(SPLIT_KEYS, value.key) || !Array.isArray(value.values)) return null;
  const values = value.values.filter((item): item is string => typeof item === 'string');
  return values.length ? { key: value.key, values } : null;
}

function parseOptions(value: unknown): ReportOptions {
  if (!isRecord(value)) return {};
  const options: ReportOptions = {};
  if (value.average === 7 || value.average === 14) options.average = value.average;
  if (typeof value.cumulative === 'boolean') options.cumulative = value.cumulative;
  if (typeof value.emptyDays === 'boolean') options.emptyDays = value.emptyDays;
  if (typeof value.stack === 'boolean') options.stack = value.stack;
  return options;
}

export function parseReportSpec(value: unknown): ReportSpec | null {
  if (!isRecord(value) || value.version !== 1) return null;
  const range = parseRange(value.range);
  if (!range || !oneOf(REPORT_BUCKETS, value.bucket) || !oneOf(CHART_TYPES, value.chart)) return null;
  if (!Array.isArray(value.series)) return null;
  const series = value.series.map(parseSeries);
  if (series.some((item) => item === null) || series.length > MAX_SERIES) return null;
  const spec: ReportSpec = {
    version: 1,
    range,
    bucket: value.bucket,
    series: series as ReportSeries[],
    chart: value.chart,
    filters: Array.isArray(value.filters) ? value.filters.flatMap((item) => parseFilter(item) ?? []) : [],
    options: parseOptions(value.options),
  };
  if (oneOf(SPLIT_KEYS, value.splitBy)) spec.splitBy = value.splitBy;
  if (value.compare === 'previous') spec.compare = 'previous';
  return spec;
}

export const FREE_RANGE_DAYS = 31;

export function rangeNeedsPlus(range: ReportRange): boolean {
  if ('preset' in range) return range.preset === '90d' || range.preset === '6m' || range.preset === 'all';
  return Date.parse(range.to) - Date.parse(range.from) >= FREE_RANGE_DAYS * 24 * 60 * 60 * 1000;
}
