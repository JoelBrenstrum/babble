import { describe, expect, it } from 'vitest';
import { alertShare, alertSplit, commonestEnd, formatShare, subtractSpans } from './alert-time';
import { makeEvent } from './test-events';

const window = { start: new Date('2026-10-06T00:00:00Z'), end: new Date('2026-10-07T00:00:00Z') };
const NOW = new Date('2026-10-06T12:00:00Z');
const HOUR = 3_600_000;
const MIN = 60_000;

describe('subtractSpans', () => {
  it.each([
    [
      [{ start: 0, end: 10 }],
      [{ start: 3, end: 5 }],
      [
        { start: 0, end: 3 },
        { start: 5, end: 10 },
      ],
    ],
    [[{ start: 0, end: 10 }], [{ start: -5, end: 20 }], []],
    [[{ start: 0, end: 10 }], [{ start: 20, end: 30 }], [{ start: 0, end: 10 }]],
    [
      [
        { start: 0, end: 4 },
        { start: 2, end: 10 },
      ],
      [{ start: 8, end: 12 }],
      [{ start: 0, end: 8 }],
    ],
  ])('%j minus %j', (spans, cuts, expected) => expect(subtractSpans(spans, cuts)).toEqual(expected));
});

describe('alertSplit', () => {
  const sleep = makeEvent('sleep', { id: 's1', startedAt: '2026-10-06T00:00:00Z', endedAt: '2026-10-06T06:00:00Z' });

  it('splits the awake part of the day so far into alert, feeding and other', () => {
    const alert = makeEvent('alert', {
      id: 'a1',
      startedAt: '2026-10-06T07:00:00Z',
      endedAt: '2026-10-06T08:00:00Z',
      details: { activities: ['tummy_time'], endedBy: 'fussy' },
    });
    const feed = makeEvent('breast_feed', {
      id: 'f1',
      startedAt: '2026-10-06T06:30:00Z',
      endedAt: '2026-10-06T07:15:00Z',
      segments: [{ side: 'left', startedAt: '2026-10-06T06:30:00Z', endedAt: '2026-10-06T07:15:00Z' }],
    });
    expect(alertSplit([sleep, alert, feed], window, NOW)).toEqual({
      awakeMs: 6 * HOUR,
      alertMs: HOUR,
      feedingMs: 30 * MIN,
      otherAwakeMs: 4.5 * HOUR,
      alerts: 1,
      longestAlertMs: HOUR,
      endedBy: { fussy: 1 },
    });
  });

  it('runs open alert time up to now and never counts it while asleep', () => {
    const running = makeEvent('alert', { id: 'a1', startedAt: '2026-10-06T05:00:00Z', endedAt: null });
    const split = alertSplit([sleep, running], window, NOW);
    expect(split.alertMs).toBe(6 * HOUR);
    expect(split.endedBy).toEqual({});
  });

  it('clips alert time to the day and counts it on the day it started', () => {
    const late = makeEvent('alert', { id: 'a1', startedAt: '2026-10-05T23:30:00Z', endedAt: '2026-10-06T00:30:00Z' });
    const split = alertSplit([late], window, NOW);
    expect(split).toMatchObject({ alertMs: 30 * MIN, alerts: 0, awakeMs: 12 * HOUR });
  });

  it('leaves out deleted entries', () => {
    const deleted = makeEvent('alert', {
      id: 'a1',
      startedAt: '2026-10-06T07:00:00Z',
      endedAt: '2026-10-06T08:00:00Z',
      deletedAt: '2026-10-06T08:01:00Z',
    });
    expect(alertSplit([deleted], window, NOW)).toMatchObject({ alertMs: 0, alerts: 0 });
  });

  it('is empty before the day starts', () => {
    expect(alertSplit([sleep], window, new Date('2026-10-05T12:00:00Z')).awakeMs).toBe(0);
  });
});

describe('alertShare', () => {
  it.each([
    [{ alertMs: HOUR, awakeMs: 4 * HOUR }, '25%'],
    [{ alertMs: 0, awakeMs: 0 }, '—'],
  ])('%j → %s', (split, expected) => expect(formatShare(alertShare(split))).toBe(expected));
});

describe('commonestEnd', () => {
  it('picks the reason that ended alert time most often', () => {
    expect(commonestEnd({ fussy: 1, tired: 3, hungry: 2 })).toBe('tired');
    expect(commonestEnd({})).toBeNull();
  });
});
