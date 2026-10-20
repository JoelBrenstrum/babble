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
  wakeToSleep: Minutes;
  sleepLength: Minutes;
  feedLength: Minutes;
  wakeToFeed: Minutes;
}

const AGE_BANDS: readonly AgeBand[] = [
  {
    untilMonths: 1,
    wakeToSleep: [35, 45, 60],
    sleepLength: [30, 60, 120],
    feedLength: [15, 30, 45],
    wakeToFeed: [0, 5, 20],
  },
  {
    untilMonths: 2,
    wakeToSleep: [45, 60, 75],
    sleepLength: [30, 60, 120],
    feedLength: [15, 25, 40],
    wakeToFeed: [0, 5, 20],
  },
  {
    untilMonths: 3,
    wakeToSleep: [60, 75, 90],
    sleepLength: [30, 60, 120],
    feedLength: [10, 20, 35],
    wakeToFeed: [0, 5, 25],
  },
  {
    untilMonths: 4,
    wakeToSleep: [75, 90, 120],
    sleepLength: [30, 60, 120],
    feedLength: [10, 20, 30],
    wakeToFeed: [0, 5, 30],
  },
  {
    untilMonths: 6,
    wakeToSleep: [90, 120, 150],
    sleepLength: [30, 75, 120],
    feedLength: [10, 15, 30],
    wakeToFeed: [0, 10, 30],
  },
  {
    untilMonths: 9,
    wakeToSleep: [120, 150, 180],
    sleepLength: [45, 75, 120],
    feedLength: [10, 15, 25],
    wakeToFeed: [0, 10, 40],
  },
  {
    untilMonths: 12,
    wakeToSleep: [150, 195, 240],
    sleepLength: [45, 90, 120],
    feedLength: [5, 15, 25],
    wakeToFeed: [0, 15, 45],
  },
  {
    untilMonths: 18,
    wakeToSleep: [180, 240, 300],
    sleepLength: [60, 90, 150],
    feedLength: [5, 10, 20],
    wakeToFeed: [0, 15, 60],
  },
  {
    untilMonths: Infinity,
    wakeToSleep: [300, 330, 360],
    sleepLength: [60, 120, 150],
    feedLength: [5, 10, 20],
    wakeToFeed: [0, 15, 60],
  },
];

const toPrior = ([low, mid, high]: Minutes): Prior => ({
  low: low * MINUTE_MS,
  mid: mid * MINUTE_MS,
  high: high * MINUTE_MS,
});

export function priorsForAge(months: number): AgePriors {
  const band = AGE_BANDS.find((b) => months < b.untilMonths) ?? AGE_BANDS.at(-1)!;
  return {
    wakeToSleep: toPrior(band.wakeToSleep),
    sleepLength: toPrior(band.sleepLength),
    feedLength: toPrior(band.feedLength),
    wakeToFeed: toPrior(band.wakeToFeed),
  };
}
