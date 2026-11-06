import type { ReportSpec } from './spec';

export interface ReportTemplate {
  key: string;
  name: string;
  description: string;
  icon:
    | 'moon'
    | 'clock'
    | 'heart'
    | 'map-pin'
    | 'bottle'
    | 'timer'
    | 'sun'
    | 'droplets'
    | 'users'
    | 'ruler'
    | 'calendar'
    | 'layers';
  spec: ReportSpec;
}

const base = (spec: Partial<ReportSpec>): ReportSpec => ({
  version: 1,
  range: { preset: '30d' },
  bucket: 'day',
  series: [],
  chart: 'bar',
  filters: [],
  options: { emptyDays: true, stack: true },
  ...spec,
});

export const REPORT_TEMPLATES: readonly ReportTemplate[] = [
  {
    key: 'night-naps',
    name: 'Night and naps',
    description: 'Night sleep and nap time per day, stacked, with a 7-day average.',
    icon: 'moon',
    spec: base({
      chart: 'area',
      series: [{ measure: 'sleep.night' }, { measure: 'sleep.nap' }],
      options: { average: 7, stack: true },
    }),
  },
  {
    key: 'sleep-by-hour',
    name: 'When {baby} sleeps',
    description: 'Sleep by hour of day across the last 30 days.',
    icon: 'clock',
    spec: base({ chart: 'heatmap', bucket: 'hour', series: [{ measure: 'sleep.total' }] }),
  },
  {
    key: 'feeds-by-hour',
    name: 'When feeds happen',
    description: 'Feeds by hour of day across the last 30 days.',
    icon: 'heart',
    spec: base({ chart: 'heatmap', bucket: 'hour', series: [{ measure: 'feeds.count' }] }),
  },
  {
    key: 'sleep-by-location',
    name: 'Where {baby} sleeps',
    description: 'Time asleep split by location.',
    icon: 'map-pin',
    spec: base({ chart: 'donut', series: [{ measure: 'sleep.total' }], splitBy: 'location' }),
  },
  {
    key: 'feeds-per-day',
    name: 'Feeds per day',
    description: 'Breastfeeds and bottles per day, stacked.',
    icon: 'heart',
    spec: base({ chart: 'bar', series: [{ measure: 'feeds.breast' }, { measure: 'feeds.bottles' }] }),
  },
  {
    key: 'bottle-intake',
    name: 'Bottle intake',
    description: 'Bottle volume per day with a 7-day average, over 90 days.',
    icon: 'bottle',
    spec: base({
      chart: 'line',
      range: { preset: '90d' },
      series: [{ measure: 'feeds.bottleMl' }],
      options: { average: 7 },
    }),
  },
  {
    key: 'nap-lengths',
    name: 'Nap lengths',
    description: 'How long sleeps last, as a distribution.',
    icon: 'timer',
    spec: base({ chart: 'histogram', series: [{ measure: 'sleep.length' }] }),
  },
  {
    key: 'wake-windows',
    name: 'Wake windows',
    description: 'The typical wake window per day.',
    icon: 'sun',
    spec: base({ chart: 'line', series: [{ measure: 'sleep.wake', aggregate: 'median' }] }),
  },
  {
    key: 'nappy-output',
    name: 'Nappy output',
    description: 'Wet and dirty nappies per day over two weeks.',
    icon: 'droplets',
    spec: base({
      chart: 'bar',
      range: { preset: '14d' },
      series: [{ measure: 'nappies.count' }],
      splitBy: 'nappyKind',
    }),
  },
  {
    key: 'who-logs',
    name: 'Who logs what',
    description: 'Entries split by carer.',
    icon: 'users',
    spec: base({ chart: 'donut', series: [{ measure: 'logging.entries' }], splitBy: 'carer' }),
  },
  {
    key: 'weight-gain',
    name: 'Weight gain',
    description: 'Weight gain per week from every measurement.',
    icon: 'ruler',
    spec: base({ chart: 'bar', range: { preset: 'all' }, bucket: 'week', series: [{ measure: 'growth.gain' }] }),
  },
  {
    key: 'last-14-days',
    name: 'Last 14 days',
    description: 'Sleep and feeds as blocks, one row per day.',
    icon: 'calendar',
    spec: base({
      chart: 'rhythm',
      range: { preset: '14d' },
      series: [{ measure: 'sleep.total' }, { measure: 'feeds.count' }],
    }),
  },
];

export function templateName(template: ReportTemplate, babyName: string): string {
  return template.name.replace('{baby}', babyName);
}

export const templateByKey = (key: string): ReportTemplate | null =>
  REPORT_TEMPLATES.find((template) => template.key === key) ?? null;
