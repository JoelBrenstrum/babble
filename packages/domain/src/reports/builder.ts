import { measureById, type Measure } from './measures';
import {
  CHART_TYPES,
  DEFAULT_SPEC,
  MAX_SERIES,
  REPORT_RANGE_LABELS,
  SPLIT_LABELS,
  type ChartType,
  type ReportBucket,
  type ReportSpec,
  type SplitKey,
} from './spec';

export function specMeasures(spec: ReportSpec): Measure[] {
  return spec.series.flatMap((series) => measureById(series.measure) ?? []);
}

export function chartProblem(spec: ReportSpec, chart: ChartType): string | null {
  const measures = specMeasures(spec);
  if (measures.length === 0) return 'Pick a measure first';
  const single = measures.length === 1 && !spec.splitBy;
  switch (chart) {
    case 'bar':
    case 'line':
    case 'table':
      return null;
    case 'area':
      return null;
    case 'donut':
      return spec.splitBy || measures.length > 1 ? null : 'Donut needs a split or a second measure';
    case 'number':
      return single ? null : 'Number shows one measure';
    case 'heatmap':
      if (!single) return 'Heatmap shows one measure';
      return spec.bucket === 'hour' ? null : 'Heatmap needs Hour of day';
    case 'histogram':
      if (!single) return 'Histogram shows one measure';
      return measures[0]!.distribution ? null : 'Histogram needs a per-entry measure';
    case 'rhythm':
      if (spec.splitBy) return 'Rhythm has no split';
      return measures.every((measure) => measure.types.some((type) => type !== 'growth' && type !== 'custom'))
        ? null
        : 'Rhythm draws sleep, feeds, nappies and pumps';
  }
}

export function chartFits(spec: ReportSpec): Record<ChartType, string | null> {
  return Object.fromEntries(CHART_TYPES.map((chart) => [chart, chartProblem(spec, chart)])) as Record<
    ChartType,
    string | null
  >;
}

export function suggestChart(spec: ReportSpec): ChartType {
  const measures = specMeasures(spec);
  const single = measures.length === 1 && !spec.splitBy;
  if (single && spec.bucket === 'hour') return 'heatmap';
  if (single && measures[0]!.distribution) return 'histogram';
  if (spec.splitBy && 'preset' in spec.range && spec.range.preset === 'all' && spec.bucket === 'day') return 'donut';
  if (measures.length > 1 && measures.every((measure) => measure.interval)) return 'area';
  if (single && measures[0]!.aggregate !== 'sum') return 'line';
  return 'bar';
}

export function withChart(spec: ReportSpec, chart: ChartType): ReportSpec {
  const next = { ...spec, chart };
  if (chart === 'heatmap' && spec.bucket !== 'hour') next.bucket = 'hour';
  if (chart === 'donut' || chart === 'number') next.compare = chart === 'number' ? spec.compare : undefined;
  return next;
}

export function canAddMeasure(spec: ReportSpec, measure: Measure): string | null {
  if (spec.series.some((series) => series.measure === measure.id)) return 'Already added';
  if (spec.series.length >= MAX_SERIES) return `Up to ${MAX_SERIES} measures`;
  if (spec.splitBy) return 'Remove the split to add another measure';
  const first = specMeasures(spec)[0];
  if (first && first.unit !== measure.unit) return `Mix measures with the same unit as ${first.label}`;
  return null;
}

export function toggleMeasure(spec: ReportSpec, measure: Measure): ReportSpec {
  const present = spec.series.some((series) => series.measure === measure.id);
  const series = present
    ? spec.series.filter((item) => item.measure !== measure.id)
    : [...spec.series, { measure: measure.id }];
  let next: ReportSpec = { ...spec, series };
  if (!allowedSplits(next).includes(next.splitBy as SplitKey)) next = { ...next, splitBy: undefined };
  next = {
    ...next,
    filters: next.filters.filter((filter) => filter.key === 'text' || allowedSplits(next).includes(filter.key)),
  };
  if (chartProblem(next, next.chart)) next = withChart(next, suggestChart(next));
  return next;
}

export function allowedSplits(spec: ReportSpec): SplitKey[] {
  const measures = specMeasures(spec);
  if (measures.length !== 1) return [];
  return [...measures[0]!.splits];
}

export function withSplit(spec: ReportSpec, splitBy: SplitKey | undefined): ReportSpec {
  const next: ReportSpec = { ...spec, splitBy, compare: splitBy ? undefined : spec.compare };
  return chartProblem(next, next.chart) ? withChart(next, suggestChart(next)) : next;
}

export function withBucket(spec: ReportSpec, bucket: ReportBucket): ReportSpec {
  const next: ReportSpec = { ...spec, bucket };
  if (bucket !== 'day') next.options = { ...next.options, average: undefined };
  return chartProblem(next, next.chart) ? withChart(next, suggestChart(next)) : next;
}

export function rangeLabel(spec: ReportSpec): string {
  if ('preset' in spec.range) return spec.range.preset === 'all' ? 'All time' : REPORT_RANGE_LABELS[spec.range.preset];
  return `${spec.range.from} to ${spec.range.to}`;
}

export function suggestedName(spec: ReportSpec): string {
  const measures = specMeasures(spec);
  if (measures.length === 0) return 'New report';
  const what = measures.map((measure) => measure.label).join(' and ');
  const by = spec.splitBy
    ? ` by ${SPLIT_LABELS[spec.splitBy].toLowerCase()}`
    : spec.bucket === 'hour'
      ? ' by hour of day'
      : spec.bucket === 'weekday'
        ? ' by weekday'
        : '';
  return `${what}${by}, ${rangeLabel(spec).toLowerCase()}`;
}

export function reportMeta(spec: ReportSpec): string {
  const parts = [rangeLabel(spec)];
  if (spec.splitBy) parts.push(`by ${SPLIT_LABELS[spec.splitBy].toLowerCase()}`);
  else if (spec.bucket !== 'day') parts.push(`by ${spec.bucket === 'hour' ? 'hour of day' : spec.bucket}`);
  if (spec.filters.length) parts.push(`${spec.filters.length} ${spec.filters.length === 1 ? 'filter' : 'filters'}`);
  return parts.join(' · ');
}

export function emptySpec(): ReportSpec {
  return { ...DEFAULT_SPEC, series: [], filters: [], options: { ...DEFAULT_SPEC.options } };
}
