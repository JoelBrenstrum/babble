import { summariseDay, type DaySummary } from '../events/day-summary';
import { summariseSegments } from '../events/session-summary';
import type { BabyEvent, PooColour, Units } from '../events/types';
import { formatDuration } from '../format/duration';
import { formatVolume } from '../format/units';
import { lastDays, type TimeWindow } from '../timeline/days';
import { bucketByDay } from '../timeline/day-layout';
import { countedDays } from '../timeline/totals';
import { dayKeyFor, shiftDay } from '../time/local-time';

export type StatsRange = '7d' | '30d' | 'all';

export const MAX_GAP_MS = 12 * 3_600_000;
const WEEKLY_AFTER_DAYS = 31;

export function rangeDays(range: StatsRange, todayKey: string, birthDate: string): string[] {
  if (range === '7d') return lastDays(todayKey, 7);
  if (range === '30d') return lastDays(todayKey, 30);
  const keys: string[] = [];
  for (let key = birthDate < todayKey ? birthDate : todayKey; key <= todayKey; key = shiftDay(key, 1)) keys.push(key);
  return keys;
}

export interface StatsSettings {
  timeZone: string;
  dayStartMinutes: number;
  nightStartMinutes: number;
  nightEndMinutes: number;
  mergeGapMs: number;
  units: Units;
}

export interface ChartBar {
  label: string;
  values: number[];
}

export interface StatsCard {
  key: 'sleep' | 'feeds' | 'nappies' | 'pump';
  title: string;
  figures: { label: string; value: string }[];
  chart: { unit: string; series: string[]; bars: ChartBar[]; max: number; weekly: boolean };
  colours?: PooColour[];
}

export interface StatsReport {
  days: number;
  todayOnly: boolean;
  cards: StatsCard[];
}

interface Gaps {
  totalMs: number;
  count: number;
}

export function gapsBetween(spans: readonly { start: number; end: number }[], within: TimeWindow): Gaps {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  let totalMs = 0;
  let count = 0;
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]!;
    const gap = sorted[index]!.start - previous.end;
    if (gap <= 0 || gap >= MAX_GAP_MS) continue;
    if (previous.end < within.start.getTime() || previous.end >= within.end.getTime()) continue;
    totalMs += gap;
    count += 1;
  }
  return { totalMs, count };
}

export function weeklyBars(bars: readonly ChartBar[]): ChartBar[] {
  if (bars.length <= WEEKLY_AFTER_DAYS) return [...bars];
  const weeks: ChartBar[] = [];
  for (let end = bars.length; end > 0; end -= 7) {
    const chunk = bars.slice(Math.max(0, end - 7), end);
    const width = chunk[0]!.values.length;
    weeks.unshift({
      label: chunk[0]!.label,
      values: Array.from(
        { length: width },
        (_, index) => chunk.reduce((total, bar) => total + bar.values[index]!, 0) / chunk.length,
      ),
    });
  }
  return weeks;
}

function chart(unit: string, series: string[], bars: ChartBar[]): StatsCard['chart'] {
  const grouped = weeklyBars(bars);
  const max = grouped.reduce(
    (highest, bar) =>
      Math.max(
        highest,
        bar.values.reduce((sum, value) => sum + value, 0),
      ),
    0,
  );
  return { unit, series, bars: grouped, max, weekly: grouped.length !== bars.length };
}

const hours = (ms: number) => formatDuration(ms, { seconds: false });
const perDay = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
const HOUR = 3_600_000;

