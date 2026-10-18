import { summariseDay, summaryOptions, type DaySummary, type SummarySettings } from '../events/day-summary';
import type { BabyEvent } from '../events/types';
import { formatDurationShort } from '../format/duration';
import { countChange, durationChange } from '../format/change';
import { DAY_MS } from '../time/constants';
import { dayKeyFor, dayWindow, formatDayLabel, shiftDay, shiftLocalDays } from '../time/local-time';
import { bucketByDay, dayLayout, type DayLayout } from './day-layout';
import { fractionOf, type TimeWindow } from '../time/windows';
import type { TimelineBaby } from './timeline-model';

export type ComparisonKey = 'sleep' | 'naps' | 'longest' | 'feeds' | 'nappies';

export interface ComparisonRow {
  key: ComparisonKey;
  label: string;
  value: string;
  previous: string;
  change: string;
  trend: 'up' | 'down' | 'same';
}

export interface DayComparison {
  previousKey: string;
  previousLabel: string;
  title: string;
  note: string;
  cutoff: string | null;
  cutoffFrac: number | null;
  window: TimeWindow;
  layout: DayLayout;
  summary: DaySummary;
  rows: ComparisonRow[];
}

export function previousDayWindow(dayKey: string, baby: TimelineBaby): { previousKey: string } & TimeWindow {
  const previousKey = shiftDay(dayKey, -1);
  return { previousKey, ...dayWindow(previousKey, baby.timezone, baby.day_start_minutes) };
}

export function comparisonToggleLabel(dayKey: string, todayKey: string): string {
  const label = formatDayLabel(shiftDay(dayKey, -1), todayKey);
  return `Compare with ${label === 'Yesterday' ? 'yesterday' : label}`;
}

export function comparisonCutoff(dayKey: string, todayKey: string, baby: TimelineBaby, now: Date): Date | null {
  if (dayKey !== todayKey) return null;
  const window = previousDayWindow(dayKey, baby);
  const sameTime = Date.parse(shiftLocalDays(now.toISOString(), -1, baby.timezone));
  return new Date(Math.min(Math.max(sameTime, window.start.getTime()), window.end.getTime()));
}

const METRICS: { key: ComparisonKey; label: string; kind: 'duration' | 'count'; pick: (day: DaySummary) => number }[] =
  [
    { key: 'sleep', label: 'Sleep', kind: 'duration', pick: (day) => day.sleepMs },
    { key: 'naps', label: 'Naps', kind: 'count', pick: (day) => day.naps },
    { key: 'longest', label: 'Longest sleep', kind: 'duration', pick: (day) => day.longestSleepMs },
    { key: 'feeds', label: 'Feeds', kind: 'count', pick: (day) => day.feeds },
    { key: 'nappies', label: 'Nappies', kind: 'count', pick: (day) => day.nappies },
  ];

export function comparisonRows(current: DaySummary, previous: DaySummary): ComparisonRow[] {
  return METRICS.map((metric) => {
    const now = metric.pick(current);
    const before = metric.pick(previous);
    const format = (value: number) => (metric.kind === 'duration' ? formatDurationShort(value) : String(value));
    const change = metric.kind === 'duration' ? durationChange(now, before) : countChange(now, before);
    return {
      key: metric.key,
      label: metric.label,
      value: format(now),
      previous: format(before),
      change,
      trend: change === 'Same' ? 'same' : now > before ? 'up' : 'down',
    };
  });
}

export function dayComparison(input: {
  dayKey: string;
  todayKey: string;
  current: DaySummary;
  events: readonly BabyEvent[];
  settings: SummarySettings | null | undefined;
  baby: TimelineBaby;
  now: Date;
}): DayComparison {
  const { dayKey, todayKey, current, events, settings, baby, now } = input;
  const { previousKey, start, end } = previousDayWindow(dayKey, baby);
  const window = { start, end };
  const cutoff = comparisonCutoff(dayKey, todayKey, baby, now);
  const dayEvents = bucketByDay(events, [previousKey], baby.timezone, baby.day_start_minutes, now)[0]?.events ?? [];
  const until = cutoff ?? end;
  const summary = summariseDay(
    dayEvents,
    { start, end: until },
    summaryOptions(settings, baby, previousKey, until < now ? until : now),
  );
  const previousLabel = formatDayLabel(previousKey, todayKey);
  return {
    previousKey,
    previousLabel,
    title: cutoff ? 'By this time yesterday' : `Compared with ${previousLabel}`,
    note: cutoff ? 'Today so far, against yesterday up to the same time.' : 'Both full days.',
    cutoff: cutoff?.toISOString() ?? null,
    cutoffFrac: cutoff ? fractionOf(window, cutoff.getTime()) : null,
    window,
    layout: dayLayout(dayEvents, window, now),
    summary,
    rows: comparisonRows(current, summary),
  };
}

export const PREVIOUS_24H_LABEL = 'The 24h before';

export function previous24hWindow(window: TimeWindow): TimeWindow {
  return { start: new Date(window.start.getTime() - DAY_MS), end: window.start };
}

export function rollingComparison(input: {
  window: TimeWindow;
  current: DaySummary;
  events: readonly BabyEvent[];
  settings: SummarySettings | null | undefined;
  baby: TimelineBaby;
}): DayComparison {
  const { window: currentWindow, current, events, settings, baby } = input;
  const window = previous24hWindow(currentWindow);
  const previousKey = dayKeyFor(window.end.toISOString(), baby.timezone, baby.day_start_minutes);
  const summary = summariseDay(events, window, summaryOptions(settings, baby, previousKey, window.end));
  return {
    previousKey,
    previousLabel: PREVIOUS_24H_LABEL,
    title: 'Compared with the 24 hours before',
    note: 'The last 24 hours, against the 24 hours before that.',
    cutoff: null,
    cutoffFrac: null,
    window,
    layout: dayLayout(events, window, window.end),
    summary,
    rows: comparisonRows(current, summary),
  };
}
