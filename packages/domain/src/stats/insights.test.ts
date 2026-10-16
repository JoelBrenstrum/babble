import { describe, expect, it } from 'vitest';
import type { DaySummary } from '../events/day-summary';
import { makeEvent } from '../events/test-events';
import { lastDays } from '../timeline/days';
import { barReadout } from './charts';
import {
  clusterFeedingCard,
  durationChange,
  feedClusters,
  feedGaps,
  feedSpacingCard,
  feedStats,
  feedTrendCard,
  insightDays,
  insightsReport,
  insightsSince,
  median,
  nightSleepCard,
  nightStats,
  sleepSpans,
  wakeWindowCard,
  wakeWindows,
  weeklySummary,
  type InsightSettings,
} from './insights';

const settings: InsightSettings = {
  timeZone: 'UTC',
  dayStartMinutes: 0,
  nightStartMinutes: 19 * 60,
  nightEndMinutes: 7 * 60,
};

const HOUR = 3_600_000;

function sleep(id: string, start: string, end: string | null) {
  return makeEvent('sleep', { id, startedAt: start, endedAt: end });
}

function day(dayKey: string, nightSplit = '01:30') {
  const next = new Date(Date.parse(`${dayKey}T00:00:00Z`) + 24 * HOUR).toISOString().slice(0, 10);
  return [
    sleep(`${dayKey}-a`, `${dayKey}T08:30:00Z`, `${dayKey}T09:30:00Z`),
    sleep(`${dayKey}-b`, `${dayKey}T12:00:00Z`, `${dayKey}T13:30:00Z`),
    sleep(`${dayKey}-c`, `${dayKey}T16:00:00Z`, `${dayKey}T16:45:00Z`),
    sleep(`${dayKey}-n1`, `${dayKey}T19:30:00Z`, `${next}T${nightSplit}:00Z`),
    sleep(`${dayKey}-n2`, `${next}T02:00:00Z`, `${next}T06:30:00Z`),
  ];
}

describe('sleepSpans', () => {
  it('joins sleeps a few minutes apart and skips deleted ones', () => {
    const spans = sleepSpans(
      [
        sleep('a', '2026-10-06T10:00:00Z', '2026-10-06T10:30:00Z'),
        sleep('b', '2026-10-06T10:33:00Z', '2026-10-06T11:00:00Z'),
        { ...sleep('c', '2026-10-06T12:00:00Z', '2026-10-06T13:00:00Z'), deletedAt: '2026-10-06T13:00:00Z' },
        makeEvent('nappy', { startedAt: '2026-10-06T12:00:00Z' }),
      ],
      new Date('2026-10-06T14:00:00Z'),
    );
    expect(spans).toEqual([{ start: Date.parse('2026-10-06T10:00:00Z'), end: Date.parse('2026-10-06T11:00:00Z') }]);
  });

  it('runs a sleep still going up to now', () => {
    const now = new Date('2026-10-06T11:00:00Z');
    expect(sleepSpans([sleep('a', '2026-10-06T10:00:00Z', null)], now)[0]!.end).toBe(now.getTime());
  });
});

describe('nightStats', () => {
  const events = [...day('2026-10-06'), ...day('2026-10-07')];
  const spans = sleepSpans(events, new Date('2026-10-08T12:00:00Z'));

  it('finds the longest stretch, night sleep and wake-ups for finished nights', () => {
    const nights = nightStats(spans, ['2026-10-06', '2026-10-07'], new Date('2026-10-08T06:00:00Z'), settings);
    expect(nights).toEqual([{ dayKey: '2026-10-06', longestMs: 6 * HOUR, sleepMs: 10.5 * HOUR, wakeUps: 1 }]);
  });

  it('skips nights with no sleep logged', () => {
    expect(nightStats(spans, ['2026-10-01'], new Date('2026-10-08T12:00:00Z'), settings)).toEqual([]);
  });
});

