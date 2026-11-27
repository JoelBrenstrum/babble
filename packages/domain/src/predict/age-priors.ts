import { MINUTE_MS } from '../time/constants';

export interface Prior {
  low: number;
  mid: number;
  high: number;
}

export type PriorKey = 'wakeToSleep' | 'sleepLength' | 'feedLength' | 'wakeToFeed';

export type AgePriors = Record<PriorKey, Prior>;

type Minutes = readonly [low: number, mid: number, high: number];

interface AgeBand {
  untilMonths: number;
  sleepLength: Minutes;
  feedLength: Minutes;
  wakeToFeed: Minutes;
}

const AGE_BANDS: readonly AgeBand[] = [
  {
    untilMonths: 1,
    sleepLength: [30, 60, 120],
    feedLength: [15, 30, 45],
    wakeToFeed: [0, 5, 20],
  },
  {
    untilMonths: 2,
    sleepLength: [30, 60, 120],
    feedLength: [15, 25, 40],
    wakeToFeed: [0, 5, 20],
  },
  {
    untilMonths: 3,
    sleepLength: [30, 60, 120],
    feedLength: [10, 20, 35],
    wakeToFeed: [0, 5, 25],
  },
  {
    untilMonths: 4,
    sleepLength: [30, 60, 120],
    feedLength: [10, 20, 30],
    wakeToFeed: [0, 5, 30],
  },
  {
    untilMonths: 6,
    sleepLength: [30, 75, 120],
    feedLength: [10, 15, 30],
    wakeToFeed: [0, 10, 30],
  },
  {
    untilMonths: 9,
    sleepLength: [45, 75, 120],
    feedLength: [10, 15, 25],
    wakeToFeed: [0, 10, 40],
  },
  {
    untilMonths: 12,
    sleepLength: [45, 90, 120],
    feedLength: [5, 15, 25],
    wakeToFeed: [0, 15, 45],
  },
  {
    untilMonths: 18,
    sleepLength: [60, 90, 150],
    feedLength: [5, 10, 20],
    wakeToFeed: [0, 15, 60],
  },
  {
    untilMonths: Infinity,
    sleepLength: [60, 120, 150],
    feedLength: [5, 10, 20],
    wakeToFeed: [0, 15, 60],
  },
];

const WAKE_WINDOWS: readonly { untilMonths: number; range: Minutes }[] = [
  { untilMonths: 1, range: [30, 45, 60] },
  { untilMonths: 2, range: [45, 60, 90] },
  { untilMonths: 3, range: [60, 75, 105] },
  { untilMonths: 4, range: [75, 90, 120] },
  { untilMonths: 5, range: [90, 105, 150] },
  { untilMonths: 7, range: [120, 150, 180] },
  { untilMonths: 9, range: [135, 165, 210] },
  { untilMonths: 11, range: [165, 195, 225] },
  { untilMonths: 14, range: [195, 220, 240] },
  { untilMonths: 18, range: [240, 300, 360] },
  { untilMonths: Infinity, range: [300, 330, 360] },
];

const toPrior = ([low, mid, high]: Minutes): Prior => ({
  low: low * MINUTE_MS,
  mid: mid * MINUTE_MS,
  high: high * MINUTE_MS,
});

export function wakeWindowForAge(months: number): Prior {
  const band = WAKE_WINDOWS.find((b) => months < b.untilMonths) ?? WAKE_WINDOWS.at(-1)!;
  return toPrior(band.range);
}

export function priorsForAge(months: number): AgePriors {
  const band = AGE_BANDS.find((b) => months < b.untilMonths) ?? AGE_BANDS.at(-1)!;
  return {
    wakeToSleep: wakeWindowForAge(months),
    sleepLength: toPrior(band.sleepLength),
    feedLength: toPrior(band.feedLength),
    wakeToFeed: toPrior(band.wakeToFeed),
  };
}
