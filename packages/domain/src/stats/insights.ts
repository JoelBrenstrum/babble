import { nightOf, summariseDay, type DaySummary } from '../events/day-summary';
import { summariseSegments } from '../events/session-summary';
import type { BabyEvent } from '../events/types';
import { formatDuration, formatDurationShort } from '../format/duration';
import { minutesToClock } from '../format/time-of-day';
import { bucketByDay } from '../timeline/day-layout';
import { lastDays, localInstant, type TimeWindow } from '../timeline/days';
import { dayKeyFor, dayWindow, minutesOfDay, shiftDay } from '../time/local-time';
import { MAX_GAP_MS, type StatsCard } from './cards';
import { HOUR_MS, MINUTE_MS } from '../time/constants';

export interface InsightSettings {
  timeZone: string;
  dayStartMinutes: number;
  nightStartMinutes: number;
  nightEndMinutes: number;
}

interface Span {
  start: number;
  end: number;
}

export interface NightStat {
  dayKey: string;
  longestMs: number;
  sleepMs: number;
  wakeUps: number;
}

export interface WakeWindow {
  dayKey: string;
  start: number;
  ms: number;
  order: number;
  beforeBed: boolean;
}

const JOIN_GAP_MS = 5 * MINUTE_MS;
const MAX_WAKE_MS = 8 * HOUR_MS;
const MIN_SAMPLES = 3;
const MIN_WINDOWS = 6;

export function sleepSpans(events: readonly BabyEvent[], now: Date): Span[] {
  const spans = events
    .filter((event) => event.type === 'sleep' && !event.deletedAt)
    .map((event) => ({
      start: Date.parse(event.startedAt),
      end: event.endedAt ? Date.parse(event.endedAt) : now.getTime(),
    }))
    .filter((span) => span.end > span.start)
    .sort((a, b) => a.start - b.start);
  const joined: Span[] = [];
  for (const span of spans) {
    const previous = joined.at(-1);
    if (previous && span.start - previous.end <= JOIN_GAP_MS) previous.end = Math.max(previous.end, span.end);
    else joined.push({ ...span });
  }
  return joined;
}

export function nightWindow(dayKey: string, settings: InsightSettings): TimeWindow {
  const endOffset =
    settings.nightEndMinutes > settings.nightStartMinutes ? settings.nightEndMinutes : settings.nightEndMinutes + 1440;
  return {
    start: localInstant(dayKey, settings.nightStartMinutes, settings.timeZone),
    end: localInstant(dayKey, endOffset, settings.timeZone),
  };
}

const inside = (instant: number, window: TimeWindow) =>
  instant >= window.start.getTime() && instant <= window.end.getTime();

export function nightStats(
  spans: readonly Span[],
  dayKeys: readonly string[],
  now: Date,
  settings: InsightSettings,
): NightStat[] {
  return dayKeys.flatMap((dayKey) => {
    const night = nightWindow(dayKey, settings);
    if (night.end.getTime() > now.getTime()) return [];
    const overlapping = spans.filter((span) => span.end > night.start.getTime() && span.start < night.end.getTime());
    if (overlapping.length === 0) return [];
    let wakeUps = 0;
    for (let index = 1; index < overlapping.length; index += 1) {
      if (inside(overlapping[index - 1]!.end, night) && inside(overlapping[index]!.start, night)) wakeUps += 1;
    }
    const sleepMs = overlapping.reduce(
      (total, span) => total + Math.min(span.end, night.end.getTime()) - Math.max(span.start, night.start.getTime()),
      0,
    );
    const longestMs = Math.max(...overlapping.map((span) => span.end - span.start));
    return [{ dayKey, longestMs, sleepMs, wakeUps }];
  });
}

function nightKeyOf(instant: number, settings: InsightSettings): string | null {
  const key = dayKeyFor(new Date(instant).toISOString(), settings.timeZone, 0);
  const keys = [shiftDay(key, -1), key];
  return keys.find((dayKey) => inside(instant, nightWindow(dayKey, settings))) ?? null;
}

const inAnyNight = (instant: number, settings: InsightSettings) => nightKeyOf(instant, settings) !== null;

