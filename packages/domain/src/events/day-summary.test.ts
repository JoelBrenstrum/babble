import { describe, expect, it } from 'vitest';
import { summariseDay, summariseWeek } from './day-summary';
import { makeEvent } from './test-events';

const window = { start: new Date('2026-10-05T18:00:00Z'), end: new Date('2026-10-06T10:00:00Z') };

describe('summariseDay', () => {
  it('clips sleep to the day and counts feeds and nappies that start in it', () => {
    const events = [
      makeEvent('sleep', { startedAt: '2026-10-05T16:00:00Z', endedAt: '2026-10-05T19:00:00Z' }),
      makeEvent('sleep', { startedAt: '2026-10-06T09:00:00Z', endedAt: null }),
      makeEvent('breast_feed', { startedAt: '2026-10-05T20:00:00Z' }),
      makeEvent('bottle', { startedAt: '2026-10-06T01:00:00Z' }),
      makeEvent('bottle', { startedAt: '2026-10-05T12:00:00Z' }),
      makeEvent('nappy', { startedAt: '2026-10-06T02:00:00Z' }),
      makeEvent('nappy', { startedAt: '2026-10-06T03:00:00Z', deletedAt: '2026-10-06T03:01:00Z' }),
    ];
    expect(summariseDay(events, window)).toMatchObject({ sleepMs: 2 * 3_600_000, feeds: 2, nappies: 1 });
  });

  it('counts solids meals and their foods without counting them as feeds', () => {
    const meal = (startedAt: string, foods: string[]) =>
      makeEvent('solids', { startedAt, endedAt: startedAt, details: { foods, amount: null, reaction: null } });
    const summary = summariseDay(
      [
        meal('2026-10-06T01:00:00Z', ['Avocado']),
        meal('2026-10-06T05:00:00Z', ['avocado', 'Pear']),
        meal('2026-10-05T12:00:00Z', ['Egg']),
      ],
      window,
    );
    expect(summary).toMatchObject({
      solids: 2,
      solidsFoods: ['Avocado', 'Pear'],
      lastSolidsAt: '2026-10-06T05:00:00Z',
      feeds: 0,
    });
  });

  const day = { start: new Date('2026-10-06T00:00:00Z'), end: new Date('2026-10-07T00:00:00Z') };
  const night = { dayKey: '2026-10-06', timeZone: 'UTC', startMinutes: 19 * 60, endMinutes: 7 * 60 };

  it('splits sleep into night and naps', () => {
    const events = [
      makeEvent('sleep', { startedAt: '2026-10-05T22:00:00Z', endedAt: '2026-10-06T08:00:00Z' }),
      makeEvent('sleep', { startedAt: '2026-10-06T12:00:00Z', endedAt: '2026-10-06T13:30:00Z' }),
      makeEvent('sleep', { startedAt: '2026-10-06T18:00:00Z', endedAt: '2026-10-06T23:00:00Z' }),
    ];
    expect(summariseDay(events, day, { night })).toMatchObject({
      sleepMs: 14.5 * 3_600_000,
      nightMs: 11 * 3_600_000,
      napMs: 3.5 * 3_600_000,
      naps: 2,
      longestSleepMs: 10 * 3_600_000,
    });
  });

  it('stops a running sleep at now, not at the end of the day', () => {
    const events = [makeEvent('sleep', { startedAt: '2026-10-06T10:00:00Z', endedAt: null })];
    expect(summariseDay(events, day, { now: new Date('2026-10-06T11:00:00Z') }).sleepMs).toBe(3_600_000);
  });

  it('counts gaps between sides as idle once they pass the merge threshold, except on imported feeds', () => {
    const feed = makeEvent('breast_feed', {
      startedAt: '2026-10-06T06:00:00Z',
      endedAt: '2026-10-06T06:35:00Z',
      segments: [
        { side: 'left', startedAt: '2026-10-06T06:00:00Z', endedAt: '2026-10-06T06:10:00Z' },
        { side: 'right', startedAt: '2026-10-06T06:10:30Z', endedAt: '2026-10-06T06:20:00Z' },
        { side: 'right', startedAt: '2026-10-06T06:25:00Z', endedAt: '2026-10-06T06:35:00Z' },
      ],
    });
    expect(summariseDay([feed], day, { mergeGapMs: 60_000 }).idleMs).toBe(300_000);
    expect(summariseDay([{ ...feed, source: 'huckleberry_csv' }], day, { mergeGapMs: 60_000 }).idleMs).toBe(0);
  });

  it('counts only the time a nap was asleep, and its longest stretch', () => {
    const nap = makeEvent('sleep', {
      startedAt: '2026-10-06T08:00:00Z',
      endedAt: '2026-10-06T09:30:00Z',
      segments: [
        { startedAt: '2026-10-06T08:00:00Z', endedAt: '2026-10-06T08:50:00Z' },
        { startedAt: '2026-10-06T09:00:00Z', endedAt: '2026-10-06T09:30:00Z' },
      ],
    });
    expect(summariseDay([nap], day)).toMatchObject({ sleepMs: 80 * 60_000, longestSleepMs: 50 * 60_000 });
  });

  it('totals sides, bottles, nappies and pumps', () => {
    const events = [
      makeEvent('breast_feed', {
        startedAt: '2026-10-06T06:00:00Z',
        endedAt: '2026-10-06T06:30:00Z',
        segments: [
          { side: 'left', startedAt: '2026-10-06T06:00:00Z', endedAt: '2026-10-06T06:10:00Z' },
          { side: 'right', startedAt: '2026-10-06T06:10:00Z', endedAt: '2026-10-06T06:30:00Z' },
        ],
      }),
      makeEvent('bottle', {
        startedAt: '2026-10-06T09:00:00Z',
        details: { content: 'formula', amountMl: 120, amountLeftMl: 30 },
      }),
      makeEvent('nappy', {
        startedAt: '2026-10-06T07:00:00Z',
        details: { ...makeEvent('nappy').details, wet: true, dirty: true },
      }),
      makeEvent('nappy', { startedAt: '2026-10-06T11:00:00Z', details: { ...makeEvent('nappy').details, wet: true } }),
      makeEvent('pump', {
        startedAt: '2026-10-06T14:00:00Z',
        endedAt: '2026-10-06T14:20:00Z',
        details: { leftMl: 60, rightMl: 50, totalMl: null },
      }),
    ];
    expect(summariseDay(events, day)).toMatchObject({
      feeds: 2,
      leftMs: 600_000,
      rightMs: 1_200_000,
      bottles: 1,
      bottleMl: 90,
      nappies: 2,
      wet: 2,
      dirty: 1,
      both: 1,
      lastNappyAt: '2026-10-06T11:00:00Z',
      pumps: 1,
      pumpMl: 110,
      pumpLeftMl: 60,
      pumpRightMl: 50,
    });
  });
});

describe('summariseWeek', () => {
  it('averages per day and keeps the longest stretch', () => {
    const base = summariseDay([], { start: new Date(0), end: new Date(1) });
    const week = summariseWeek([
      { ...base, sleepMs: 10, feeds: 8, nappies: 6, longestSleepMs: 3 },
      { ...base, sleepMs: 20, feeds: 9, nappies: 7, longestSleepMs: 5 },
    ]);
    expect(week).toEqual({ days: 2, averageSleepMs: 15, longestSleepMs: 5, feedsPerDay: 8.5, nappiesPerDay: 6.5 });
  });

  it('handles an empty week', () => {
    expect(summariseWeek([]).averageSleepMs).toBe(0);
  });
});
