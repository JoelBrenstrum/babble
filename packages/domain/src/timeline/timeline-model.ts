import {
  summariseDay,
  summariseWeek,
  summaryOptions,
  type DaySummary,
  type SummarySettings,
  type WeekSummary,
} from '../events/day-summary';
import type { BabyEvent } from '../events/types';
import { MINUTE_MS } from '../time/constants';
import { dayKeyFor, dayWindow, formatDayLabel, lastDays, shiftDay } from '../time/local-time';
import { bucketByDay, dayLayout, type DayLayout } from './day-layout';
import { fractionOf, lastDayWindow, type TimeWindow } from '../time/windows';
import { hourTicks, windowTicks } from './days';
import { countedDays, formatDayRange } from './totals';

export type TimelineView = 'day' | '24h' | '7d' | '30d';

export const TIMELINE_VIEWS: readonly TimelineView[] = ['day', '24h', '7d', '30d'];

export const TIMELINE_SPAN: Record<TimelineView, number> = { day: 1, '24h': 1, '7d': 7, '30d': 30 };

export interface TimelineBaby {
  timezone: string;
  day_start_minutes: number;
  birth_date: string;
}

export interface TimelineRange {
  view: TimelineView;
  todayKey: string;
  dayKey: string;
  keys: string[];
  from: string;
  to: string;
  step: number;
  previousKey: string;
  nextKey: string;
  canGoNext: boolean;
  rangeLabel: string;
}

export interface TimelineDay {
  dayKey: string;
  window: TimeWindow;
  events: BabyEvent[];
  summary: DaySummary | null;
  layout: DayLayout | null;
}

export interface TimelineTick {
  frac: number;
  label: string;
}

export function timelineRange(input: {
  view: TimelineView;
  date: string | null | undefined;
  baby: TimelineBaby;
  now: Date;
}): TimelineRange {
  const { view, date, baby, now } = input;
  const todayKey = dayKeyFor(now.toISOString(), baby.timezone, baby.day_start_minutes);
  const dayKey = date && date <= todayKey ? date : todayKey;
  const step = TIMELINE_SPAN[view];
  const keys =
    view === 'day'
      ? [dayKey]
      : lastDays(dayKey, step).filter((key) => view !== '30d' || key >= baby.birth_date || key === dayKey);
  const rolling = lastDayWindow(now);
  const first = dayWindow(keys[0]!, baby.timezone, baby.day_start_minutes);
  const last = dayWindow(keys.at(-1)!, baby.timezone, baby.day_start_minutes);
  const stepped = shiftDay(dayKey, step);
  return {
    view,
    todayKey,
    dayKey,
    keys,
    from: (view === '24h' ? floorToMinute(rolling.start) : first.start).toISOString(),
    to: (view === '24h' ? ceilToMinute(rolling.end) : last.end).toISOString(),
    step,
    previousKey: shiftDay(dayKey, -step),
    nextKey: stepped < todayKey ? stepped : todayKey,
    canGoNext: dayKey < todayKey,
    rangeLabel: view === 'day' ? formatDayLabel(dayKey, todayKey) : formatDayRange(keys),
  };
}

function floorToMinute(date: Date): Date {
  return new Date(Math.floor(date.getTime() / MINUTE_MS) * MINUTE_MS);
}

function ceilToMinute(date: Date): Date {
  return new Date(Math.ceil(date.getTime() / MINUTE_MS) * MINUTE_MS);
}

export type TimelineModel =
  | (TimelineRange & {
      view: 'day';
      day: TimelineDay & { summary: DaySummary; layout: DayLayout };
      ticks: TimelineTick[];
      nowFrac: number | null;
    })
  | (TimelineRange & {
      view: '24h';
      window: TimeWindow;
      summary: DaySummary;
      layout: DayLayout;
      ticks: TimelineTick[];
      nowFrac: 1;
    })
  | (TimelineRange & { view: '7d' | '30d'; days: TimelineDay[]; week: WeekSummary; ticks: TimelineTick[] });

export function timelineModel(input: {
  view: TimelineView;
  date: string | null | undefined;
  events: readonly BabyEvent[];
  settings: SummarySettings | null | undefined;
  baby: TimelineBaby;
  now: Date;
}): TimelineModel {
  const { view, events, settings, baby, now } = input;
  const range = timelineRange(input);
  const { todayKey, dayKey, keys } = range;
  const buildDays = (): TimelineDay[] =>
    bucketByDay(events, keys, baby.timezone, baby.day_start_minutes, now).map((day) => {
      const future = day.dayKey > todayKey;
      return {
        ...day,
        summary: future ? null : summariseDay(day.events, day.window, summaryOptions(settings, baby, day.dayKey, now)),
        layout: future ? null : dayLayout(day.events, day.window, now),
      };
    });

  if (view === '24h') {
    const window = lastDayWindow(now);
    return {
      ...range,
      view,
      window,
      summary: summariseDay(events, window, summaryOptions(settings, baby, todayKey, now)),
      layout: dayLayout(events, window, now),
      ticks: windowTicks(window, baby.timezone, 3),
      nowFrac: 1,
    };
  }

  if (view === 'day') {
    const window = dayWindow(dayKey, baby.timezone, baby.day_start_minutes);
    const dayEvents = bucketByDay(events, [dayKey], baby.timezone, baby.day_start_minutes, now)[0]?.events ?? [];
    return {
      ...range,
      view,
      day: {
        dayKey,
        window,
        events: dayEvents,
        summary: summariseDay(dayEvents, window, summaryOptions(settings, baby, dayKey, now)),
        layout: dayLayout(dayEvents, window, now),
      },
      ticks: hourTicks(dayKey, baby.timezone, baby.day_start_minutes, 3),
      nowFrac: dayKey === todayKey ? fractionOf(window, now.getTime()) : null,
    };
  }

  const days = buildDays();
  const counted = new Set(countedDays(keys, todayKey));
  return {
    ...range,
    view,
    days,
    week: summariseWeek(days.flatMap((day) => (counted.has(day.dayKey) && day.summary ? [day.summary] : []))),
    ticks: hourTicks(keys[0]!, baby.timezone, baby.day_start_minutes, 6),
  };
}
