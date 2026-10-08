import { describe, expect, it } from 'vitest';
import { asleepWithin, fitStretches, summariseSleep } from './sleep-stretches';

const NOW = new Date('2026-10-06T11:00:00Z');
const nap = {
  startedAt: '2026-10-06T09:00:00Z',
  endedAt: '2026-10-06T10:30:00Z',
  segments: [
    { startedAt: '2026-10-06T09:00:00Z', endedAt: '2026-10-06T09:40:00Z' },
    { startedAt: '2026-10-06T09:50:00Z', endedAt: '2026-10-06T10:10:00Z' },
    { startedAt: '2026-10-06T10:15:00Z', endedAt: '2026-10-06T10:30:00Z' },
  ],
};

describe('summariseSleep', () => {
  it('splits a nap into asleep and awake time and counts wake-ups', () => {
    expect(summariseSleep(nap, NOW)).toEqual({
      asleepMs: 75 * 60_000,
      awakeMs: 15 * 60_000,
      wakeUps: 2,
      paused: false,
    });
  });

  it('treats a nap that was never paused as one stretch', () => {
    expect(summariseSleep({ ...nap, segments: [] }, NOW)).toEqual({
      asleepMs: 90 * 60_000,
      awakeMs: 0,
      wakeUps: 0,
      paused: false,
    });
  });

  it('counts the time since a running nap was paused as awake', () => {
    const paused = { ...nap, endedAt: null, segments: nap.segments.slice(0, 1) };
    expect(summariseSleep(paused, new Date('2026-10-06T09:45:00Z'))).toEqual({
      asleepMs: 40 * 60_000,
      awakeMs: 5 * 60_000,
      wakeUps: 1,
      paused: true,
    });
  });
});

describe('asleepWithin', () => {
  it('only counts asleep time inside the window', () => {
    const window = { start: new Date('2026-10-06T09:30:00Z'), end: new Date('2026-10-06T10:00:00Z') };
    expect(asleepWithin(nap, window, NOW)).toBe(20 * 60_000);
  });
});

describe('fitStretches', () => {
  it('stretches the first and last to a new start and end, and drops stretches outside', () => {
    expect(fitStretches(nap.segments, '2026-10-06T08:50:00Z', '2026-10-06T10:05:00Z')).toEqual([
      { startedAt: '2026-10-06T08:50:00Z', endedAt: '2026-10-06T09:40:00Z' },
      { startedAt: '2026-10-06T09:50:00Z', endedAt: '2026-10-06T10:05:00Z' },
    ]);
  });

  it('keeps a nap without stretches as it is', () => {
    expect(fitStretches([], '2026-10-06T08:50:00Z', '2026-10-06T10:05:00Z')).toEqual([]);
  });
});
