import { describe, expect, it } from 'vitest';
import { summariseDay } from './day-summary';
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
    expect(summariseDay(events, window)).toEqual({ sleepMs: 2 * 3_600_000, feeds: 2, nappies: 1 });
  });
});