describe('wakeWindows', () => {
  it('numbers the day’s wake windows, marks the one before bed and leaves out night wakings', () => {
    const spans = sleepSpans(day('2026-10-06'), new Date('2026-10-07T12:00:00Z'));
    const windows = wakeWindows(spans, settings);
    expect(windows.map((window) => [window.order, window.ms / HOUR, window.beforeBed])).toEqual([
      [1, 2.5, false],
      [2, 2.5, false],
      [3, 2.75, true],
    ]);
  });

  it('counts the first window after the night as the first of the day', () => {
    const spans = sleepSpans([...day('2026-10-06'), ...day('2026-10-07')], new Date('2026-10-08T12:00:00Z'));
    const first = wakeWindows(spans, settings).find((window) => window.dayKey === '2026-10-07')!;
    expect(first).toMatchObject({ order: 1, ms: 2 * HOUR, beforeBed: false });
  });
});

describe('median', () => {
  it('handles odd, even and empty lists', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe('durationChange', () => {
  it('signs the difference in hours and minutes', () => {
    expect(durationChange(5 * HOUR, 4.5 * HOUR)).toBe('+30m');
    expect(durationChange(4 * HOUR, 5.25 * HOUR)).toBe('−1h 15m');
    expect(durationChange(HOUR, HOUR + 10_000)).toBe('Same');
  });
});

const keys = lastDays('2026-10-14', 14);
const fortnight = keys.flatMap((key, index) => day(key, index < 7 ? '00:30' : '01:30'));
const now = new Date('2026-10-15T12:00:00Z');
const spans = sleepSpans(fortnight, now);

describe('wakeWindowCard', () => {
  it('shows the typical wake window, each one by order and the one before bed', () => {
    const card = wakeWindowCard(wakeWindows(spans, settings), keys)!;
    expect(card.figures).toEqual([
      { label: 'Typical', value: '2h 30m' },
      { label: 'On last week', value: 'Same' },
      { label: 'First of the day', value: '2h 00m' },
      { label: 'Second', value: '2h 30m' },
      { label: 'Third', value: '2h 30m' },
      { label: 'Before bed', value: '2h 45m' },
    ]);
    expect(card.chart.bars).toHaveLength(14);
    expect(card.chart.unit).toBe('min');
  });

  it('waits for a few wake windows before showing', () => {
    expect(wakeWindowCard(wakeWindows(sleepSpans(day('2026-10-14'), now), settings), keys)).toBeNull();
  });
});

describe('nightSleepCard', () => {
  it('compares the longest stretch with last week and charts it per night', () => {
    const nights = nightStats(spans, keys, now, settings);
    const card = nightSleepCard(nights, keys)!;
    expect(card.figures).toEqual([
      { label: 'Longest stretch, last night', value: '6h 00m' },
      { label: 'Longest stretch, average', value: '6h 00m' },
      { label: 'On last week', value: '+1h 00m' },
      { label: 'Wake-ups a night', value: '1' },
      { label: 'Night sleep', value: '10h 30m' },
    ]);
    expect(card.chart.bars.map((bar) => bar.values[0])).toEqual([...Array(7).fill(5), ...Array(7).fill(6)]);
  });

  it('is empty without any nights', () => {
    expect(nightSleepCard([], keys)).toBeNull();
  });
});

describe('weeklySummary', () => {
  const summary = (overrides: Partial<DaySummary>): DaySummary =>
    ({ sleepMs: 14 * HOUR, naps: 3, feeds: 6, bottles: 2, nappies: 7, ...overrides }) as DaySummary;

  it('compares this week with last week and leads with the biggest sleep change', () => {
    const nights = nightStats(spans, keys, now, settings);
    const windows = wakeWindows(spans, settings);
    const result = weeklySummary([summary({})], [summary({ feeds: 7 })], nights, windows, keys)!;
    expect(result.rows).toContainEqual({
      label: 'Longest night stretch',
      value: '6h 00m',
      change: '+1h 00m',
      trend: 'up',
    });
    expect(result.rows).toContainEqual({ label: 'Feeds a day', value: '8', change: '−1', trend: 'down' });
    expect(result.rows).toContainEqual({ label: 'Sleep a day', value: '14h 00m', change: 'Same', trend: 'same' });
    expect(result.takeaway).toBe('The longest night stretch is up 1h 00m on last week.');
  });

  it('explains that comparisons need two weeks', () => {
    const result = weeklySummary([summary({})], [], [], [], keys)!;
    expect(result.rows.every((row) => row.change === null)).toBe(true);
    expect(result.takeaway).toBe('Comparisons with last week start once there are two weeks of entries.');
  });

  it('calls a week with no big change steady', () => {
    expect(weeklySummary([summary({})], [summary({})], [], [], keys)!.takeaway).toBe(
      'A steady week: sleep looks much the same as last week.',
    );
  });
});

describe('insightsReport', () => {
  it('builds every insight from two weeks of finished days', () => {
    const report = insightsReport(fortnight, '2026-10-15', now, { ...settings, mergeGapMs: 15_000 });
    expect(report.wake?.title).toBe('Wake windows');
    expect(report.night?.figures[0]).toEqual({ label: 'Longest stretch, last night', value: '6h 00m' });
    expect(report.weekly?.rows.find((row) => row.label === 'Naps a day')).toMatchObject({ value: '3', change: 'Same' });
  });

  it('covers the fourteen days before today, fetching a week earlier for the feed trend', () => {
    expect(insightDays('2026-10-15')).toEqual(keys);
    expect(insightsSince('2026-10-15', settings)).toBe('2026-09-24T00:00:00.000Z');
  });
});

function feed(id: string, start: string, sides: { side: 'left' | 'right'; from: number; to: number }[]) {
  const at = (minutes: number) => new Date(Date.parse(start) + minutes * 60_000).toISOString();
  return makeEvent('breast_feed', {
    id,
    startedAt: start,
    endedAt: at(Math.max(...sides.map((side) => side.to))),
    segments: sides.map((side) => ({ side: side.side, startedAt: at(side.from), endedAt: at(side.to) })),
  });
}

describe('feed trend', () => {
  const now = new Date('2026-10-15T12:00:00Z');
  const scope = { timeZone: 'UTC', dayStartMinutes: 0, mergeGapMs: 15_000 };

  it('splits each finished breastfeed into left, right and idle time, with no idle for Huckleberry imports', () => {
    const events = [
      feed('a', '2026-10-10T08:00:00Z', [
        { side: 'left', from: 0, to: 10 },
        { side: 'right', from: 12, to: 20 },
      ]),
      { ...feed('b', '2026-10-10T09:00:00Z', [{ side: 'left', from: 0, to: 5 }]), source: 'huckleberry_csv' as const },
      { ...feed('c', '2026-10-10T10:00:00Z', [{ side: 'left', from: 0, to: 5 }]), endedAt: null },
      { ...feed('d', '2026-10-10T11:00:00Z', [{ side: 'left', from: 0, to: 5 }]), deletedAt: '2026-10-10T12:00:00Z' },
      { ...feed('e', '2026-10-11T08:00:00Z', [{ side: 'right', from: 0, to: 6 }]), source: 'babble_export' as const },
    ];
    expect(feedStats(events, now, scope)).toEqual([
      { dayKey: '2026-10-10', leftMs: 10 * 60_000, rightMs: 8 * 60_000, idleMs: 2 * 60_000 },
      { dayKey: '2026-10-10', leftMs: 5 * 60_000, rightMs: 0, idleMs: null },
      { dayKey: '2026-10-11', leftMs: 0, rightMs: 6 * 60_000, idleMs: 0 },
    ]);
  });

  it('averages the last 7 days per feed, compares with the week before and charts a rolling average', () => {
    const stat = (dayKey: string, left: number, right: number, idle: number) => ({
      dayKey,
      leftMs: left * 60_000,
      rightMs: right * 60_000,
      idleMs: idle * 60_000,
    });
    const feeds = [
      stat('2026-10-02', 10, 10, 0),
      stat('2026-10-03', 10, 10, 0),
      stat('2026-10-04', 10, 10, 0),
      stat('2026-10-12', 12, 8, 2),
      stat('2026-10-12', 12, 8, 2),
      stat('2026-10-14', 12, 14, 2),
    ];
    const card = feedTrendCard(feeds, keys)!;
    expect(card.figures).toEqual([
      { label: 'Per feed', value: '24m' },
      { label: 'Left', value: '12m' },
      { label: 'Right', value: '10m' },
      { label: 'Idle', value: '2m' },
      { label: 'Feeding a day', value: '33m' },
      { label: 'On last week', value: '+4m' },
    ]);
    expect(card.chart.bars).toHaveLength(14);
    expect(card.chart.bars.at(-1)).toEqual({ label: '2026-10-14', values: [12, 10, 2] });
    expect(card.chart.bars.find((bar) => bar.label === '2026-10-11')!.values).toEqual([0, 0, 0]);
    expect(card.chart.bars.find((bar) => bar.label === '2026-10-05')!.values).toEqual([10, 10, 0]);
  });

  it('averages idle over feeds that record pauses and compares feeding time when a week has imports', () => {
    const stat = (dayKey: string, left: number, right: number, idle: number | null) => ({
      dayKey,
      leftMs: left * 60_000,
      rightMs: right * 60_000,
      idleMs: idle === null ? null : idle * 60_000,
    });
    const feeds = [
      stat('2026-10-02', 10, 10, null),
      stat('2026-10-03', 10, 10, null),
      stat('2026-10-04', 10, 10, null),
      stat('2026-10-12', 12, 8, null),
      stat('2026-10-13', 12, 8, 4),
      stat('2026-10-14', 12, 8, 2),
    ];
    const card = feedTrendCard(feeds, keys)!;
    expect(card.figures).toEqual([
      { label: 'Per feed', value: '23m' },
      { label: 'Left', value: '12m' },
      { label: 'Right', value: '8m' },
      { label: 'Idle', value: '3m' },
      { label: 'Feeding a day', value: '20m' },
      { label: 'On last week', value: 'Same' },
    ]);
    expect(card.chart.bars.find((bar) => bar.label === '2026-10-05')!.values).toEqual([10, 10, 0]);
    expect(card.note).toMatch(/Huckleberry doesn't record pauses/);
  });

  it('shows no idle time for a week of Huckleberry imports', () => {
    const imported = ['2026-10-12', '2026-10-13', '2026-10-14'].map((dayKey) => ({
      dayKey,
      leftMs: 10 * 60_000,
      rightMs: 10 * 60_000,
      idleMs: null,
    }));
    const card = feedTrendCard(imported, keys)!;
    expect(card.figures.find((figure) => figure.label === 'Idle')!.value).toBe('—');
    expect(card.figures[0]).toEqual({ label: 'Per feed', value: '20m' });
  });

  it('needs at least three feeds in the last week', () => {
    expect(feedTrendCard([{ dayKey: '2026-10-14', leftMs: 60_000, rightMs: 60_000, idleMs: 0 }], keys)).toBeNull();
  });
});

describe('feed spacing', () => {
  const keys = insightDays('2026-10-15');
  const gap = (dayKey: string, hours: number, night = false) => ({ dayKey, ms: hours * HOUR, night });

  it('measures start to start between feeds, folds top-ups in and splits day from night', () => {
    const breast = (id: string, start: string, end: string) =>
      makeEvent('breast_feed', { id, startedAt: start, endedAt: end });
    const bottle = (id: string, start: string) => makeEvent('bottle', { id, startedAt: start, endedAt: null });
    const events = [
      breast('a', '2026-10-13T08:00:00Z', '2026-10-13T08:30:00Z'),
      bottle('top-up', '2026-10-13T08:40:00Z'),
      breast('b', '2026-10-13T11:00:00Z', '2026-10-13T11:20:00Z'),
      { ...bottle('deleted', '2026-10-13T12:00:00Z'), deletedAt: '2026-10-13T12:05:00Z' },
      bottle('c', '2026-10-13T14:00:00Z'),
      breast('d', '2026-10-13T20:00:00Z', '2026-10-13T20:20:00Z'),
      breast('e', '2026-10-14T01:00:00Z', '2026-10-14T01:20:00Z'),
      breast('f', '2026-10-14T06:30:00Z', '2026-10-14T06:50:00Z'),
      makeEvent('sleep', { id: 'nap', startedAt: '2026-10-13T09:00:00Z', endedAt: '2026-10-13T10:00:00Z' }),
    ];
    expect(feedGaps(events, settings)).toEqual([
      gap('2026-10-13', 3),
      gap('2026-10-13', 3),
      gap('2026-10-13', 6),
      gap('2026-10-13', 5, true),
      gap('2026-10-13', 5.5, true),
    ]);
  });

  it('shows the typical daytime and overnight gap, last night and the change on last week', () => {
    const gaps = [
      gap('2026-10-05', 2.5),
      gap('2026-10-05', 2.5),
      gap('2026-10-05', 2.5),
      gap('2026-10-12', 3),
      gap('2026-10-12', 3),
      gap('2026-10-13', 3),
      gap('2026-10-13', 4),
      gap('2026-10-14', 3.5),
      gap('2026-10-14', 3.5),
      gap('2026-10-12', 5, true),
      gap('2026-10-13', 4, true),
      gap('2026-10-14', 6, true),
      gap('2026-10-14', 2, true),
    ];
    const card = feedSpacingCard(gaps, keys)!;
    expect(card.figures).toEqual([
      { label: 'Daytime', value: '3h 15m' },
      { label: 'On last week', value: '+45m' },
      { label: 'Overnight', value: '4h 30m' },
      { label: 'Longest, last night', value: '6h 00m' },
    ]);
    expect(card.chart.bars).toHaveLength(14);
    expect(card.chart.bars.at(-1)).toEqual({ label: '2026-10-14', values: [3.5] });
    expect(card.chart.bars.find((bar) => bar.label === '2026-10-11')!.values).toEqual([0]);
    expect(card.chart.bars.find((bar) => bar.label === '2026-10-05')!.values).toEqual([2.5]);
  });

  it('needs six daytime gaps in the last week', () => {
    expect(feedSpacingCard([gap('2026-10-14', 3), gap('2026-10-14', 3), gap('2026-10-14', 3, true)], keys)).toBeNull();
  });
});

describe('cluster feeding', () => {
  const keys = insightDays('2026-10-15');
  const breast = (id: string, start: string, end: string) =>
    makeEvent('breast_feed', { id, startedAt: start, endedAt: end, segments: [] });
  const bottle = (id: string, start: string) => makeEvent('bottle', { id, startedAt: start, endedAt: null });
  const cluster = (dayKey: string, hour: number) =>
    [0, 1, 2, 3].map((index) => {
      const start = Date.parse(`${dayKey}T00:00:00Z`) + hour * HOUR + index * 45 * 60_000;
      return breast(`${dayKey}-c${index}`, new Date(start).toISOString(), new Date(start + 20 * 60_000).toISOString());
    });
  const spaced = (dayKey: string) =>
    [6, 9, 12].map((hour) =>
      breast(
        `${dayKey}-${hour}`,
        `${dayKey}T${String(hour).padStart(2, '0')}:00:00Z`,
        `${dayKey}T${String(hour).padStart(2, '0')}:20:00Z`,
      ),
    );

  it('finds three or more feeds close together over at least an hour and a half', () => {
    const events = [
      breast('a', '2026-10-13T17:00:00Z', '2026-10-13T17:20:00Z'),
      breast('b', '2026-10-13T17:50:00Z', '2026-10-13T18:05:00Z'),
      breast('c', '2026-10-13T18:30:00Z', '2026-10-13T18:45:00Z'),
      breast('d', '2026-10-13T19:10:00Z', '2026-10-13T19:30:00Z'),
      bottle('top-up', '2026-10-13T19:32:00Z'),
      breast('short-1', '2026-10-13T08:00:00Z', '2026-10-13T08:10:00Z'),
      breast('short-2', '2026-10-13T08:30:00Z', '2026-10-13T08:40:00Z'),
      breast('short-3', '2026-10-13T09:00:00Z', '2026-10-13T09:10:00Z'),
      breast('apart', '2026-10-13T12:00:00Z', '2026-10-13T12:20:00Z'),
      { ...bottle('deleted', '2026-10-13T12:50:00Z'), deletedAt: '2026-10-13T13:00:00Z' },
      breast('apart-2', '2026-10-13T14:00:00Z', '2026-10-13T14:20:00Z'),
    ];
    expect(feedClusters(events, settings)).toEqual([
      {
        dayKey: '2026-10-13',
        start: Date.parse('2026-10-13T17:00:00Z'),
        end: Date.parse('2026-10-13T19:32:00Z'),
        feeds: 4,
      },
    ]);
  });

  it('splits a breastfeed at idle breaks of 10 minutes or more', () => {
    const side = (side: 'left' | 'right', start: string, end: string) => ({
      side,
      startedAt: `2026-10-13T${start}:00Z`,
      endedAt: `2026-10-13T${end}:00Z`,
    });
    const onAndOff = makeEvent('breast_feed', {
      id: 'evening',
      startedAt: '2026-10-13T17:00:00Z',
      endedAt: '2026-10-13T19:00:00Z',
      segments: [
        side('left', '17:00', '17:15'),
        side('right', '17:20', '17:30'),
        side('left', '17:50', '18:05'),
        side('right', '18:30', '18:40'),
        side('left', '18:45', '19:00'),
      ],
    });
    expect(feedClusters([onAndOff], settings)).toEqual([
      {
        dayKey: '2026-10-13',
        start: Date.parse('2026-10-13T17:00:00Z'),
        end: Date.parse('2026-10-13T19:00:00Z'),
        feeds: 3,
      },
    ]);
    const steady = { ...onAndOff, segments: [side('left', '17:00', '18:00'), side('right', '18:05', '19:00')] };
    expect(feedClusters([steady], settings)).toEqual([]);
  });

  it('counts the days with a cluster, when they usually start and the longest this week', () => {
    const events = [
      ...keys.flatMap(spaced),
      ...cluster('2026-10-12', 17),
      ...cluster('2026-10-14', 18),
      ...cluster('2026-10-14', 6).slice(0, 2),
    ];
    const card = clusterFeedingCard(events, keys, settings)!;
    expect(card).toMatchObject({ key: 'cluster-feeds', title: 'Cluster feeding', plus: true });
    expect(card.figures).toEqual([
      { label: 'Last 7 days', value: '2 days' },
      { label: 'On last week', value: '+2' },
      { label: 'Usually starts', value: 'Around 5:30 pm' },
      { label: 'Longest this week', value: '4 feeds over 2h 35m' },
    ]);
    expect(card.chart.bars).toHaveLength(14);
    expect(card.chart.bars.at(-1)).toEqual({
      label: '2026-10-14',
      values: [2.6],
      breakdown: ['6:00 pm–8:35 pm, 4 feeds'],
    });
    expect(card.chart.bars.at(-2)).toEqual({ label: '2026-10-13', values: [0] });
  });

  it('stacks each cluster in its day bar and lists when each ran', () => {
    const events = [...keys.flatMap(spaced), ...cluster('2026-10-14', 1), ...cluster('2026-10-14', 15)];
    const card = clusterFeedingCard(events, keys, settings)!;
    const bar = card.chart.bars.at(-1)!;
    expect(bar).toEqual({
      label: '2026-10-14',
      values: [2.6, 2.6],
      breakdown: ['1:00 am–3:35 am, 4 feeds', '3:00 pm–5:35 pm, 4 feeds'],
    });
    expect(card.chart.max).toBe(5.2);
    expect(barReadout(card.chart, bar)).toBe('14 Oct: 5.2h · 1:00 am–3:35 am, 4 feeds · 3:00 pm–5:35 pm, 4 feeds');
  });

  it('shows no clusters as zero days, and needs a week of feeds first', () => {
    const card = clusterFeedingCard(keys.slice(-7).flatMap(spaced), keys, settings)!;
    expect(card.figures).toEqual([{ label: 'Last 7 days', value: '0 days' }]);
    expect(clusterFeedingCard(spaced('2026-10-14'), keys, settings)).toBeNull();
  });
});