export function wakeWindows(spans: readonly Span[], settings: InsightSettings): WakeWindow[] {
  const windows: WakeWindow[] = [];
  for (let index = 1; index < spans.length; index += 1) {
    const woke = spans[index - 1]!.end;
    const slept = spans[index]!.start;
    const ms = slept - woke;
    if (ms <= 0 || ms > MAX_WAKE_MS) continue;
    const sleepsAtNight = inAnyNight(slept, settings);
    if (inAnyNight(woke, settings) && sleepsAtNight) continue;
    const dayKey = dayKeyFor(new Date(woke).toISOString(), settings.timeZone, settings.dayStartMinutes);
    const previous = windows.at(-1);
    const order = previous && previous.dayKey === dayKey && !previous.beforeBed ? previous.order + 1 : 1;
    windows.push({ dayKey, start: woke, ms, order, beforeBed: sleepsAtNight });
  }
  return windows;
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

const duration = (ms: number) => formatDuration(ms, { seconds: false });

export function durationChange(current: number, previous: number): string {
  const delta = Math.round((current - previous) / MINUTE_MS) * MINUTE_MS;
  if (delta === 0) return 'Same';
  return `${delta > 0 ? '+' : '−'}${duration(Math.abs(delta))}`;
}

export function countChange(current: number, previous: number): string {
  const delta = Math.round((current - previous) * 10) / 10;
  if (delta === 0) return 'Same';
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`;
}

const ORDINALS = ['First of the day', 'Second', 'Third', 'Fourth', 'Fifth'];

export function wakeWindowCard(windows: readonly WakeWindow[], dayKeys: readonly string[]): StatsCard | null {
  const recent = new Set(dayKeys.slice(-7));
  const earlier = new Set(dayKeys.slice(-14, -7));
  const thisWeek = windows.filter((window) => recent.has(window.dayKey));
  const typical = median(thisWeek.map((window) => window.ms));
  if (typical === null || thisWeek.length < MIN_WINDOWS) return null;
  const before = median(windows.filter((window) => earlier.has(window.dayKey)).map((window) => window.ms));

  const figures = [{ label: 'Typical', value: duration(typical) }];
  if (before !== null) figures.push({ label: 'On last week', value: durationChange(typical, before) });
  ORDINALS.forEach((label, index) => {
    const sample = thisWeek.filter((window) => window.order === index + 1 && !window.beforeBed);
    const value = median(sample.map((window) => window.ms));
    if (value !== null && sample.length >= MIN_SAMPLES) figures.push({ label, value: duration(value) });
  });
  const bedtime = thisWeek.filter((window) => window.beforeBed);
  const beforeBed = median(bedtime.map((window) => window.ms));
  if (beforeBed !== null && bedtime.length >= MIN_SAMPLES)
    figures.push({ label: 'Before bed', value: duration(beforeBed) });

  const bars = dayKeys.slice(-14).map((dayKey) => ({
    label: dayKey,
    values: [Math.round((median(windows.filter((w) => w.dayKey === dayKey).map((w) => w.ms)) ?? 0) / MINUTE_MS)],
  }));
  return {
    key: 'wake',
    title: 'Wake windows',
    plus: true,
    figures,
    chart: {
      unit: 'min',
      series: ['Typical awake time'],
      legend: [0],
      bars,
      max: Math.max(0, ...bars.map((bar) => bar.values[0]!)),
      weekly: false,
    },
  };
}

export function nightSleepCard(nights: readonly NightStat[], dayKeys: readonly string[]): StatsCard | null {
  if (nights.length === 0) return null;
  const recent = new Set(dayKeys.slice(-7));
  const earlier = new Set(dayKeys.slice(-14, -7));
  const thisWeek = nights.filter((night) => recent.has(night.dayKey));
  const lastWeek = nights.filter((night) => earlier.has(night.dayKey));
  const average = (list: readonly NightStat[], pick: (night: NightStat) => number) =>
    list.length ? list.reduce((total, night) => total + pick(night), 0) / list.length : null;
  const longest = average(thisWeek, (night) => night.longestMs);
  const longestBefore = average(lastWeek, (night) => night.longestMs);
  const latest = nights.at(-1)!;

  const figures = [{ label: 'Longest stretch, last night', value: duration(latest.longestMs) }];
  if (longest !== null) figures.push({ label: 'Longest stretch, average', value: duration(longest) });
  if (longest !== null && longestBefore !== null)
    figures.push({ label: 'On last week', value: durationChange(longest, longestBefore) });
  const wakeUps = average(thisWeek, (night) => night.wakeUps);
  if (wakeUps !== null) figures.push({ label: 'Wake-ups a night', value: String(Math.round(wakeUps * 10) / 10) });
  const sleep = average(thisWeek, (night) => night.sleepMs);
  if (sleep !== null) figures.push({ label: 'Night sleep', value: duration(sleep) });

  const byKey = new Map(nights.map((night) => [night.dayKey, night]));
  const bars = dayKeys.slice(-14).map((dayKey) => ({
    label: dayKey,
    values: [Math.round(((byKey.get(dayKey)?.longestMs ?? 0) / HOUR_MS) * 10) / 10],
  }));
  return {
    key: 'night',
    title: 'Night sleep',
    plus: true,
    figures,
    chart: {
      unit: 'h',
      series: ['Longest stretch'],
      legend: [0],
      bars,
      max: Math.max(0, ...bars.map((bar) => bar.values[0]!)),
      weekly: false,
    },
  };
}

export interface WeeklyRow {
  label: string;
  value: string;
  change: string | null;
  trend: 'up' | 'down' | 'same' | null;
}

export interface WeeklySummary {
  rows: WeeklyRow[];
  takeaway: string;
}

interface Metric {
  label: string;
  phrase: string;
  current: number | null;
  previous: number | null;
  kind: 'duration' | 'count';
}

export function weeklySummary(
  thisWeek: readonly DaySummary[],
  lastWeek: readonly DaySummary[],
  nights: readonly NightStat[],
  windows: readonly WakeWindow[],
  dayKeys: readonly string[],
): WeeklySummary | null {
  if (thisWeek.length === 0) return null;
  const mean = (list: readonly DaySummary[], pick: (day: DaySummary) => number) =>
    list.length ? list.reduce((total, day) => total + pick(day), 0) / list.length : null;
  const recent = new Set(dayKeys.slice(-7));
  const earlier = new Set(dayKeys.slice(-14, -7));
  const nightMean = (keys: Set<string>) => {
    const list = nights.filter((night) => keys.has(night.dayKey));
    return list.length ? list.reduce((total, night) => total + night.longestMs, 0) / list.length : null;
  };
  const wakeMedian = (keys: Set<string>) => median(windows.filter((w) => keys.has(w.dayKey)).map((w) => w.ms));

  const metrics: Metric[] = [
    {
      label: 'Sleep a day',
      phrase: 'Sleep a day',
      current: mean(thisWeek, (day) => day.sleepMs),
      previous: mean(lastWeek, (day) => day.sleepMs),
      kind: 'duration',
    },
    {
      label: 'Longest night stretch',
      phrase: 'The longest night stretch',
      current: nightMean(recent),
      previous: nightMean(earlier),
      kind: 'duration',
    },
    {
      label: 'Typical wake window',
      phrase: 'The typical wake window',
      current: wakeMedian(recent),
      previous: wakeMedian(earlier),
      kind: 'duration',
    },
    {
      label: 'Naps a day',
      phrase: 'Naps a day',
      current: mean(thisWeek, (day) => day.naps),
      previous: mean(lastWeek, (day) => day.naps),
      kind: 'count',
    },
    {
      label: 'Feeds a day',
      phrase: 'Feeds a day',
      current: mean(thisWeek, (day) => day.feeds + day.bottles),
      previous: mean(lastWeek, (day) => day.feeds + day.bottles),
      kind: 'count',
    },
    {
      label: 'Nappies a day',
      phrase: 'Nappies a day',
      current: mean(thisWeek, (day) => day.nappies),
      previous: mean(lastWeek, (day) => day.nappies),
      kind: 'count',
    },
  ];

  const rows = metrics.flatMap((metric): WeeklyRow[] => {
    if (metric.current === null) return [];
    const value = metric.kind === 'duration' ? duration(metric.current) : String(Math.round(metric.current * 10) / 10);
    if (metric.previous === null) return [{ label: metric.label, value, change: null, trend: null }];
    const change =
      metric.kind === 'duration'
        ? durationChange(metric.current, metric.previous)
        : countChange(metric.current, metric.previous);
    const trend = change === 'Same' ? 'same' : metric.current > metric.previous ? 'up' : 'down';
    return [{ label: metric.label, value, change, trend }];
  });

  return { rows, takeaway: takeaway(metrics, lastWeek.length > 0) };
}

function takeaway(metrics: readonly Metric[], compared: boolean): string {
  if (!compared) return 'Comparisons with last week start once there are two weeks of entries.';
  const sleepMetrics = metrics.filter((metric) => metric.kind === 'duration');
  let best: { metric: Metric; change: number } | null = null;
  for (const metric of sleepMetrics) {
    if (metric.current === null || metric.previous === null || metric.previous === 0) continue;
    const change = (metric.current - metric.previous) / metric.previous;
    if (Math.abs(change) >= 0.1 && (!best || Math.abs(change) > Math.abs(best.change))) best = { metric, change };
  }
  if (!best) return 'A steady week: sleep looks much the same as last week.';
  const { metric } = best;
  const amount = duration(Math.abs(Math.round((metric.current! - metric.previous!) / MINUTE_MS) * MINUTE_MS));
  return `${metric.phrase} is ${best.change > 0 ? 'up' : 'down'} ${amount} on last week.`;
}

export const INSIGHT_DAYS = 14;

export const PATTERNS_CAPTION = `From the last ${INSIGHT_DAYS} finished days. The range below doesn't change these.`;

export function insightDays(todayKey: string): string[] {
  return lastDays(shiftDay(todayKey, -1), INSIGHT_DAYS);
}

export function insightsSince(todayKey: string, settings: InsightSettings): string {
  const first = shiftDay(insightDays(todayKey)[0]!, -FEED_TREND_DAYS);
  return dayWindow(first, settings.timeZone, settings.dayStartMinutes).start.toISOString();
}

export interface FeedStat {
  dayKey: string;
  leftMs: number;
  rightMs: number;
  idleMs: number | null;
}

export const FEED_TREND_DAYS = 7;

export function feedStats(
  events: readonly BabyEvent[],
  now: Date,
  settings: Pick<InsightSettings, 'timeZone' | 'dayStartMinutes'> & { mergeGapMs: number },
): FeedStat[] {
  return events.flatMap((event) => {
    if (event.type !== 'breast_feed' || event.deletedAt || !event.endedAt) return [];
    if (event.segments.length === 0) return [];
    const summary = summariseSegments(event.segments, { mergeGapMs: settings.mergeGapMs, now });
    return [
      {
        dayKey: dayKeyFor(event.startedAt, settings.timeZone, settings.dayStartMinutes),
        leftMs: summary.leftMs,
        rightMs: summary.rightMs,
        // Huckleberry records how long each side lasted but not the pauses.
        idleMs: event.source === 'huckleberry_csv' ? null : summary.downtimeMs,
      },
    ];
  });
}

interface FeedAverage {
  count: number;
  leftMs: number;
  rightMs: number;
  idleMs: number;
  totalMs: number;
  idleKnown: 'all' | 'some' | 'none';
}

function averageFeed(feeds: readonly FeedStat[]): FeedAverage | null {
  if (feeds.length === 0) return null;
  const mean = (pick: (feed: FeedStat) => number) =>
    feeds.reduce((total, feed) => total + pick(feed), 0) / feeds.length;
  const leftMs = mean((feed) => feed.leftMs);
  const rightMs = mean((feed) => feed.rightMs);
  const idles = feeds.flatMap((feed) => (feed.idleMs === null ? [] : [feed.idleMs]));
  const idleMs = idles.length ? idles.reduce((total, idle) => total + idle, 0) / idles.length : 0;
  const idleKnown = idles.length === feeds.length ? 'all' : idles.length ? 'some' : 'none';
  return { count: feeds.length, leftMs, rightMs, idleMs, totalMs: leftMs + rightMs + idleMs, idleKnown };
}

const feedsWithin = (feeds: readonly FeedStat[], keys: readonly string[]) => {
  const within = new Set(keys);
  return feeds.filter((feed) => within.has(feed.dayKey));
};

export function feedTrendCard(feeds: readonly FeedStat[], dayKeys: readonly string[]): StatsCard | null {
  const recent = feedsWithin(feeds, dayKeys.slice(-FEED_TREND_DAYS));
  const thisWeek = averageFeed(recent);
  if (!thisWeek || thisWeek.count < MIN_SAMPLES) return null;
  const earlier = averageFeed(feedsWithin(feeds, dayKeys.slice(-2 * FEED_TREND_DAYS, -FEED_TREND_DAYS)));
  const feedingDays = new Set(recent.map((feed) => feed.dayKey)).size;
  const activeMs = recent.reduce((total, feed) => total + feed.leftMs + feed.rightMs, 0);

  const figures = [
    { label: 'Per feed', value: duration(thisWeek.totalMs) },
    { label: 'Left', value: duration(thisWeek.leftMs) },
    { label: 'Right', value: duration(thisWeek.rightMs) },
    { label: 'Idle', value: thisWeek.idleKnown === 'none' ? '—' : duration(thisWeek.idleMs) },
    { label: 'Feeding a day', value: duration(activeMs / feedingDays) },
  ];
  if (earlier && earlier.count >= MIN_SAMPLES) {
    const comparable = thisWeek.idleKnown === 'all' && earlier.idleKnown === 'all';
    const feeding = (average: FeedAverage) => (comparable ? average.totalMs : average.leftMs + average.rightMs);
    figures.push({ label: 'On last week', value: durationChange(feeding(thisWeek), feeding(earlier)) });
  }

  const minutes = (value: number) => Math.round((value / MINUTE_MS) * 10) / 10;
  const bars = dayKeys.slice(-INSIGHT_DAYS).map((dayKey) => {
    const average = averageFeed(feedsWithin(feeds, lastDays(dayKey, FEED_TREND_DAYS)));
    return {
      label: dayKey,
      values: average ? [minutes(average.leftMs), minutes(average.rightMs), minutes(average.idleMs)] : [0, 0, 0],
    };
  });
  return {
    key: 'feed-trend',
    title: 'Breastfeeds',
    note: feeds.some((feed) => feed.idleMs === null)
      ? "Each bar is the average feed over the 7 days up to that day. Huckleberry doesn't record pauses, so idle time only counts feeds logged in babble."
      : 'Each bar is the average feed over the 7 days up to that day.',
    plus: true,
    figures,
    chart: {
      unit: 'min',
      series: ['Left', 'Right', 'Idle'],
      legend: [0, 1, 2],
      bars,
      max: Math.max(0, ...bars.map((bar) => bar.values.reduce((sum, value) => sum + value, 0))),
      weekly: false,
    },
  };
}

export interface FeedGap {
  dayKey: string;
  ms: number;
  night: boolean;
}

export const TOP_UP_MS = 20 * MINUTE_MS;

export function feedGaps(events: readonly BabyEvent[], settings: InsightSettings): FeedGap[] {
  const feeds = events
    .filter((event) => (event.type === 'breast_feed' || event.type === 'bottle') && !event.deletedAt)
    .map((event) => ({ start: Date.parse(event.startedAt), end: Date.parse(event.endedAt ?? event.startedAt) }))
    .sort((a, b) => a.start - b.start);
  const gaps: FeedGap[] = [];
  let previous = feeds[0];
  for (const feed of feeds.slice(1)) {
    if (!previous) break;
    if (feed.start - previous.end <= TOP_UP_MS) {
      previous = { start: previous.start, end: Math.max(previous.end, feed.end) };
      continue;
    }
    const ms = feed.start - previous.start;
    if (ms < MAX_GAP_MS) {
      const nightKey = nightKeyOf(previous.start, settings);
      const dayKey =
        nightKey ?? dayKeyFor(new Date(previous.start).toISOString(), settings.timeZone, settings.dayStartMinutes);
      gaps.push({ dayKey, ms, night: nightKey !== null });
    }
    previous = feed;
  }
  return gaps;
}

export function feedSpacingCard(gaps: readonly FeedGap[], dayKeys: readonly string[]): StatsCard | null {
  const recent = new Set(dayKeys.slice(-7));
  const earlier = new Set(dayKeys.slice(-14, -7));
  const sample = (night: boolean, keys: Set<string>) =>
    gaps.filter((gap) => gap.night === night && keys.has(gap.dayKey)).map((gap) => gap.ms);
  const daytime = sample(false, recent);
  const typical = median(daytime);
  if (typical === null || daytime.length < MIN_WINDOWS) return null;

  const figures = [{ label: 'Daytime', value: duration(typical) }];
  const before = sample(false, earlier);
  if (before.length >= MIN_SAMPLES)
    figures.push({ label: 'On last week', value: durationChange(typical, median(before)!) });
  const overnight = sample(true, recent);
  if (overnight.length >= MIN_SAMPLES) figures.push({ label: 'Overnight', value: duration(median(overnight)!) });
  const lastNight = sample(true, new Set(dayKeys.slice(-1)));
  if (lastNight.length > 0) figures.push({ label: 'Longest, last night', value: duration(Math.max(...lastNight)) });

  const bars = dayKeys.slice(-INSIGHT_DAYS).map((dayKey) => {
    const value = median(sample(false, new Set([dayKey]))) ?? 0;
    return { label: dayKey, values: [Math.round((value / HOUR_MS) * 10) / 10] };
  });
  return {
    key: 'feed-spacing',
    title: 'Feed spacing',
    note: 'Gaps run from the start of one feed to the start of the next. A top-up within 20 minutes counts as the same feed.',
    plus: true,
    figures,
    chart: {
      unit: 'h',
      series: ['Typical daytime gap'],
      legend: [0],
      bars,
      max: Math.max(0, ...bars.map((bar) => bar.values[0]!)),
      weekly: false,
    },
  };
}

export interface FeedCluster {
  dayKey: string;
  start: number;
  end: number;
  feeds: number;
}

export const CLUSTER_GAP_MS = 45 * MINUTE_MS;
export const CLUSTER_MIN_FEEDS = 3;
export const CLUSTER_MIN_SPAN_MS = 90 * MINUTE_MS;
const SAME_FEED_MS = 5 * MINUTE_MS;

function joinedFeeds(events: readonly BabyEvent[]): Span[] {
  const feeds = events
    .filter((event) => (event.type === 'breast_feed' || event.type === 'bottle') && !event.deletedAt)
    .map((event) => ({ start: Date.parse(event.startedAt), end: Date.parse(event.endedAt ?? event.startedAt) }))
    .sort((a, b) => a.start - b.start);
  const joined: Span[] = [];
  for (const feed of feeds) {
    const last = joined.at(-1);
    if (last && feed.start - last.end <= SAME_FEED_MS) last.end = Math.max(last.end, feed.end);
    else joined.push({ ...feed });
  }
  return joined;
}

const dayKeyOf = (instant: number, settings: InsightSettings) =>
  dayKeyFor(new Date(instant).toISOString(), settings.timeZone, settings.dayStartMinutes);

export function feedClusters(events: readonly BabyEvent[], settings: InsightSettings): FeedCluster[] {
  const clusters: FeedCluster[] = [];
  let run: Span[] = [];
  const close = () => {
    const first = run[0];
    const last = run.at(-1);
    if (first && last && run.length >= CLUSTER_MIN_FEEDS && last.end - first.start >= CLUSTER_MIN_SPAN_MS) {
      clusters.push({ dayKey: dayKeyOf(first.start, settings), start: first.start, end: last.end, feeds: run.length });
    }
  };
  for (const feed of joinedFeeds(events)) {
    const previous = run.at(-1);
    if (previous && feed.start - previous.end <= CLUSTER_GAP_MS) {
      run.push(feed);
    } else {
      close();
      run = [feed];
    }
  }
  close();
  return clusters;
}

function usualStart(clusters: readonly FeedCluster[], settings: InsightSettings): string | null {
  const fromDayStart = clusters.map(
    (cluster) => (minutesOfDay(new Date(cluster.start), settings.timeZone) - settings.dayStartMinutes + 1440) % 1440,
  );
  const typical = median(fromDayStart);
  if (typical === null) return null;
  return `Around ${minutesToClock(Math.round(typical / 15) * 15 + settings.dayStartMinutes)}`;
}

export function clusterFeedingCard(
  events: readonly BabyEvent[],
  dayKeys: readonly string[],
  settings: InsightSettings,
): StatsCard | null {
  const recent = new Set(dayKeys.slice(-7));
  const earlier = new Set(dayKeys.slice(-14, -7));
  const feeds = joinedFeeds(events).map((feed) => dayKeyOf(feed.start, settings));
  if (feeds.filter((dayKey) => recent.has(dayKey)).length < MIN_WINDOWS) return null;

  const clusters = feedClusters(events, settings).filter((cluster) => dayKeys.includes(cluster.dayKey));
  const daysWith = (keys: Set<string>) => new Set(clusters.filter((c) => keys.has(c.dayKey)).map((c) => c.dayKey)).size;
  const thisWeek = daysWith(recent);
  const figures = [{ label: 'Last 7 days', value: `${thisWeek} ${thisWeek === 1 ? 'day' : 'days'}` }];
  if (feeds.some((dayKey) => earlier.has(dayKey)))
    figures.push({ label: 'On last week', value: countChange(thisWeek, daysWith(earlier)) });
  const usually = clusters.length >= 2 ? usualStart(clusters, settings) : null;
  if (usually) figures.push({ label: 'Usually starts', value: usually });
  const longest = clusters
    .filter((cluster) => recent.has(cluster.dayKey))
    .sort((a, b) => b.end - b.start - (a.end - a.start))[0];
  if (longest) {
    figures.push({
      label: 'Longest this week',
      value: `${longest.feeds} feeds over ${formatDurationShort(longest.end - longest.start)}`,
    });
  }

  const bars = dayKeys.slice(-INSIGHT_DAYS).map((dayKey) => {
    const ms = clusters
      .filter((cluster) => cluster.dayKey === dayKey)
      .reduce((total, cluster) => total + cluster.end - cluster.start, 0);
    return { label: dayKey, values: [Math.round((ms / HOUR_MS) * 10) / 10] };
  });
  return {
    key: 'cluster-feeds',
    title: 'Cluster feeding',
    note: 'A cluster is 3 or more feeds, each starting within 45 minutes of the last one ending, over at least 1h 30m. It is common, especially in the evening and during growth spurts.',
    plus: true,
    figures,
    chart: {
      unit: 'h',
      series: ['Time cluster feeding'],
      legend: [0],
      bars,
      max: Math.max(0, ...bars.map((bar) => bar.values[0]!)),
      weekly: false,
    },
  };
}

export interface InsightsReport {
  feeds: StatsCard | null;
  spacing: StatsCard | null;
  clusters: StatsCard | null;
  wake: StatsCard | null;
  night: StatsCard | null;
  weekly: WeeklySummary | null;
}

export function insightsReport(
  events: readonly BabyEvent[],
  todayKey: string,
  now: Date,
  settings: InsightSettings & { mergeGapMs: number },
): InsightsReport {
  const keys = insightDays(todayKey);
  const spans = sleepSpans(events, now);
  const nights = nightStats(spans, keys, now, settings);
  const windows = wakeWindows(spans, settings);
  const logged = events.filter((event) => !event.deletedAt);
  const summaries = bucketByDay(logged, keys, settings.timeZone, settings.dayStartMinutes, now)
    .filter((day) => day.events.length > 0)
    .map((day) => ({
      dayKey: day.dayKey,
      summary: summariseDay(day.events, day.window, {
        now,
        mergeGapMs: settings.mergeGapMs,
        night: nightOf(settings, day.dayKey),
      }),
    }));
  const recent = new Set(keys.slice(-7));
  const thisWeek = summaries.filter((day) => recent.has(day.dayKey)).map((day) => day.summary);
  const lastWeek = summaries.filter((day) => !recent.has(day.dayKey)).map((day) => day.summary);
  return {
    feeds: feedTrendCard(feedStats(events, now, settings), keys),
    spacing: feedSpacingCard(feedGaps(events, settings), keys),
    clusters: clusterFeedingCard(events, keys, settings),
    wake: wakeWindowCard(windows, keys),
    night: nightSleepCard(nights, keys),
    weekly: weeklySummary(thisWeek, lastWeek, nights, windows, keys),
  };
}
