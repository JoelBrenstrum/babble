import { describe, expect, it } from 'vitest';
import { makeEvent } from '../events/test-events';
import type { BabyEvent } from '../events/types';
import { learnRhythm, predictDay, predictDayStatus, weightedMedian } from './predict-day';

const M = 60_000;
const OPTIONS = { timeZone: 'Pacific/Auckland' };
const BASE = Date.parse('2026-10-03T00:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();

function regularCycles(count: number): BabyEvent[] {
  return Array.from({ length: count }, (_, index) => {
    const feed = BASE + index * 180 * M;
    return [
      makeEvent('breast_feed', {
        id: `feed-${index}`,
        startedAt: iso(feed),
        endedAt: iso(feed + 40 * M),
        segments: [{ side: 'left', startedAt: iso(feed), endedAt: iso(feed + 40 * M) }],
      }),
      makeEvent('sleep', {
        id: `sleep-${index}`,
        startedAt: iso(feed + 50 * M),
        endedAt: iso(feed + 170 * M),
        segments: [],
      }),
    ];
  }).flat();
}

const simplify = (blocks: ReturnType<typeof predictDay>) =>
  blocks?.map((b) => [b.kind, b.startedAt.slice(11, 16), b.endedAt.slice(11, 16), b.continuesRunning]);

describe('weightedMedian', () => {
  it('picks the value where the cumulative weight reaches half', () => {
    expect(
      weightedMedian([
        { value: 10, weight: 1 },
        { value: 20, weight: 1 },
        { value: 30, weight: 5 },
      ]),
    ).toBe(30);
    expect(
      weightedMedian([
        { value: 10, weight: 3 },
        { value: 20, weight: 1 },
      ]),
    ).toBe(10);
    expect(weightedMedian([])).toBeNull();
  });
});

describe('learnRhythm', () => {
  it('measures feed length, feed start to sleep, sleep length and wake to feed', () => {
    const rhythm = learnRhythm(regularCycles(4), new Date(BASE + 12 * 60 * M), OPTIONS);
    expect(rhythm.feedLength.map((s) => s.value / M)).toEqual([40, 40, 40, 40]);
    expect(rhythm.feedToSleep.map((s) => s.value / M)).toEqual([50, 50, 50, 50]);
    expect(rhythm.sleepLength.map((s) => s.value / M)).toEqual([120, 120, 120, 120]);
    expect(rhythm.wakeToFeed.map((s) => s.value / M)).toEqual([10, 10, 10]);
  });

  it('treats sleeps a few minutes apart as one sleep', () => {
    const events = [
      makeEvent('sleep', { id: 'a', startedAt: iso(BASE), endedAt: iso(BASE + 30 * M), segments: [] }),
      makeEvent('sleep', { id: 'b', startedAt: iso(BASE + 35 * M), endedAt: iso(BASE + 90 * M), segments: [] }),
    ];
    expect(learnRhythm(events, new Date(BASE + 120 * M), OPTIONS).sleepLength.map((s) => s.value / M)).toEqual([90]);
  });
});

describe('predictDay', () => {
  it('needs enough history before predicting', () => {
    const events = regularCycles(3);
    expect(predictDay(events, new Date(BASE + 9 * 60 * M), new Date(BASE + 15 * 60 * M), OPTIONS)).toBeNull();
  });

  it('chains feed, sleep and feed from the last finished sleep', () => {
    const events = regularCycles(8);
    const now = new Date(BASE + 23 * 60 * M + 55 * M);
    expect(simplify(predictDay(events, now, new Date(BASE + 30 * 60 * M), OPTIONS))).toEqual([
      ['feed', '00:00', '00:40', false],
      ['sleep', '00:50', '02:50', false],
      ['feed', '03:00', '03:40', false],
      ['sleep', '03:50', '05:50', false],
    ]);
  });

  it('continues a running sleep from now to the expected wake-up', () => {
    const events = [
      ...regularCycles(8),
      makeEvent('breast_feed', {
        id: 'feed-now',
        startedAt: iso(BASE + 24 * 60 * M),
        endedAt: iso(BASE + 24 * 60 * M + 40 * M),
        segments: [],
      }),
      makeEvent('sleep', { id: 'sleep-now', startedAt: iso(BASE + 24 * 60 * M + 50 * M), endedAt: null, segments: [] }),
    ];
    const now = new Date(BASE + 25 * 60 * M + 30 * M);
    expect(simplify(predictDay(events, now, new Date(BASE + 27 * 60 * M + 30 * M), OPTIONS))).toEqual([
      ['sleep', '01:30', '02:50', true],
      ['feed', '03:00', '03:40', false],
    ]);
  });

  it('expects an overdue sleep shortly after now rather than in the past', () => {
    const events = regularCycles(8).filter((event) => event.id !== 'sleep-7');
    const now = new Date(BASE + 21 * 60 * M + 120 * M);
    expect(simplify(predictDay(events, now, new Date(BASE + 23 * 60 * M + 30 * M), OPTIONS))?.[0]).toEqual([
      'sleep',
      '23:10',
      '01:10',
      false,
    ]);
  });
});

describe('predictDayStatus', () => {
  const now = new Date(BASE + 23 * 60 * M + 55 * M);
  const until = new Date(BASE + 30 * 60 * M);

  it('reports that it is still learning when there are too few samples', () => {
    expect(predictDayStatus(regularCycles(3), now, until, OPTIONS)).toEqual({ status: 'learning' });
    expect(predictDay(regularCycles(3), now, until, OPTIONS)).toBeNull();
  });

  it('reports that there is nothing to anchor on when nothing has been logged', () => {
    expect(predictDayStatus([], now, until, { ...OPTIONS, minSamples: 0 })).toEqual({ status: 'no-anchor' });
    expect(predictDay([], now, until, { ...OPTIONS, minSamples: 0 })).toBeNull();
  });

  it('returns the blocks when ready, matching predictDay', () => {
    const events = regularCycles(8);
    const result = predictDayStatus(events, now, until, OPTIONS);
    expect(result).toEqual({ status: 'ready', blocks: predictDay(events, now, until, OPTIONS) });
  });

  it('falls back to the defaults for options set to undefined', () => {
    const events = regularCycles(8);
    expect(predictDay(events, now, until, { ...OPTIONS, minSamples: undefined })).toEqual(
      predictDay(events, now, until, OPTIONS),
    );
  });

  it('keeps a zero wake-to-feed gap as a real sample', () => {
    const events = Array.from({ length: 8 }, (_, index) => {
      const sleep = BASE + index * 180 * M;
      return [
        makeEvent('sleep', { id: `s${index}`, startedAt: iso(sleep), endedAt: iso(sleep + 120 * M), segments: [] }),
        makeEvent('breast_feed', {
          id: `f${index}`,
          startedAt: iso(sleep + 120 * M),
          endedAt: iso(sleep + 150 * M),
          segments: [],
        }),
      ];
    }).flat();
    const rhythm = learnRhythm(events, new Date(BASE + 25 * 60 * M), OPTIONS);
    expect(rhythm.wakeToFeed.map((sample) => sample.value)).toContain(0);
    const blocks = predictDay(events, new Date(BASE + 24 * 60 * M + 150 * M), new Date(BASE + 30 * 60 * M), OPTIONS);
    expect(blocks?.[0]?.kind).toBe('sleep');
  });
});