export function statsReport(
  events: readonly BabyEvent[],
  dayKeys: readonly string[],
  todayKey: string,
  now: Date,
  settings: StatsSettings,
): StatsReport {
  const logged = events.filter((event) => !event.deletedAt);
  const firstStart = logged.reduce<string | null>(
    (earliest, event) => (!earliest || event.startedAt < earliest ? event.startedAt : earliest),
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
        night: {
          dayKey: day.dayKey,
          timeZone: settings.timeZone,
          startMinutes: settings.nightStartMinutes,
          endMinutes: settings.nightEndMinutes,
        },
      }),
    ]),
  );
  const countedKeys = countedDays(keys, todayKey);
  const counted = countedKeys.map((key) => summaries.get(key)!);
  const days = counted.length;
  const average = (pick: (day: DaySummary) => number) =>
    days ? counted.reduce((total, day) => total + pick(day), 0) / days : 0;
  const bars = (pick: (day: DaySummary) => number[]) =>
    keys.map((key) => ({ label: key, values: pick(summaries.get(key)!) }));

  const range = { start: buckets[0]!.window.start, end: buckets.at(-1)!.window.end };
  const inRange = logged;
  const span = (event: BabyEvent) => ({
    start: Date.parse(event.startedAt),
    end: event.endedAt ? Date.parse(event.endedAt) : now.getTime(),
  });

  const wake = gapsBetween(inRange.filter((event) => event.type === 'sleep').map(span), range);
  const feedStarts = inRange
    .filter((event) => event.type === 'breast_feed' || event.type === 'bottle')
    .map((event) => ({ start: Date.parse(event.startedAt), end: Date.parse(event.startedAt) }));
  const feedGaps = gapsBetween(feedStarts, range);

  const breastFeeds = inRange.filter(
    (event): event is Extract<BabyEvent, { type: 'breast_feed' }> =>
      event.type === 'breast_feed' &&
      event.source === 'manual' &&
      event.segments.length > 0 &&
      Date.parse(event.startedAt) >= range.start.getTime(),
  );
  const downtimeMs = breastFeeds.reduce(
    (total, feed) => total + summariseSegments(feed.segments, { mergeGapMs: settings.mergeGapMs, now }).downtimeMs,
    0,
  );
  const leftMs = counted.reduce((total, day) => total + day.leftMs, 0);
  const rightMs = counted.reduce((total, day) => total + day.rightMs, 0);
  const sideTotal = leftMs + rightMs;

  const longest = counted.reduce((max, day) => Math.max(max, day.longestSleepMs), 0);
  const colours = inRange
    .filter((event): event is Extract<BabyEvent, { type: 'nappy' }> => event.type === 'nappy' && event.details.dirty)
    .filter((event) => Date.parse(event.startedAt) >= range.start.getTime())
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .flatMap((event) => event.details.pooColours.slice(0, 1))
    .slice(0, 14);

  const cards: StatsCard[] = [
    {
      key: 'sleep',
      title: 'Sleep',
      figures: [
        { label: 'Per day', value: hours(average((day) => day.sleepMs)) },
        { label: 'Night', value: hours(average((day) => day.nightMs)) },
        { label: 'Naps per day', value: perDay(average((day) => day.naps)) },
        { label: 'Longest stretch', value: longest ? hours(longest) : '—' },
        { label: 'Wake window', value: wake.count ? hours(wake.totalMs / wake.count) : '—' },
      ],
      chart: chart(
        'h',
        ['Night', 'Naps'],
        bars((day) => [day.nightMs / HOUR, day.napMs / HOUR]),
      ),
    },
    {
      key: 'feeds',
      title: 'Feeds',
      figures: [
        { label: 'Per day', value: perDay(average((day) => day.feeds)) },
        { label: 'Average gap', value: feedGaps.count ? hours(feedGaps.totalMs / feedGaps.count) : '—' },
        {
          label: 'Left / right',
          value: sideTotal
            ? `${Math.round((leftMs / sideTotal) * 100)}% / ${Math.round((rightMs / sideTotal) * 100)}%`
            : '—',
        },
        { label: 'Downtime per feed', value: breastFeeds.length ? hours(downtimeMs / breastFeeds.length) : '—' },
        {
          label: 'Bottle per day',
          value: counted.some((day) => day.bottles > 0)
            ? formatVolume(
                average((day) => day.bottleMl),
                settings.units,
              )
            : '—',
        },
      ],
      chart: chart(
        '',
        ['Breast', 'Bottle'],
        bars((day) => [day.feeds - day.bottles, day.bottles]),
      ),
    },
    {
      key: 'nappies',
      title: 'Nappies',
      figures: [
        { label: 'Wet per day', value: perDay(average((day) => day.wet)) },
        { label: 'Dirty per day', value: perDay(average((day) => day.dirty)) },
      ],
      chart: chart(
        '',
        ['Wet', 'Dirty'],
        bars((day) => [day.nappies - day.dirty, day.dirty]),
      ),
      colours,
    },
  ];

  if (counted.some((day) => day.pumps > 0) || summaries.get(todayKey)?.pumps) {
    const pumpLeft = counted.reduce((total, day) => total + day.pumpLeftMl, 0);
    const pumpRight = counted.reduce((total, day) => total + day.pumpRightMl, 0);
    cards.push({
      key: 'pump',
      title: 'Pump',
      figures: [
        {
          label: 'Per day',
          value: formatVolume(
            average((day) => day.pumpMl),
            settings.units,
          ),
        },
        { label: 'Sessions per day', value: perDay(average((day) => day.pumps)) },
        {
          label: 'Left / right',
          value: `${formatVolume(pumpLeft, settings.units)} / ${formatVolume(pumpRight, settings.units)}`,
        },
      ],
      chart: chart(
        'ml',
        ['Pumped'],
        bars((day) => [day.pumpMl]),
      ),
    });
  }

  return { days, todayOnly: countedKeys.length === 1 && countedKeys[0] === todayKey, cards };
}
