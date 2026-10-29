import { HOUR_MS, MINUTE_MS, SECOND_MS } from '../time/constants';
import {
  dayKeyFor,
  dayWindow,
  formatDayDate,
  formatShortDate,
  lastDays,
  parseDayKey,
  shiftDay,
} from '../time/local-time';
import { zonedParts } from '../time/zoned';
import type { TimeWindow } from '../time/windows';
import type { Interval, ReportSettings } from './samples';
import type { ReportBucket, ReportRange } from './spec';

export interface BucketDef {
  key: string;
  label: string;
  title: string;
  days: number;
  firstDay?: string;
  lastDay?: string;
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function weekdayIndex(dayKey: string): number {
  const { year, month, day } = parseDayKey(dayKey);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

export function hourLabel(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

export const dayTitle = (dayKey: string): string => formatDayDate(dayKey);

export const shortDayTitle = (dayKey: string): string => formatShortDate(`${dayKey}T12:00:00Z`, 'UTC');

export function monthTitle(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-NZ', { timeZone: 'UTC', month: 'short', year: 'numeric' }).format(
    new Date(Date.UTC(year!, month! - 1, 1)),
  );
}

export function reportDays(range: ReportRange, todayKey: string, birthDate: string): string[] {
  if ('from' in range) {
    const keys: string[] = [];
    const last = range.to < todayKey ? range.to : todayKey;
    for (let key = range.from; key <= last; key = shiftDay(key, 1)) keys.push(key);
    return keys.length ? keys : [todayKey];
  }
  switch (range.preset) {
    case '7d':
      return lastDays(todayKey, 7);
    case '14d':
      return lastDays(todayKey, 14);
    case '30d':
      return lastDays(todayKey, 30);
    case '90d':
      return lastDays(todayKey, 90);
    case '6m':
      return lastDays(todayKey, 182);
    case 'all': {
      const keys: string[] = [];
      for (let key = birthDate < todayKey ? birthDate : todayKey; key <= todayKey; key = shiftDay(key, 1))
        keys.push(key);
      return keys;
    }
  }
}

export function previousDays(dayKeys: readonly string[]): string[] {
  const first = dayKeys[0]!;
  return lastDays(shiftDay(first, -1), dayKeys.length);
}

export interface Bucketing {
  defs: BucketDef[];
  indexOfDay: (dayKey: string) => number;
  indexOfInstant: (instant: number) => number;
  splitInterval: (interval: Interval) => { index: number; interval: Interval }[];
}

function dayWindows(dayKeys: readonly string[], settings: ReportSettings): TimeWindow[] {
  return dayKeys.map((key) => dayWindow(key, settings.timeZone, settings.dayStartMinutes));
}

function splitByDays(
  interval: Interval,
  dayKeys: readonly string[],
  windows: readonly TimeWindow[],
  indexOfDay: (dayKey: string) => number,
): { index: number; interval: Interval }[] {
  const pieces: { index: number; interval: Interval }[] = [];
  for (let order = 0; order < windows.length; order += 1) {
    const window = windows[order]!;
    const start = Math.max(interval.start, window.start.getTime());
    const end = Math.min(interval.end, window.end.getTime());
    if (end <= start) {
      if (window.start.getTime() >= interval.end) break;
      continue;
    }
    const index = indexOfDay(dayKeys[order]!);
    if (index >= 0) pieces.push({ index, interval: { start, end } });
  }
  return pieces;
}

function nextHourBoundary(instant: number, timeZone: string): number {
  const parts = zonedParts(instant, timeZone);
  const intoHour = parts.minute * MINUTE_MS + parts.second * SECOND_MS + (instant % SECOND_MS);
  return instant - intoHour + HOUR_MS;
}

function splitByHours(interval: Interval, timeZone: string): { index: number; interval: Interval }[] {
  const pieces: { index: number; interval: Interval }[] = [];
  let cursor = interval.start;
  let guard = 0;
  while (cursor < interval.end && guard < 24 * 400) {
    guard += 1;
    const boundary = nextHourBoundary(cursor, timeZone);
    const end = Math.min(boundary, interval.end);
    pieces.push({ index: zonedParts(cursor, timeZone).hour, interval: { start: cursor, end } });
    cursor = end;
  }
  return pieces;
}

export function bucketing(bucket: ReportBucket, dayKeys: readonly string[], settings: ReportSettings): Bucketing {
  const windows = dayWindows(dayKeys, settings);
  const dayIndex = new Map(dayKeys.map((key, index) => [key, index]));
  const keyOf = (instant: number) =>
    dayKeyFor(new Date(instant).toISOString(), settings.timeZone, settings.dayStartMinutes);

  if (bucket === 'hour') {
    const defs = Array.from({ length: 24 }, (_, hour) => ({
      key: String(hour).padStart(2, '0'),
      label: hourLabel(hour),
      title: hourLabel(hour),
      days: dayKeys.length,
    }));
    return {
      defs,
      indexOfDay: () => -1,
      indexOfInstant: (instant) => (dayIndex.has(keyOf(instant)) ? zonedParts(instant, settings.timeZone).hour : -1),
      splitInterval: (interval) =>
        splitByDays(interval, dayKeys, windows, (key) => dayIndex.get(key) ?? -1).flatMap((piece) =>
          splitByHours(piece.interval, settings.timeZone),
        ),
    };
  }

  let defs: BucketDef[];
  let indexOfDay: (dayKey: string) => number;
  if (bucket === 'day') {
    defs = dayKeys.map((key) => ({ key, label: key, title: dayTitle(key), days: 1, firstDay: key, lastDay: key }));
    indexOfDay = (key) => dayIndex.get(key) ?? -1;
  } else if (bucket === 'week') {
    defs = [];
    const weekOf = new Map<string, number>();
    for (let end = dayKeys.length; end > 0; end -= 7) {
      const chunk = dayKeys.slice(Math.max(0, end - 7), end);
      defs.unshift({
        key: chunk[0]!,
        label: chunk[0]!,
        title: `Week of ${shortDayTitle(chunk[0]!)}`,
        days: chunk.length,
        firstDay: chunk[0]!,
        lastDay: chunk.at(-1)!,
      });
    }
    defs.forEach((def, index) => {
      for (let key = def.firstDay!; key <= def.lastDay!; key = shiftDay(key, 1)) weekOf.set(key, index);
    });
    indexOfDay = (key) => weekOf.get(key) ?? -1;
  } else if (bucket === 'month') {
    const months = new Map<string, BucketDef>();
    for (const key of dayKeys) {
      const monthKey = key.slice(0, 7);
      const def = months.get(monthKey);
      if (def) {
        def.days += 1;
        def.lastDay = key;
      } else {
        months.set(monthKey, {
          key: monthKey,
          label: monthKey,
          title: monthTitle(monthKey),
          days: 1,
          firstDay: key,
          lastDay: key,
        });
      }
    }
    defs = [...months.values()];
    const monthIndex = new Map(defs.map((def, index) => [def.key, index]));
    indexOfDay = (key) => (dayIndex.has(key) ? (monthIndex.get(key.slice(0, 7)) ?? -1) : -1);
  } else {
    defs = WEEKDAY_LABELS.map((label) => ({ key: label, label, title: label, days: 0 }));
    for (const key of dayKeys) defs[weekdayIndex(key)]!.days += 1;
    indexOfDay = (key) => (dayIndex.has(key) ? weekdayIndex(key) : -1);
  }

  return {
    defs,
    indexOfDay,
    indexOfInstant: (instant) => indexOfDay(keyOf(instant)),
    splitInterval: (interval) => splitByDays(interval, dayKeys, windows, indexOfDay),
  };
}
