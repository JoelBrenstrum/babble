import type { DaySummary } from '../events/day-summary';
import { summariseSegments } from '../events/session-summary';
import type { BabyEvent, EventOfType, PooColour, Units } from '../events/types';
import { formatDurationShort, formatPerDay } from '../format/duration';
import { formatVolume } from '../format/units';
import { HOUR_MS } from '../time/constants';
import { byStartedAtDesc, ms } from '../time/instants';
import type { TimeWindow } from '../timeline/days';
import { feedTimeSplit } from '../timeline/totals';
import { buildChart, type ChartBar, type StatsChart } from './charts';

export const MAX_GAP_MS = 12 * HOUR_MS;
const hours = formatDurationShort;

export interface StatsSettings {
  timeZone: string;
  dayStartMinutes: number;
  nightStartMinutes: number;
  nightEndMinutes: number;
  mergeGapMs: number;
  units: Units;
}

export interface StatsCard {
  key: 'sleep' | 'feeds' | 'nappies' | 'pump' | 'wake' | 'night';
  title: string;
  figures: { label: string; value: string }[];
  chart: StatsChart;
  colours?: PooColour[];
  plus?: boolean;
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

export interface CardInput {
  counted: DaySummary[];
  single: boolean;
  first: string;
  bars: (pick: (day: DaySummary) => number[]) => ChartBar[];
  range: TimeWindow;
  logged: BabyEvent[];
  now: Date;
  settings: StatsSettings;
  showPump: boolean;
}

export function buildCards({
  counted,
  single,
  first,
  bars,
  range,
  logged,
  now,
  settings,
  showPump,
}: CardInput): StatsCard[] {
  const days = counted.length;
  const daily = (label: string) => (single ? label : `${label} per day`);
  const average = (pick: (day: DaySummary) => number) =>
    days ? counted.reduce((total, day) => total + pick(day), 0) / days : 0;
  const span = (event: BabyEvent) => ({
    start: ms(event.startedAt),
    end: event.endedAt ? ms(event.endedAt) : now.getTime(),
  });

  const wake = gapsBetween(logged.filter((event) => event.type === 'sleep').map(span), range);
  const feedStarts = logged
    .filter((event) => event.type === 'breast_feed' || event.type === 'bottle')
    .map((event) => ({ start: Date.parse(event.startedAt), end: ms(event.startedAt) }));
  const feedGaps = gapsBetween(feedStarts, range);

  const breastFeeds = logged.filter(
    (event): event is EventOfType<'breast_feed'> =>
      event.type === 'breast_feed' &&
      event.source === 'manual' &&
      event.segments.length > 0 &&
      ms(event.startedAt) >= range.start.getTime(),
  );
  const downtimeMs = breastFeeds.reduce(
    (total, feed) => total + summariseSegments(feed.segments, { mergeGapMs: settings.mergeGapMs, now }).downtimeMs,
    0,
  );
  const leftMs = counted.reduce((total, day) => total + day.leftMs, 0);
  const rightMs = counted.reduce((total, day) => total + day.rightMs, 0);
  const sideTotal = leftMs + rightMs;

  const longest = counted.reduce((max, day) => Math.max(max, day.longestSleepMs), 0);
  const colours = logged
    .filter((event): event is EventOfType<'nappy'> => event.type === 'nappy' && event.details.dirty)
    .filter((event) => ms(event.startedAt) >= range.start.getTime())
    .sort(byStartedAtDesc)
    .flatMap((event) => event.details.pooColours.slice(0, 1))
    .slice(0, 14);

  const cards: StatsCard[] = [
    {
      key: 'sleep',
      title: 'Sleep',
      figures: [
        { label: first, value: hours(average((day) => day.sleepMs)) },
        { label: 'Night', value: hours(average((day) => day.nightMs)) },
        { label: daily('Naps'), value: formatPerDay(average((day) => day.naps)) },
        { label: 'Longest stretch', value: longest ? hours(longest) : '—' },
        ...(single ? [] : [{ label: 'Wake window', value: wake.count ? hours(wake.totalMs / wake.count) : '—' }]),
      ],
      chart: buildChart(
        'h',
        ['Night', 'Naps'],
        bars((day) => [day.nightMs / HOUR_MS, day.napMs / HOUR_MS]),
      ),
    },
    {
      key: 'feeds',
      title: 'Feeds',
      figures: [
        { label: first, value: formatPerDay(average((day) => day.feeds)) },
        { label: 'Average gap', value: feedGaps.count ? hours(feedGaps.totalMs / feedGaps.count) : '—' },
        {
          label: 'Left / right',
          value: sideTotal
            ? `${Math.round((leftMs / sideTotal) * 100)}% / ${Math.round((rightMs / sideTotal) * 100)}%`
            : '—',
        },
        ...(single
          ? []
          : [
              {
                label: 'Breast per day',
                value: feedTimeSplit({
                  leftMs: average((day) => day.leftMs),
                  rightMs: average((day) => day.rightMs),
                  idleMs: average((day) => day.idleMs),
                }),
              },
              { label: 'Downtime per feed', value: breastFeeds.length ? hours(downtimeMs / breastFeeds.length) : '—' },
            ]),
        {
          label: daily('Bottle'),
          value: counted.some((day) => day.bottles > 0)
            ? formatVolume(
                average((day) => day.bottleMl),
                settings.units,
              )
            : '—',
        },
      ],
      chart: buildChart(
        '',
        ['Bottle', 'Breast'],
        bars((day) => [day.bottles, day.feeds - day.bottles]),
        [1, 0],
      ),
    },
    {
      key: 'nappies',
      title: 'Nappies',
      figures: [
        { label: daily('Wet'), value: formatPerDay(average((day) => day.wet)) },
        { label: daily('Dirty'), value: formatPerDay(average((day) => day.dirty)) },
      ],
      chart: buildChart(
        '',
        ['Wet', 'Both', 'Dirty'],
        bars((day) => [day.wet - day.both, day.both, day.dirty - day.both]),
      ),
      colours,
    },
  ];

  if (showPump) {
    const pumpLeft = average((day) => day.pumpLeftMl);
    const pumpRight = average((day) => day.pumpRightMl);
    cards.push({
      key: 'pump',
      title: 'Pump',
      figures: [
        {
          label: first,
          value: formatVolume(
            average((day) => day.pumpMl),
            settings.units,
          ),
        },
        { label: daily('Sessions'), value: formatPerDay(average((day) => day.pumps)) },
        {
          label: 'Left / right',
          value: `${formatVolume(pumpLeft, settings.units)} / ${formatVolume(pumpRight, settings.units)}`,
        },
      ],
      chart: buildChart(
        'ml',
        ['Pumped'],
        bars((day) => [day.pumpMl]),
      ),
    });
  }

  return cards;
}
