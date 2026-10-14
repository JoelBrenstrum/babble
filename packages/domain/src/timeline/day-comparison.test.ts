import { describe, expect, it } from 'vitest';
import { summariseDay, summaryOptions } from '../events/day-summary';
import { makeEvent } from '../events/test-events';
import type { BabyEvent } from '../events/types';
import { dayWindow } from '../time/local-time';
import {
  comparisonCutoff,
  comparisonRows,
  comparisonToggleLabel,
  dayComparison,
  previous24hWindow,
  previousDayWindow,
  rollingComparison,
} from './day-comparison';

const baby = { timezone: 'Pacific/Auckland', day_start_minutes: 420, birth_date: '2026-09-01' };
const settings = { downtime_merge_threshold_sec: 30, night_start_minutes: 1140, night_end_minutes: 420 };
const now = new Date('2026-10-08T03:00:00Z');

const sleep = (id: string, startedAt: string, endedAt: string | null) =>
  makeEvent('sleep', { id, startedAt, endedAt, segments: [] });
const bottle = (id: string, at: string) => makeEvent('bottle', { id, startedAt: at, endedAt: at });
const nappy = (id: string, at: string) => makeEvent('nappy', { id, startedAt: at, endedAt: at });

const yesterday = [
  sleep('nap-a', '2026-10-06T22:00:00Z', '2026-10-06T23:30:00Z'),
  sleep('nap-b', '2026-10-07T02:00:00Z', '2026-10-07T04:00:00Z'),
  bottle('bottle-early', '2026-10-07T00:00:00Z'),
  bottle('bottle-late', '2026-10-07T05:00:00Z'),
  nappy('nappy-early', '2026-10-06T20:00:00Z'),
  nappy('nappy-late', '2026-10-07T04:00:00Z'),
];
const today = [
  sleep('nap-today', '2026-10-07T21:00:00Z', '2026-10-07T23:00:00Z'),
  bottle('bottle-today', '2026-10-08T01:00:00Z'),
  nappy('nappy-today-1', '2026-10-07T19:00:00Z'),
  nappy('nappy-today-2', '2026-10-08T02:00:00Z'),
];

const summaryOf = (events: BabyEvent[], dayKey: string, at: Date) =>
  summariseDay(
    events,
    dayWindow(dayKey, baby.timezone, baby.day_start_minutes),
    summaryOptions(settings, baby, dayKey, at),
  );

describe('previousDayWindow', () => {
  it('is the whole day before, from the baby day start', () => {
    expect(previousDayWindow('2026-10-08', baby)).toEqual({
      previousKey: '2026-10-07',
      start: new Date('2026-10-06T18:00:00Z'),
      end: new Date('2026-10-07T18:00:00Z'),
    });
  });
});

describe('comparisonToggleLabel', () => {
  it('names the day before', () => {
    expect(comparisonToggleLabel('2026-10-08', '2026-10-08')).toBe('Compare with yesterday');
    expect(comparisonToggleLabel('2026-10-07', '2026-10-08')).toBe('Compare with Tue 6 Oct');
  });
});

describe('comparisonCutoff', () => {
  it('stops yesterday at the same time of day when looking at today', () => {
    expect(comparisonCutoff('2026-10-08', '2026-10-08', baby, now)).toEqual(new Date('2026-10-07T03:00:00Z'));
  });

  it('compares full days for a finished day', () => {
    expect(comparisonCutoff('2026-10-07', '2026-10-08', baby, now)).toBeNull();
  });

  it('uses the same clock time across a daylight saving change', () => {
    const afterChange = new Date('2026-09-27T03:00:00Z');
    expect(comparisonCutoff('2026-09-27', '2026-09-27', baby, afterChange)).toEqual(new Date('2026-09-26T04:00:00Z'));
  });

  it('stays inside yesterday before the day start', () => {
    const early = { ...baby, day_start_minutes: 0 };
    const cutoff = comparisonCutoff('2026-10-08', '2026-10-08', early, new Date('2026-10-07T11:30:00Z'));
    expect(cutoff).toEqual(new Date('2026-10-06T11:30:00Z'));
  });
});

