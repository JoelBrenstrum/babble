import { nightIntervals, overlapMs, type TimeWindow } from '../timeline/days';
import { eventSpan } from '../timeline/day-layout';
import { segmentTotals } from './segments';
import type { BabyEvent } from './types';

export interface NightSettings {
  dayKey: string;
  timeZone: string;
  startMinutes: number;
  endMinutes: number;
}

export interface DaySummary {
  sleepMs: number;
  nightMs: number;
  napMs: number;
  naps: number;
  longestSleepMs: number;
  feeds: number;
  leftMs: number;
  rightMs: number;
  bottles: number;
  bottleMl: number;
  nappies: number;
  wet: number;
  dirty: number;
  both: number;
  lastNappyAt: string | null;
  pumps: number;
  pumpMl: number;
  pumpLeftMl: number;
  pumpRightMl: number;
}

export function summariseDay(
  events: readonly BabyEvent[],
  window: TimeWindow,
  options: { now?: Date; night?: NightSettings } = {},
): DaySummary {
  const now = options.now && options.now < window.end ? options.now : window.end;
  const nights = options.night
    ? nightIntervals(options.night.dayKey, options.night.timeZone, options.night.startMinutes, options.night.endMinutes)
    : [];
  const inNight = (instant: Date) => nights.some((night) => instant >= night.start && instant < night.end);
  const summary: DaySummary = {
    sleepMs: 0,
    nightMs: 0,
    napMs: 0,
    naps: 0,
    longestSleepMs: 0,
    feeds: 0,
    leftMs: 0,
    rightMs: 0,
    bottles: 0,
    bottleMl: 0,
    nappies: 0,
    wet: 0,
    dirty: 0,
    both: 0,
    lastNappyAt: null,
    pumps: 0,
    pumpMl: 0,
    pumpLeftMl: 0,
    pumpRightMl: 0,
  };

  for (const event of events) {
    if (event.deletedAt) continue;
    const span = eventSpan(event, now);
    const startsInDay = span.start >= window.start && span.start < window.end;

    switch (event.type) {
      case 'sleep': {
        const inDay = overlapMs(span, window);
        if (inDay === 0) break;
        const atNight = nights.reduce((total, night) => total + overlapMs(span, overlapWindow(night, window)), 0);
        summary.sleepMs += inDay;
        summary.nightMs += atNight;
        summary.napMs += inDay - atNight;
        if (startsInDay && !inNight(span.start)) summary.naps += 1;
        summary.longestSleepMs = Math.max(summary.longestSleepMs, span.end.getTime() - span.start.getTime());
        break;
      }
      case 'breast_feed': {
        if (!startsInDay) break;
        const totals = segmentTotals(event.segments, now);
        summary.feeds += 1;
        summary.leftMs += totals.leftMs;
        summary.rightMs += totals.rightMs;
        break;
      }
      case 'bottle':
        if (!startsInDay) break;
        summary.feeds += 1;
        summary.bottles += 1;
        summary.bottleMl += Math.max(0, (event.details.amountMl ?? 0) - (event.details.amountLeftMl ?? 0));
        break;
      case 'nappy':
        if (!startsInDay) break;
        summary.nappies += 1;
        if (event.details.wet) summary.wet += 1;
        if (event.details.dirty) summary.dirty += 1;
        if (event.details.wet && event.details.dirty) summary.both += 1;
        if (!summary.lastNappyAt || event.startedAt > summary.lastNappyAt) summary.lastNappyAt = event.startedAt;
        break;
      case 'pump': {
        if (!startsInDay) break;
        const left = event.details.leftMl ?? 0;
        const right = event.details.rightMl ?? 0;
        summary.pumps += 1;
        summary.pumpLeftMl += left;
        summary.pumpRightMl += right;
        summary.pumpMl += event.details.totalMl ?? left + right;
        break;
      }
    }
  }
  return summary;
}

function overlapWindow(a: TimeWindow, b: TimeWindow): TimeWindow {
  const start = a.start > b.start ? a.start : b.start;
  const end = a.end < b.end ? a.end : b.end;
  return end > start ? { start, end } : { start, end: start };
}

export interface WeekSummary {
  days: number;
  averageSleepMs: number;
  longestSleepMs: number;
  feedsPerDay: number;
  nappiesPerDay: number;
}

export function summariseWeek(days: readonly DaySummary[]): WeekSummary {
  const count = days.length;
  const sum = (pick: (day: DaySummary) => number) => days.reduce((total, day) => total + pick(day), 0);
  return {
    days: count,
    averageSleepMs: count ? sum((day) => day.sleepMs) / count : 0,
    longestSleepMs: days.reduce((longest, day) => Math.max(longest, day.longestSleepMs), 0),
    feedsPerDay: count ? sum((day) => day.feeds) / count : 0,
    nappiesPerDay: count ? sum((day) => day.nappies) / count : 0,
  };
}
