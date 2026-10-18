import { nightOf, summariseDay, type DaySummary } from '../events/day-summary';
import type { BabyEvent } from '../events/types';
import { compareIso } from '../time/instants';
import { dayKeyFor, lastDays, shiftDay } from '../time/local-time';
import { bucketByDay } from '../timeline/day-layout';
import { countedDays } from '../timeline/totals';
import { buildCards, type StatsCard } from './cards';
import type { StatsSettings } from './settings';

export type StatsRange = '7d' | '30d' | 'all';

export const STATS_RANGES: { value: StatsRange; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'All' },
];

export function isStatsRange(value: unknown): value is StatsRange {
  return STATS_RANGES.some((range) => range.value === value);
}

export function rangeDays(range: StatsRange, todayKey: string, birthDate: string): string[] {
  if (range === '7d') return lastDays(todayKey, 7);
  if (range === '30d') return lastDays(todayKey, 30);
  const keys: string[] = [];
  for (let key = birthDate < todayKey ? birthDate : todayKey; key <= todayKey; key = shiftDay(key, 1)) keys.push(key);
  return keys;
}

export interface StatsReport {
  days: number;
  todayOnly: boolean;
  cards: StatsCard[];
}

export function statsCaption(report: StatsReport): string {
  if (report.todayOnly) return 'Showing today so far. Daily averages start once a full day has been logged.';
  const days = `${report.days} finished ${report.days === 1 ? 'day' : 'days'}`;
  return `Daily averages over ${days}; today is charted but not averaged.`;
}

export function statsReport(
  events: readonly BabyEvent[],
  dayKeys: readonly string[],
  todayKey: string,
  now: Date,
  settings: StatsSettings,
): StatsReport {
  const logged = events.filter((event) => !event.deletedAt);
  const firstStart = logged.reduce<string | null>(
    (earliest, event) => (!earliest || compareIso(event.startedAt, earliest) < 0 ? event.startedAt : earliest),
    null,
  );
  const firstKey = firstStart ? dayKeyFor(firstStart, settings.timeZone, settings.dayStartMinutes) : todayKey;
  const keys = dayKeys.filter((key) => key >= firstKey);
  if (keys.length === 0) keys.push(todayKey);
  const buckets = bucketByDay(logged, keys, settings.timeZone, settings.dayStartMinutes, now);
  const summaries = new Map<string, DaySummary>(
    buckets.map((day) => [
      day.dayKey,
      summariseDay(day.events, day.window, {
        now,
        mergeGapMs: settings.mergeGapMs,
        night: nightOf(day.dayKey, settings),
      }),
    ]),
  );
  const countedKeys = countedDays(keys, todayKey);
  const counted = countedKeys.map((key) => summaries.get(key)!);
  const todayOnly = countedKeys.length === 1 && countedKeys[0] === todayKey;
  const bars = (pick: (day: DaySummary) => number[]) =>
    keys.map((key) => ({ label: key, values: pick(summaries.get(key)!) }));

  const cards = buildCards({
    counted,
    single: todayOnly,
    first: todayOnly ? 'Today so far' : 'Per day',
    bars,
    range: { start: buckets[0]!.window.start, end: buckets.at(-1)!.window.end },
    logged,
    now,
    settings,
    showPump: counted.some((day) => day.pumps > 0) || Boolean(summaries.get(todayKey)?.pumps),
  });
  return { days: counted.length, todayOnly, cards };
}
