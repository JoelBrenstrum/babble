import { segmentTotals } from '../events/segments';
import { summariseSegments } from '../events/session-summary';
import { asleepIntervals } from '../events/sleep-stretches';
import { tracksIdle, type BabyEvent, type EventOfType, type EventType } from '../events/types';
import { HOUR_MS, MINUTE_MS } from '../time/constants';
import { ms } from '../time/instants';
import { MAX_GAP_MS } from '../stats/cards';
import { TOP_UP_MS } from '../stats/insights';
import {
  clipToWindows,
  gapSamples,
  intervalSamples,
  subtractWindows,
  type Interval,
  type Sample,
  type SampleContext,
} from './samples';
import type { Aggregate, SplitKey } from './spec';

export type ReportUnit = 'h' | 'min' | 'ml' | 'g' | 'mm' | 'count';

export const MEASURE_GROUPS = ['sleep', 'feeds', 'nappies', 'pump', 'solids', 'growth', 'custom', 'logging'] as const;
export type MeasureGroup = (typeof MEASURE_GROUPS)[number];

export const MEASURE_GROUP_LABELS: Record<MeasureGroup, string> = {
  sleep: 'Sleep',
  feeds: 'Feeds',
  nappies: 'Nappies',
  pump: 'Pump',
  solids: 'Solids',
  growth: 'Growth',
  custom: 'Custom',
  logging: 'Logging',
};

export interface Measure {
  id: string;
  label: string;
  group: MeasureGroup;
  unit: ReportUnit;
  aggregate: Aggregate;
  interval: boolean;
  perDay: boolean;
  distribution: boolean;
  tone: string;
  types: readonly EventType[];
  splits: readonly SplitKey[];
  samples: (context: SampleContext) => Sample[];
}

const COMMON_SPLITS: readonly SplitKey[] = ['carer', 'device', 'source', 'weekday', 'dayNight'];
const SLEEP_SPLITS: readonly SplitKey[] = [
  'location',
  'fallAsleep',
  'startMood',
  'endMood',
  'quality',
  ...COMMON_SPLITS,
];
const BOTTLE_SPLITS: readonly SplitKey[] = ['bottleContent', ...COMMON_SPLITS];
const NAPPY_SPLITS: readonly SplitKey[] = [
  'nappyKind',
  'wetSize',
  'pooSize',
  'pooColour',
  'pooTexture',
  ...COMMON_SPLITS,
];
const SOLIDS_SPLITS: readonly SplitKey[] = ['solidsAmount', 'solidsReaction', ...COMMON_SPLITS];

const FALL_ASLEEP_MS = { under_10_min: 5 * MINUTE_MS, '10_to_20_min': 15 * MINUTE_MS, long_time: 30 * MINUTE_MS };

const ofType = <T extends EventType>(events: readonly BabyEvent[], ...types: T[]): EventOfType<T>[] =>
  events.filter((event): event is EventOfType<T> => (types as EventType[]).includes(event.type));

const count = (event: BabyEvent): Sample => ({ event, at: ms(event.startedAt), value: 1 });

const sleepIntervals = (event: EventOfType<'sleep'>, now: Date): Interval[] =>
  asleepIntervals(event, now).map((window) => ({ start: window.start.getTime(), end: window.end.getTime() }));

const sleepSpans = ({ events, now }: SampleContext) =>
  ofType(events, 'sleep').map((event) => {
    const intervals = sleepIntervals(event, now);
    return {
      event,
      start: intervals[0]?.start ?? ms(event.startedAt),
      end: intervals.at(-1)?.end ?? ms(event.startedAt),
    };
  });

const feedStarts = ({ events }: SampleContext) =>
  ofType(events, 'breast_feed', 'bottle').map((event) => ({
    event,
    start: ms(event.startedAt),
    end: ms(event.startedAt),
  }));

const bottleMl = (event: EventOfType<'bottle'>) =>
  Math.max(0, (event.details.amountMl ?? 0) - (event.details.amountLeftMl ?? 0));

const breastActiveMs = (event: EventOfType<'breast_feed'>, now: Date) => {
  const totals = segmentTotals(event.segments, now);
  return totals.leftMs + totals.rightMs;
};