describe('dayComparison', () => {
  it('counts only what happened by this time yesterday, clipping a sleep that ran past it', () => {
    const comparison = dayComparison({
      dayKey: '2026-10-08',
      todayKey: '2026-10-08',
      current: summaryOf(today, '2026-10-08', now),
      events: [...yesterday, ...today],
      settings,
      baby,
      now,
    });
    expect(comparison).toMatchObject({
      previousKey: '2026-10-07',
      previousLabel: 'Yesterday',
      title: 'By this time yesterday',
      cutoff: '2026-10-07T03:00:00.000Z',
    });
    expect(comparison.cutoffFrac).toBeCloseTo(9 / 24);
    expect(comparison.summary).toMatchObject({
      sleepMs: 150 * 60_000,
      naps: 2,
      longestSleepMs: 90 * 60_000,
      feeds: 1,
      nappies: 1,
    });
    expect(comparison.rows.map((row) => [row.label, row.value, row.previous, row.change, row.trend])).toEqual([
      ['Sleep', '2h 00m', '2h 30m', '−30m', 'down'],
      ['Naps', '1', '2', '−1', 'down'],
      ['Longest sleep', '2h 00m', '1h 30m', '+30m', 'up'],
      ['Feeds', '1', '1', 'Same', 'same'],
      ['Nappies', '2', '1', '+1', 'up'],
    ]);
  });

  it('lays out all of yesterday even when only part of it is counted', () => {
    const comparison = dayComparison({
      dayKey: '2026-10-08',
      todayKey: '2026-10-08',
      current: summaryOf(today, '2026-10-08', now),
      events: [...yesterday, ...today],
      settings,
      baby,
      now,
    });
    expect(comparison.layout.sleep.map((item) => item.event.id)).toEqual(['nap-a', 'nap-b']);
    expect(comparison.layout.feeds.map((item) => item.event.id)).toEqual(['bottle-early', 'bottle-late']);
  });

  it('compares two full days when the selected day is finished', () => {
    const later = new Date('2026-10-09T03:00:00Z');
    const comparison = dayComparison({
      dayKey: '2026-10-08',
      todayKey: '2026-10-09',
      current: summaryOf(today, '2026-10-08', later),
      events: [...yesterday, ...today],
      settings,
      baby,
      now: later,
    });
    expect(comparison).toMatchObject({
      title: 'Compared with Wed 7 Oct',
      cutoff: null,
      cutoffFrac: null,
    });
    expect(comparison.summary).toMatchObject({
      sleepMs: 210 * 60_000,
      longestSleepMs: 120 * 60_000,
      feeds: 2,
      nappies: 2,
    });
  });

  it('ignores deleted entries and entries from other days', () => {
    const deleted = { ...bottle('deleted', '2026-10-06T21:00:00Z'), deletedAt: '2026-10-06T21:05:00Z' };
    const twoDaysAgo = nappy('old', '2026-10-06T10:00:00Z');
    const comparison = dayComparison({
      dayKey: '2026-10-08',
      todayKey: '2026-10-08',
      current: summaryOf(today, '2026-10-08', now),
      events: [deleted, twoDaysAgo],
      settings,
      baby,
      now,
    });
    expect(comparison.summary).toMatchObject({ feeds: 0, nappies: 0, sleepMs: 0 });
  });
});

describe('comparisonRows', () => {
  it('marks equal durations as the same', () => {
    const summary = summaryOf(today, '2026-10-08', now);
    expect(comparisonRows(summary, summary).every((row) => row.change === 'Same' && row.trend === 'same')).toBe(true);
  });
});

describe('previous24hWindow', () => {
  it('is the 24 hours just before the window', () => {
    const window = { start: new Date('2026-10-07T03:00:00Z'), end: new Date('2026-10-08T03:00:00Z') };
    expect(previous24hWindow(window)).toEqual({
      start: new Date('2026-10-06T03:00:00Z'),
      end: new Date('2026-10-07T03:00:00Z'),
    });
  });
});

describe('rollingComparison', () => {
  const window = { start: new Date('2026-10-07T03:00:00Z'), end: new Date('2026-10-08T03:00:00Z') };
  const all = [
    sleep('older-nap', '2026-10-06T22:00:00Z', '2026-10-06T23:30:00Z'),
    sleep('across', '2026-10-07T02:00:00Z', '2026-10-07T04:00:00Z'),
    bottle('older-bottle', '2026-10-07T00:00:00Z'),
    bottle('too-old', '2026-10-06T02:00:00Z'),
    nappy('older-nappy', '2026-10-06T20:00:00Z'),
    ...today,
  ];
  const current = summariseDay(all, window, summaryOptions(settings, baby, '2026-10-08', now));
  const comparison = rollingComparison({ window, current, events: all, settings, baby });

  it('compares the last 24 hours with the full 24 hours before', () => {
    expect(comparison).toMatchObject({
      previousLabel: 'The 24h before',
      title: 'Compared with the 24 hours before',
      cutoff: null,
      cutoffFrac: null,
      window: { start: new Date('2026-10-06T03:00:00Z'), end: new Date('2026-10-07T03:00:00Z') },
    });
    expect(comparison.summary).toMatchObject({
      sleepMs: 150 * 60_000,
      longestSleepMs: 90 * 60_000,
      feeds: 1,
      nappies: 1,
    });
  });

  it('splits a sleep across the two windows', () => {
    expect(current.sleepMs).toBe(180 * 60_000);
    expect(comparison.rows.find((row) => row.key === 'sleep')).toMatchObject({
      value: '3h 00m',
      previous: '2h 30m',
      change: '+30m',
      trend: 'up',
    });
  });

  it('lays out only what falls in the earlier window', () => {
    expect(comparison.layout.sleep.map((item) => item.event.id)).toEqual(['older-nap', 'across']);
    expect(comparison.layout.feeds.map((item) => item.event.id)).toEqual(['older-bottle']);
  });
});
