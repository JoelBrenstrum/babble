import {
  bucketByDay,
  dayKeyFor,
  dayLayout,
  hourTicks,
  lastDays,
  localInstant,
  shiftDay,
  statsReport,
  summariseDay,
  summariseWeek,
  type BabyEvent,
  type DayLayout,
  type EventOfType,
  type StatsReport,
  type WeekSummary,
} from '@babble/domain';
import { DEFAULT_FAMILY_SETTINGS } from './families';
import type { BabyRow, Family, FamilyMemberRow, InstanceSettings } from './types';

export const sampleBaby: BabyRow = {
  id: 'baby-olivia',
  family_id: 'family-smith',
  name: 'Olivia',
  birth_date: '2026-09-26',
  timezone: 'Pacific/Auckland',
  day_start_minutes: 420,
  sex: 'female',
  created_at: '2026-09-26T09:00:00Z',
  updated_at: '2026-09-26T09:00:00Z',
};

export const sampleSibling: BabyRow = {
  ...sampleBaby,
  id: 'baby-jacob',
  name: 'Jacob',
  birth_date: '2025-08-03',
  sex: 'male',
};

export const sampleMembers: FamilyMemberRow[] = [
  {
    family_id: 'family-smith',
    user_id: 'user-john',
    role: 'owner',
    display_name: 'John',
    created_at: '2026-09-26T09:00:00Z',
  },
  {
    family_id: 'family-smith',
    user_id: 'user-jane',
    role: 'caregiver',
    display_name: 'Jane',
    created_at: '2026-09-26T09:05:00Z',
  },
];

export const sampleFamily: Family = {
  id: 'family-smith',
  name: 'The Smiths',
  plan: 'free',
  created_at: '2026-09-26T09:00:00Z',
  members: sampleMembers,
  former_members: [],
  babies: [sampleBaby, sampleSibling],
};

export const openSignup: InstanceSettings = { signupMode: 'open', hasUsers: true };
export const inviteOnlySignup: InstanceSettings = { signupMode: 'invite_only', hasUsers: true };