function define(
  measure: Omit<Measure, 'interval' | 'perDay' | 'distribution' | 'aggregate'> &
    Partial<Pick<Measure, 'interval' | 'perDay' | 'distribution' | 'aggregate'>>,
): Measure {
  return {
    aggregate: 'sum',
    interval: false,
    perDay: true,
    distribution: false,
    ...measure,
  };
}

const perEvent = (
  measure: Omit<Measure, 'interval' | 'perDay' | 'distribution' | 'aggregate'> & Partial<Pick<Measure, 'aggregate'>>,
): Measure => define({ aggregate: 'avg', ...measure, perDay: false, distribution: true });

export const MEASURES: readonly Measure[] = [
  define({
    id: 'sleep.total',
    label: 'Time asleep',
    group: 'sleep',
    unit: 'h',
    tone: 'sleep',
    types: ['sleep'],
    splits: SLEEP_SPLITS,
    interval: true,
    samples: ({ events, now }) =>
      ofType(events, 'sleep').flatMap((event) => intervalSamples(event, sleepIntervals(event, now))),
  }),
  define({
    id: 'sleep.night',
    label: 'Night sleep',
    group: 'sleep',
    unit: 'h',
    tone: 'sleep',
    types: ['sleep'],
    splits: SLEEP_SPLITS,
    interval: true,
    samples: ({ events, now, nights }) =>
      ofType(events, 'sleep').flatMap((event) =>
        intervalSamples(
          event,
          sleepIntervals(event, now).flatMap((interval) => clipToWindows(interval, nights)),
        ),
      ),
  }),
  define({
    id: 'sleep.nap',
    label: 'Nap time',
    group: 'sleep',
    unit: 'h',
    tone: 'sleep/55',
    types: ['sleep'],
    splits: SLEEP_SPLITS,
    interval: true,
    samples: ({ events, now, nights }) =>
      ofType(events, 'sleep').flatMap((event) =>
        intervalSamples(
          event,
          sleepIntervals(event, now).flatMap((interval) => subtractWindows(interval, nights)),
        ),
      ),
  }),
  define({
    id: 'sleep.naps',
    label: 'Naps',
    group: 'sleep',
    unit: 'count',
    tone: 'sleep',
    types: ['sleep'],
    splits: SLEEP_SPLITS,
    samples: ({ events, nights }) =>
      ofType(events, 'sleep')
        .filter(
          (event) => clipToWindows({ start: ms(event.startedAt), end: ms(event.startedAt) + 1 }, nights).length === 0,
        )
        .map(count),
  }),
  define({
    id: 'sleep.longest',
    label: 'Longest stretch',
    group: 'sleep',
    unit: 'h',
    tone: 'sleep',
    types: ['sleep'],
    splits: SLEEP_SPLITS,
    aggregate: 'max',
    perDay: false,
    samples: ({ events, now }) =>
      ofType(events, 'sleep').flatMap((event) =>
        sleepIntervals(event, now).map((interval) => ({
          event,
          at: interval.start,
          value: interval.end - interval.start,
        })),
      ),
  }),
  perEvent({
    id: 'sleep.length',
    label: 'Sleep length',
    group: 'sleep',
    unit: 'h',
    tone: 'sleep',
    types: ['sleep'],
    splits: SLEEP_SPLITS,
    samples: ({ events, now }) =>
      ofType(events, 'sleep').map((event) => ({
        event,
        at: ms(event.startedAt),
        value: sleepIntervals(event, now).reduce((total, interval) => total + interval.end - interval.start, 0),
      })),
  }),
  perEvent({
    id: 'sleep.wake',
    label: 'Wake window',
    group: 'sleep',
    unit: 'h',
    tone: 'primary',
    types: ['sleep'],
    splits: COMMON_SPLITS,
    samples: (context) => gapSamples(sleepSpans(context), MAX_GAP_MS),
  }),
  perEvent({
    id: 'sleep.fallAsleep',
    label: 'Time to fall asleep',
    group: 'sleep',
    unit: 'min',
    tone: 'sleep',
    types: ['sleep'],
    splits: SLEEP_SPLITS,
    samples: ({ events }) =>
      ofType(events, 'sleep').flatMap((event) =>
        event.details.fallAsleep
          ? [{ event, at: ms(event.startedAt), value: FALL_ASLEEP_MS[event.details.fallAsleep] }]
          : [],
      ),
  }),
  define({
    id: 'sleep.wokenByCarer',
    label: 'Woken by a carer',
    group: 'sleep',
    unit: 'count',
    tone: 'sleep',
    types: ['sleep'],
    splits: SLEEP_SPLITS,
    samples: ({ events }) =>
      ofType(events, 'sleep')
        .filter((event) => event.details.wokenByCarer)
        .map(count),
  }),
  define({
    id: 'feeds.count',
    label: 'Feeds',
    group: 'feeds',
    unit: 'count',
    tone: 'feed-right',
    types: ['breast_feed', 'bottle'],
    splits: COMMON_SPLITS,
    samples: ({ events }) => ofType(events, 'breast_feed', 'bottle').map(count),
  }),
  define({
    id: 'feeds.breast',
    label: 'Breastfeeds',
    group: 'feeds',
    unit: 'count',
    tone: 'feed-left',
    types: ['breast_feed'],
    splits: COMMON_SPLITS,
    samples: ({ events }) => ofType(events, 'breast_feed').map(count),
  }),
  define({
    id: 'feeds.bottles',
    label: 'Bottles',
    group: 'feeds',
    unit: 'count',
    tone: 'bottle',
    types: ['bottle'],
    splits: BOTTLE_SPLITS,
    samples: ({ events }) => ofType(events, 'bottle').map(count),
  }),
  define({
    id: 'feeds.breastTime',
    label: 'Time on the breast',
    group: 'feeds',
    unit: 'h',
    tone: 'feed-left',
    types: ['breast_feed'],
    splits: ['side', ...COMMON_SPLITS],
    interval: true,
    samples: ({ events, now }) =>
      ofType(events, 'breast_feed').flatMap((event) =>
        event.segments.flatMap((segment) =>
          intervalSamples(
            event,
            [{ start: ms(segment.startedAt), end: segment.endedAt ? ms(segment.endedAt) : now.getTime() }],
            { side: [segment.side] },
          ),
        ),
      ),
  }),
  define({
    id: 'feeds.idle',
    label: 'Idle time in feeds',
    group: 'feeds',
    unit: 'min',
    tone: 'session-downtime',
    types: ['breast_feed'],
    splits: COMMON_SPLITS,
    samples: ({ events, now, settings }) =>
      ofType(events, 'breast_feed')
        .filter((event) => tracksIdle(event.source))
        .map((event) => ({
          event,
          at: ms(event.startedAt),
          value: summariseSegments(event.segments, { mergeGapMs: settings.mergeGapMs, now }).downtimeMs,
        })),
  }),
  perEvent({
    id: 'feeds.perFeed',
    label: 'Time per breastfeed',
    group: 'feeds',
    unit: 'min',
    tone: 'feed-left',
    types: ['breast_feed'],
    splits: COMMON_SPLITS,
    samples: ({ events, now }) =>
      ofType(events, 'breast_feed')
        .filter((event) => event.segments.length > 0)
        .map((event) => ({ event, at: ms(event.startedAt), value: breastActiveMs(event, now) })),
  }),
  perEvent({
    id: 'feeds.gap',
    label: 'Gap between feeds',
    group: 'feeds',
    unit: 'h',
    tone: 'bottle',
    types: ['breast_feed', 'bottle'],
    splits: COMMON_SPLITS,
    samples: (context) => gapSamples(feedStarts(context), MAX_GAP_MS, TOP_UP_MS),
  }),
  define({
    id: 'feeds.longestGap',
    label: 'Longest gap between feeds',
    group: 'feeds',
    unit: 'h',
    tone: 'bottle',
    types: ['breast_feed', 'bottle'],
    splits: COMMON_SPLITS,
    aggregate: 'max',
    perDay: false,
    samples: (context) => gapSamples(feedStarts(context), MAX_GAP_MS, TOP_UP_MS),
  }),
  define({
    id: 'feeds.bottleMl',
    label: 'Bottle volume',
    group: 'feeds',
    unit: 'ml',
    tone: 'bottle',
    types: ['bottle'],
    splits: BOTTLE_SPLITS,
    samples: ({ events }) =>
      ofType(events, 'bottle').map((event) => ({ event, at: ms(event.startedAt), value: bottleMl(event) })),
  }),
  perEvent({
    id: 'feeds.perBottle',
    label: 'Volume per bottle',
    group: 'feeds',
    unit: 'ml',
    tone: 'bottle',
    types: ['bottle'],
    splits: BOTTLE_SPLITS,
    samples: ({ events }) =>
      ofType(events, 'bottle')
        .filter((event) => bottleMl(event) > 0)
        .map((event) => ({ event, at: ms(event.startedAt), value: bottleMl(event) })),
  }),
  define({
    id: 'nappies.count',
    label: 'Nappies',
    group: 'nappies',
    unit: 'count',
    tone: 'nappy',
    types: ['nappy'],
    splits: NAPPY_SPLITS,
    samples: ({ events }) => ofType(events, 'nappy').map(count),
  }),
  define({
    id: 'nappies.wet',
    label: 'Wet nappies',
    group: 'nappies',
    unit: 'count',
    tone: 'nappy/60',
    types: ['nappy'],
    splits: NAPPY_SPLITS,
    samples: ({ events }) =>
      ofType(events, 'nappy')
        .filter((event) => event.details.wet)
        .map(count),
  }),
  define({
    id: 'nappies.dirty',
    label: 'Dirty nappies',
    group: 'nappies',
    unit: 'count',
    tone: 'nappy',
    types: ['nappy'],
    splits: NAPPY_SPLITS,
    samples: ({ events }) =>
      ofType(events, 'nappy')
        .filter((event) => event.details.dirty)
        .map(count),
  }),
  define({
    id: 'nappies.rash',
    label: 'Nappies with a rash',
    group: 'nappies',
    unit: 'count',
    tone: 'caution',
    types: ['nappy'],
    splits: NAPPY_SPLITS,
    samples: ({ events }) =>
      ofType(events, 'nappy')
        .filter((event) => event.details.rash)
        .map(count),
  }),
  perEvent({
    id: 'nappies.gap',
    label: 'Time between nappies',
    group: 'nappies',
    unit: 'h',
    tone: 'nappy',
    types: ['nappy'],
    splits: COMMON_SPLITS,
    samples: ({ events }) =>
      gapSamples(
        ofType(events, 'nappy').map((event) => ({ event, start: ms(event.startedAt), end: ms(event.startedAt) })),
        MAX_GAP_MS,
      ),
  }),
  define({
    id: 'pump.sessions',
    label: 'Pump sessions',
    group: 'pump',
    unit: 'count',
    tone: 'pump',
    types: ['pump'],
    splits: COMMON_SPLITS,
    samples: ({ events }) => ofType(events, 'pump').map(count),
  }),
  define({
    id: 'pump.ml',
    label: 'Pumped volume',
    group: 'pump',
    unit: 'ml',
    tone: 'pump',
    types: ['pump'],
    splits: ['side', ...COMMON_SPLITS],
    samples: ({ events }) =>
      ofType(events, 'pump').flatMap((event) => {
        const left = event.details.leftMl ?? 0;
        const right = event.details.rightMl ?? 0;
        const total = event.details.totalMl ?? left + right;
        if (event.details.leftMl === null && event.details.rightMl === null) {
          return [{ event, at: ms(event.startedAt), value: total }];
        }
        return [
          { event, at: ms(event.startedAt), value: left, tags: { side: ['left'] } },
          { event, at: ms(event.startedAt), value: right, tags: { side: ['right'] } },
        ];
      }),
  }),
  perEvent({
    id: 'pump.perSession',
    label: 'Volume per pump',
    group: 'pump',
    unit: 'ml',
    tone: 'pump',
    types: ['pump'],
    splits: COMMON_SPLITS,
    samples: ({ events }) =>
      ofType(events, 'pump').flatMap((event) => {
        const total = event.details.totalMl ?? (event.details.leftMl ?? 0) + (event.details.rightMl ?? 0);
        return total > 0 ? [{ event, at: ms(event.startedAt), value: total }] : [];
      }),
  }),
  define({
    id: 'solids.meals',
    label: 'Meals',
    group: 'solids',
    unit: 'count',
    tone: 'solids',
    types: ['solids'],
    splits: SOLIDS_SPLITS,
    samples: ({ events }) => ofType(events, 'solids').map(count),
  }),
  define({
    id: 'solids.foods',
    label: 'Foods eaten',
    group: 'solids',
    unit: 'count',
    tone: 'solids',
    types: ['solids'],
    splits: SOLIDS_SPLITS,
    samples: ({ events }) =>
      ofType(events, 'solids').map((event) => ({ event, at: ms(event.startedAt), value: event.details.foods.length })),
  }),
  define({
    id: 'solids.newFoods',
    label: 'New foods tried',
    group: 'solids',
    unit: 'count',
    tone: 'solids',
    types: ['solids'],
    splits: SOLIDS_SPLITS,
    samples: ({ events }) => {
      const seen = new Set<string>();
      return [...ofType(events, 'solids')]
        .sort((a, b) => ms(a.startedAt) - ms(b.startedAt))
        .map((event) => {
          const fresh = event.details.foods.filter((food) => !seen.has(food.trim().toLowerCase()));
          for (const food of fresh) seen.add(food.trim().toLowerCase());
          return { event, at: ms(event.startedAt), value: fresh.length };
        });
    },
  }),
  define({
    id: 'growth.weight',
    label: 'Weight',
    group: 'growth',
    unit: 'g',
    tone: 'growth',
    types: ['growth'],
    splits: ['carer', 'device', 'source'],
    aggregate: 'last',
    perDay: false,
    samples: ({ events }) =>
      ofType(events, 'growth').flatMap((event) =>
        event.details.weightG === null ? [] : [{ event, at: ms(event.startedAt), value: event.details.weightG }],
      ),
  }),
  define({
    id: 'growth.length',
    label: 'Length',
    group: 'growth',
    unit: 'mm',
    tone: 'growth',
    types: ['growth'],
    splits: ['carer', 'device', 'source'],
    aggregate: 'last',
    perDay: false,
    samples: ({ events }) =>
      ofType(events, 'growth').flatMap((event) =>
        event.details.lengthMm === null ? [] : [{ event, at: ms(event.startedAt), value: event.details.lengthMm }],
      ),
  }),
  define({
    id: 'growth.head',
    label: 'Head size',
    group: 'growth',
    unit: 'mm',
    tone: 'growth',
    types: ['growth'],
    splits: ['carer', 'device', 'source'],
    aggregate: 'last',
    perDay: false,
    samples: ({ events }) =>
      ofType(events, 'growth').flatMap((event) =>
        event.details.headCircumferenceMm === null
          ? []
          : [{ event, at: ms(event.startedAt), value: event.details.headCircumferenceMm }],
      ),
  }),
  define({
    id: 'growth.gain',
    label: 'Weight gain per week',
    group: 'growth',
    unit: 'g',
    tone: 'growth',
    types: ['growth'],
    splits: [],
    aggregate: 'avg',
    perDay: false,
    samples: ({ events }) => {
      const weighed = ofType(events, 'growth')
        .filter((event) => event.details.weightG !== null)
        .sort((a, b) => ms(a.startedAt) - ms(b.startedAt));
      return weighed.flatMap((event, index) => {
        const previous = weighed[index - 1];
        if (!previous) return [];
        const days = (ms(event.startedAt) - ms(previous.startedAt)) / (24 * HOUR_MS);
        if (days <= 0) return [];
        return [
          { event, at: ms(event.startedAt), value: ((event.details.weightG! - previous.details.weightG!) / days) * 7 },
        ];
      });
    },
  }),
  define({
    id: 'custom.count',
    label: 'Custom events',
    group: 'custom',
    unit: 'count',
    tone: 'custom',
    types: ['custom'],
    splits: COMMON_SPLITS,
    samples: ({ events }) => ofType(events, 'custom').map(count),
  }),
  define({
    id: 'logging.entries',
    label: 'Entries logged',
    group: 'logging',
    unit: 'count',
    tone: 'primary',
    types: ['sleep', 'breast_feed', 'bottle', 'solids', 'nappy', 'pump', 'growth', 'custom'],
    splits: COMMON_SPLITS,
    samples: ({ events }) => events.map(count),
  }),
  define({
    id: 'logging.late',
    label: 'Entries added late',
    group: 'logging',
    unit: 'count',
    tone: 'primary',
    types: ['sleep', 'breast_feed', 'bottle', 'solids', 'nappy', 'pump', 'growth', 'custom'],
    splits: COMMON_SPLITS,
    samples: ({ events }) => events.filter((event) => ms(event.createdAt) - ms(event.startedAt) > HOUR_MS).map(count),
  }),
];

const BY_ID = new Map(MEASURES.map((measure) => [measure.id, measure]));

export const measureById = (id: string): Measure | null => BY_ID.get(id) ?? null;

export const measuresInGroup = (group: MeasureGroup): Measure[] =>
  MEASURES.filter((measure) => measure.group === group);
