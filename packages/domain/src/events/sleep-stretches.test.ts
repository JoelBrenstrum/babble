import { describe, expect, it } from 'vitest';
import { asleepWithin, fitStretches, napRows, napTimeline, summariseSleep } from './sleep-stretches';

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

describe('summariseSleep wake-ups', () => {
  it("doesn't count stretches that touch as a wake-up", () => {
    expect(
      summariseSleep(
        {
          startedAt: '2026-10-06T09:00:00Z',
          endedAt: '2026-10-06T10:00:00Z',
          segments: [
            { startedAt: '2026-10-06T09:00:00Z', endedAt: '2026-10-06T09:30:00Z' },
            { startedAt: '2026-10-06T09:30:00Z', endedAt: '2026-10-06T10:00:00Z' },
          ],
        },
        new Date('2026-10-06T10:00:00Z'),
      ),
    ).toMatchObject({ wakeUps: 0, awakeMs: 0, asleepMs: 60 * 60_000 });
  });
});

describe('napRows', () => {
  const now = new Date('2026-10-06T10:00:00Z');
  it('lists stretches of sleep with the awake gaps between them', () => {
    const rows = napRows(
      {
        startedAt: '2026-10-06T09:00:00Z',
        endedAt: null,
        segments: [
          { startedAt: '2026-10-06T09:00:00Z', endedAt: '2026-10-06T09:30:00Z' },
          { startedAt: '2026-10-06T09:40:00Z', endedAt: null },
        ],
      },
      now,
    );
    expect(rows).toEqual([
      { kind: 'asleep', durationMs: 30 * 60_000, running: false },
      { kind: 'awake', durationMs: 10 * 60_000, running: false },
      { kind: 'asleep', durationMs: 20 * 60_000, running: true },
    ]);
  });

  it('ends with a counting awake row while paused', () => {
    const rows = napRows(
      {
        startedAt: '2026-10-06T09:00:00Z',
        endedAt: null,
        segments: [{ startedAt: '2026-10-06T09:00:00Z', endedAt: '2026-10-06T09:45:00Z' }],
      },
      now,
    );
    expect(rows.at(-1)).toEqual({ kind: 'awake', durationMs: 15 * 60_000, running: true });
  });

  it('is one asleep row for a nap without pauses', () => {
    expect(napRows({ startedAt: '2026-10-06T09:00:00Z', endedAt: '2026-10-06T09:50:00Z', segments: [] }, now)).toEqual([
      { kind: 'asleep', durationMs: 50 * 60_000, running: false },
    ]);
  });

  it('joins stretches that touch into one row', () => {
    expect(
      napRows(
        {
          startedAt: '2026-10-06T09:00:00Z',
          endedAt: null,
          segments: [
            { startedAt: '2026-10-06T09:00:00Z', endedAt: '2026-10-06T09:30:00Z' },
            { startedAt: '2026-10-06T09:30:00Z', endedAt: null },
          ],
        },
        now,
      ),
    ).toEqual([{ kind: 'asleep', durationMs: 60 * 60_000, running: true }]);
  });
});

describe('napTimeline', () => {
  const now = new Date('2026-10-06T12:00:00Z');
  const stretch = (start: string, end: string | null) => ({
    startedAt: `2026-10-06T${start}:00Z`,
    endedAt: end && `2026-10-06T${end}:00Z`,
  });

  it('builds the intervals, rows and paused flag once', () => {
    const nap = {
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: null,
      segments: [stretch('10:00', '10:20'), stretch('10:30', '10:50')],
    };
    const timeline = napTimeline(nap, now);
    expect(timeline.paused).toBe(true);
    expect(timeline.intervals).toHaveLength(2);
    expect(timeline.rows).toEqual([
      { kind: 'asleep', durationMs: 20 * 60_000, running: false },
      { kind: 'awake', durationMs: 10 * 60_000, running: false },
      { kind: 'asleep', durationMs: 20 * 60_000, running: false },
      { kind: 'awake', durationMs: 70 * 60_000, running: true },
    ]);
  });

  it('derives the summary and rows from the same timeline', () => {
    const nap = {
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: null,
      segments: [stretch('10:00', '10:20'), stretch('10:30', null)],
    };
    expect(summariseSleep(nap, now)).toEqual({
      asleepMs: 110 * 60_000,
      awakeMs: 10 * 60_000,
      wakeUps: 1,
      paused: false,
    });
    expect(napRows(nap, now)).toEqual(napTimeline(nap, now).rows);
  });

  it('merges stretches that touch and flags the open one as running', () => {
    const nap = {
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: null,
      segments: [stretch('10:00', '10:20'), stretch('10:20', null)],
    };
    expect(napTimeline(nap, now).rows).toEqual([{ kind: 'asleep', durationMs: 120 * 60_000, running: true }]);
  });

  it('treats a nap without stretches as one interval', () => {
    const nap = { startedAt: '2026-10-06T10:00:00Z', endedAt: '2026-10-06T10:45:00Z', segments: [] };
    expect(napTimeline(nap, now)).toMatchObject({
      paused: false,
      rows: [{ kind: 'asleep', durationMs: 45 * 60_000, running: false }],
    });
  });
});