const minutesAgo = (now: Date, minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

function meta(id: string, createdBy = 'user-jane') {
  return {
    id,
    babyId: sampleBaby.id,
    createdBy,
    createdDevice: null,
    createdAt: '2026-10-06T00:00:00Z',
    updatedAt: '2026-10-06T00:00:00Z',
    deletedAt: null,
    source: 'manual' as const,
    sessionState: null,
    endedBy: null,
    endedDevice: null,
    endRecordedAt: null,
    notes: null,
  };
}

export function sampleRunningFeed(now: Date): BabyEvent {
  return {
    ...meta('event-running-feed'),
    type: 'breast_feed',
    sessionState: 'running',
    startedAt: minutesAgo(now, 26),
    endedAt: null,
    segments: [
      { side: 'left', startedAt: minutesAgo(now, 26), endedAt: minutesAgo(now, 15.5) },
      { side: 'right', startedAt: minutesAgo(now, 12.4), endedAt: null },
    ],
  };
}

export function sampleRunningSleep(now: Date): EventOfType<'sleep'> {
  return {
    ...meta('event-running-sleep', 'user-john'),
    type: 'sleep',
    segments: [],
    startedAt: minutesAgo(now, 72),
    endedAt: null,
    details: {
      locations: ['bassinet'],
      fallAsleep: null,
      startMoods: [],
      endMoods: [],
      wokenByCarer: false,
      quality: null,
    },
  };
}

function sampleFeed(now: Date): EventOfType<'breast_feed'> {
  return {
    ...meta('event-feed-1'),
    type: 'breast_feed',
    startedAt: minutesAgo(now, 160),
    endedAt: minutesAgo(now, 134),
    segments: [
      { side: 'left', startedAt: minutesAgo(now, 160), endedAt: minutesAgo(now, 150) },
      { side: 'right', startedAt: minutesAgo(now, 146), endedAt: minutesAgo(now, 134) },
    ],
  };
}

function sampleNappy(now: Date): EventOfType<'nappy'> {
  return {
    ...meta('event-nappy-1'),
    type: 'nappy',
    startedAt: minutesAgo(now, 48),
    endedAt: minutesAgo(now, 48),
    details: {
      wet: true,
      dirty: true,
      wetSize: 'medium',
      pooSize: 'medium',
      pooColours: ['mustard', 'green'],
      pooTextures: ['seedy'],
      rash: false,
    },
  };
}

export function sampleEvents(now: Date): BabyEvent[] {
  return [
    sampleFeed(now),
    {
      ...meta('event-sleep-1', 'user-john'),
      type: 'sleep',
      segments: [],
      startedAt: minutesAgo(now, 240),
      endedAt: minutesAgo(now, 140),
      details: {
        locations: ['cot'],
        fallAsleep: 'under_10_min',
        startMoods: ['happy'],
        endMoods: [],
        wokenByCarer: false,
        quality: 4,
      },
    },
    sampleNappy(now),
    {
      ...meta('event-bottle-1', 'user-john'),
      type: 'bottle',
      startedAt: minutesAgo(now, 300),
      endedAt: minutesAgo(now, 288),
      details: { content: 'formula', amountMl: 90, amountLeftMl: null },
    },
    {
      ...meta('event-pump-1'),
      type: 'pump',
      startedAt: minutesAgo(now, 362),
      endedAt: minutesAgo(now, 344),
      segments: [],
      details: { leftMl: 50, rightMl: 40, totalMl: null },
    },
    {
      ...meta('event-growth-1'),
      type: 'growth',
      startedAt: minutesAgo(now, 60 * 24 * 4),
      endedAt: minutesAgo(now, 60 * 24 * 4),
      details: { weightG: 3420, lengthMm: 510, headCircumferenceMm: 355 },
    },
    {
      ...meta('event-custom-1', 'user-john'),
      type: 'custom',
      startedAt: minutesAgo(now, 60 * 20),
      endedAt: minutesAgo(now, 60 * 20 - 15),
      details: { title: 'Bath', description: '' },
    },
  ];
}

const MINUTE = 60_000;
const MONTH_DAYS = 30;
const NIGHT_WINDOW = { startMinutes: 19 * 60, endMinutes: 7 * 60 };

const DAY = { wakeMinutes: 6 * 60 + 40, wakeWobbleMin: 15, bedtimeMinutes: 19 * 60 + 20, bedtimeWobbleMin: 20 };
const FEED = { firstSideMin: 10, switchGapMin: 1, secondSideMin: 13, nappyBeforeMin: 1 };
const NAP = {
  awakeMin: 55,
  awakeGrowthMin: 45,
  awakeWobbleMin: 12,
  lengthMin: 55,
  lengthGrowthMin: 20,
  lengthWobbleMin: 25,
  shortestBeforeBedMin: 40,
  feedAfterMin: 4,
};
const NIGHT = {
  feedBeforeBedMin: 30,
  firstStretchMin: 150,
  firstStretchGrowthMin: 190,
  stretchWobbleMin: 25,
  laterStretchMin: 150,
  laterStretchGrowthMin: 40,
  feedAfterWakingMin: 3,
  resettleMin: 35,
  lastWakeBeforeMorningMin: 30,
};
const SEED = { bedtime: 3, awake: 7, nap: 5, night: 11 };

const wobble = (seed: number) => Math.sin(seed * 12.9898) * 0.5 + Math.sin(seed * 78.233) * 0.5;

export function sampleMonthEvents(now: Date): BabyEvent[] {
  const { timezone, day_start_minutes: dayStart } = sampleBaby;
  const todayKey = dayKeyFor(now.toISOString(), timezone, dayStart);
  const sleepTemplate = sampleRunningSleep(now);
  const feedTemplate = sampleFeed(now);
  const nappyTemplate = sampleNappy(now);
  const events: BabyEvent[] = [];
  let count = 0;
  const sleep = (start: number, end: number) =>
    events.push({
      ...sleepTemplate,
      id: `month-sleep-${(count += 1)}`,
      sessionState: null,
      startedAt: new Date(start).toISOString(),
      endedAt: new Date(end).toISOString(),
    });
  const feed = (start: number, leftFirst: boolean) => {
    const sides = leftFirst ? (['left', 'right'] as const) : (['right', 'left'] as const);
    const switched = start + (FEED.firstSideMin + FEED.switchGapMin) * MINUTE;
    const ended = switched + FEED.secondSideMin * MINUTE;
    events.push({
      ...feedTemplate,
      id: `month-feed-${(count += 1)}`,
      startedAt: new Date(start).toISOString(),
      endedAt: new Date(ended).toISOString(),
      segments: [
        {
          side: sides[0],
          startedAt: new Date(start).toISOString(),
          endedAt: new Date(switched - FEED.switchGapMin * MINUTE).toISOString(),
        },
        { side: sides[1], startedAt: new Date(switched).toISOString(), endedAt: new Date(ended).toISOString() },
      ],
    });
    const nappyAt = new Date(start - FEED.nappyBeforeMin * MINUTE).toISOString();
    events.push({ ...nappyTemplate, id: `month-nappy-${(count += 1)}`, startedAt: nappyAt, endedAt: nappyAt });
  };

  lastDays(todayKey, MONTH_DAYS).forEach((dayKey, day) => {
    const progress = day / (MONTH_DAYS - 1);
    const local = (minutes: number) => localInstant(dayKey, Math.round(minutes), timezone).getTime();
    let t = local(DAY.wakeMinutes + DAY.wakeWobbleMin * wobble(day));
    let leftFirst = day % 2 === 0;
    feed(t, leftFirst);
    const bedtime = local(DAY.bedtimeMinutes + DAY.bedtimeWobbleMin * wobble(day + SEED.bedtime));
    for (let nap = 0; ; nap += 1) {
      const awake = NAP.awakeMin + NAP.awakeGrowthMin * progress + NAP.awakeWobbleMin * wobble(day * SEED.awake + nap);
      const start = t + awake * MINUTE;
      if (start + NAP.shortestBeforeBedMin * MINUTE > bedtime) break;
      const length =
        NAP.lengthMin + NAP.lengthWobbleMin * wobble(day * SEED.nap + nap) + NAP.lengthGrowthMin * progress;
      const end = start + length * MINUTE;
      sleep(start, end);
      t = end;
      leftFirst = !leftFirst;
      feed(t + NAP.feedAfterMin * MINUTE, leftFirst);
    }
    feed(bedtime - NIGHT.feedBeforeBedMin * MINUTE, (leftFirst = !leftFirst));
    const morning = localInstant(shiftDay(dayKey, 1), DAY.wakeMinutes, timezone).getTime();
    let start = bedtime;
    let stretch =
      (NIGHT.firstStretchMin +
        NIGHT.firstStretchGrowthMin * progress +
        NIGHT.stretchWobbleMin * wobble(day + SEED.night)) *
      MINUTE;
    while (start < morning - NIGHT.lastWakeBeforeMorningMin * MINUTE) {
      const end = Math.min(start + stretch, morning);
      sleep(start, end);
      if (end >= morning) break;
      feed(end + NIGHT.feedAfterWakingMin * MINUTE, (leftFirst = !leftFirst));
      start = end + NIGHT.resettleMin * MINUTE;
      stretch = (NIGHT.laterStretchMin + NIGHT.laterStretchGrowthMin * progress) * MINUTE;
    }
  });
  return events.filter((event) => Date.parse(event.endedAt ?? event.startedAt) <= now.getTime());
}

export function sampleMonthView(now: Date): {
  days: { dayKey: string; layout: DayLayout }[];
  ticks: { frac: number; label: string }[];
  todayKey: string;
  week: WeekSummary;
} {
  const { timezone, day_start_minutes: dayStart } = sampleBaby;
  const events = sampleMonthEvents(now);
  const todayKey = dayKeyFor(now.toISOString(), timezone, dayStart);
  const keys = lastDays(todayKey, MONTH_DAYS);
  const buckets = bucketByDay(events, keys, timezone, dayStart, now);
  return {
    days: buckets.map((day) => ({ dayKey: day.dayKey, layout: dayLayout(day.events, day.window, now) })),
    ticks: hourTicks(keys[0]!, timezone, dayStart, 6),
    todayKey,
    week: summariseWeek(
      buckets.filter((day) => day.dayKey !== todayKey).map((day) => summariseDay(day.events, day.window, { now })),
    ),
  };
}

export function sampleStatsReport(now: Date): StatsReport {
  const { timezone, day_start_minutes: dayStart } = sampleBaby;
  const todayKey = dayKeyFor(now.toISOString(), timezone, dayStart);
  return statsReport(sampleMonthEvents(now), lastDays(todayKey, MONTH_DAYS), todayKey, now, {
    timeZone: timezone,
    dayStartMinutes: dayStart,
    nightStartMinutes: NIGHT_WINDOW.startMinutes,
    nightEndMinutes: NIGHT_WINDOW.endMinutes,
    mergeGapMs: DEFAULT_FAMILY_SETTINGS.downtime_merge_threshold_sec * 1000,
    units: DEFAULT_FAMILY_SETTINGS.units,
  });
}
