import { describe, expect, it } from 'vitest';
import type { DaySummary } from '../events/day-summary';
import { makeEvent } from '../events/test-events';
import { lastDays } from '../timeline/days';
import {
  durationChange,
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

  it('covers the fourteen days before today, fetching from the day before', () => {
    expect(insightDays('2026-10-15')).toEqual(keys);
    expect(insightsSince('2026-10-15', settings)).toBe('2026-09-30T00:00:00.000Z');
  });
});
