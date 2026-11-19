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
    key: 'typical-sleep-day',
    name: 'A typical day of sleep',
    description: 'Average time asleep in each hour of the day, across the last 30 days.',
    icon: 'clock',
    spec: base({
      chart: 'heatmap',
      bucket: 'hour',
      series: [{ measure: 'sleep.total' }],
      options: { averageDay: true },
    }),
  },
  {
    key: 'feeds-by-hour',
    name: 'When feeds happen',
    description: 'Feeds by hour of day across the last 30 days.',
    icon: 'heart',
    spec: base({ chart: 'heatmap', bucket: 'hour', series: [{ measure: 'feeds.count' }] }),
  },
  {
    key: 'typical-feed-day',
    name: 'A typical day of feeds',
    description: 'Average feeds in each hour of the day, across the last 30 days.',
    icon: 'heart',
    spec: base({
      chart: 'heatmap',
      bucket: 'hour',
      series: [{ measure: 'feeds.count' }],
      options: { averageDay: true },
    }),
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
  {
    key: 'longest-stretch',
    name: 'Longest sleep stretch',
    description: 'The longest unbroken sleep each day, with a 7-day average.',
    icon: 'moon',
    spec: base({ chart: 'line', series: [{ measure: 'sleep.longest' }], options: { average: 7 } }),
  },
  {
    key: 'naps-per-day',
    name: 'Naps per day',
    description: 'How many naps {baby} takes each day.',
    icon: 'sun',
    spec: base({ chart: 'bar', series: [{ measure: 'sleep.naps' }] }),
  },
  {
    key: 'sleep-by-weekday',
    name: 'Sleep by weekday',
    description: 'Average time asleep on each day of the week.',
    icon: 'calendar',
    spec: base({ chart: 'bar', bucket: 'weekday', series: [{ measure: 'sleep.total' }] }),
  },
  {
    key: 'sleep-week-on-week',
    name: 'Sleep, this week and last',
    description: 'Time asleep over the last 7 days against the 7 days before.',
    icon: 'moon',
    spec: base({
      chart: 'bar',
      range: { preset: '7d' },
      series: [{ measure: 'sleep.total' }],
      compare: 'previous',
    }),
  },
  {
    key: 'feed-gaps',
    name: 'Gaps between feeds',
    description: 'How long {baby} goes between feeds, as a distribution.',
    icon: 'timer',
    spec: base({ chart: 'histogram', series: [{ measure: 'feeds.gap' }] }),
  },
  {
    key: 'breast-sides',
    name: 'Left and right',
    description: 'Time on the breast per day, split by side.',
    icon: 'heart',
    spec: base({ chart: 'bar', series: [{ measure: 'feeds.breastTime' }], splitBy: 'side' }),
  },
  {
    key: 'bottle-sizes',
    name: 'Bottle sizes',
    description: 'How much {baby} drinks per bottle, as a distribution.',
    icon: 'bottle',
    spec: base({ chart: 'histogram', series: [{ measure: 'feeds.perBottle' }] }),
  },
  {
    key: 'pump-output',
    name: 'Pump output',
    description: 'Volume pumped per day with a 7-day average.',
    icon: 'bottle',
    spec: base({ chart: 'line', series: [{ measure: 'pump.ml' }], options: { average: 7 } }),
  },
  {
    key: 'weight',
    name: 'Weight',
    description: 'Every weight measurement since birth.',
    icon: 'ruler',
    spec: base({
      chart: 'line',
      range: { preset: 'all' },
      series: [{ measure: 'growth.weight' }],
      options: { emptyDays: false },
    }),
  },
  {
    key: 'new-foods',
    name: 'New foods tried',
    description: 'A running count of new foods over 90 days.',
    icon: 'layers',
    spec: base({
      chart: 'line',
      range: { preset: '90d' },
      series: [{ measure: 'solids.newFoods' }],
      options: { cumulative: true },
    }),
  },
];

export function templateName(template: ReportTemplate, babyName: string): string {
  return template.name.replace('{baby}', babyName);
}

export function templateDescription(template: ReportTemplate, babyName: string): string {
  return template.description.replace('{baby}', babyName);
}

export const templateByKey = (key: string): ReportTemplate | null =>
  REPORT_TEMPLATES.find((template) => template.key === key) ?? null;
