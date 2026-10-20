import { describe, expect, it } from 'vitest';
import { makeEvent } from '../events/test-events';
import type { BabyEvent } from '../events/types';
import {
  blendWithPrior,
  learnRhythm,
  predictDay,
  predictDayStatus,
  weightedMedian,
  weightedQuantile,
} from './predict-day';

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

describe('weightedQuantile', () => {
  it('reads the lower and upper quartiles from the cumulative weight', () => {
    const values = [10, 20, 30, 40].map((value) => ({ value, weight: 1 }));
    expect(weightedQuantile(values, 0.25)).toBe(10);
    expect(weightedQuantile(values, 0.75)).toBe(30);
    expect(weightedQuantile(values, 1)).toBe(40);
  });
});

describe('blendWithPrior', () => {
  const observed = { low: 40, mid: 60, high: 80 };
  const prior = { low: 80, mid: 120, high: 160 };

  it('uses whichever side exists on its own', () => {
    expect(blendWithPrior(observed, null, 3)).toEqual(observed);
    expect(blendWithPrior(null, prior, 0)).toEqual(prior);
    expect(blendWithPrior(null, null, 0)).toBeNull();
  });

  it('trusts the observations more as their weight grows', () => {
    expect(blendWithPrior(observed, prior, 2)).toEqual({ low: 60, mid: 90, high: 120 });
    expect(blendWithPrior(observed, prior, 18)!.mid).toBe(66);
  });
});

describe('learnRhythm', () => {
  it('measures feed length, feed start to sleep, sleep length, wake to feed and wake to sleep', () => {
    const rhythm = learnRhythm(regularCycles(4), new Date(BASE + 12 * 60 * M), OPTIONS);
    expect(rhythm.feedLength.map((s) => s.value / M)).toEqual([40, 40, 40, 40]);
    expect(rhythm.feedToSleep.map((s) => s.value / M)).toEqual([50, 50, 50, 50]);
    expect(rhythm.sleepLength.map((s) => s.value / M)).toEqual([120, 120, 120, 120]);
    expect(rhythm.wakeToFeed.map((s) => s.value / M)).toEqual([10, 10, 10]);
    expect(rhythm.wakeToSleep.map((s) => s.value / M)).toEqual([60, 60, 60]);
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

  it('keeps the expected feed after a short nap early in the predicted sleep', () => {
    const events = [
      ...regularCycles(8),
      makeEvent('breast_feed', {
        id: 'feed-now',
        startedAt: iso(BASE + 24 * 60 * M),
        endedAt: iso(BASE + 24 * 60 * M + 40 * M),
        segments: [],
      }),
      makeEvent('sleep', {
        id: 'catnap',
        startedAt: iso(BASE + 24 * 60 * M + 50 * M),
        endedAt: iso(BASE + 24 * 60 * M + 60 * M),
        segments: [],
      }),
    ];
    const now = new Date(BASE + 25 * 60 * M + 5 * M);
    expect(simplify(predictDay(events, now, new Date(BASE + 27 * 60 * M + 30 * M), OPTIONS))?.[0]).toEqual([
      'feed',
      '03:00',
      '03:40',
      false,
    ]);
  });

  it('expects a feed straight after a short nap near the end of the predicted sleep', () => {
    const events = [
      ...regularCycles(8),
      makeEvent('breast_feed', {
        id: 'feed-now',
        startedAt: iso(BASE + 24 * 60 * M),
        endedAt: iso(BASE + 24 * 60 * M + 40 * M),
        segments: [],
      }),
      makeEvent('sleep', {
        id: 'late-catnap',
        startedAt: iso(BASE + 24 * 60 * M + 140 * M),
        endedAt: iso(BASE + 24 * 60 * M + 160 * M),
        segments: [],
      }),
    ];
    const now = new Date(BASE + 24 * 60 * M + 162 * M);
    expect(simplify(predictDay(events, now, new Date(BASE + 27 * 60 * M + 30 * M), OPTIONS))?.[0]).toEqual([
      'feed',
      '02:50',
      '03:30',
      false,
    ]);
  });

  it('still expects a feed soon after a full-length nap', () => {
    const events = [
      ...regularCycles(8),
      makeEvent('breast_feed', {
        id: 'feed-now',
        startedAt: iso(BASE + 24 * 60 * M),
        endedAt: iso(BASE + 24 * 60 * M + 40 * M),
        segments: [],
      }),
      makeEvent('sleep', {
        id: 'early-long-nap',
        startedAt: iso(BASE + 24 * 60 * M + 45 * M),
        endedAt: iso(BASE + 24 * 60 * M + 135 * M),
        segments: [],
      }),
    ];
    const now = new Date(BASE + 24 * 60 * M + 136 * M);
    expect(simplify(predictDay(events, now, new Date(BASE + 27 * 60 * M + 30 * M), OPTIONS))?.[0]).toEqual([
      'feed',
      '02:25',
      '03:05',
      false,
    ]);
  });

  it('expects an overdue sleep now rather than in the past', () => {
    const events = regularCycles(8).filter((event) => event.id !== 'sleep-7');
    const now = new Date(BASE + 21 * 60 * M + 120 * M);
    expect(simplify(predictDay(events, now, new Date(BASE + 23 * 60 * M + 30 * M), OPTIONS))?.[0]).toEqual([
      'sleep',
      '23:00',
      '01:00',
      false,
    ]);
  });

  it('keeps the expected wake-up fixed while a sleep runs on past it', () => {
    const events = [
      ...regularCycles(8),
      makeEvent('sleep', { id: 'long', startedAt: iso(BASE + 25 * 60 * M), endedAt: null, segments: [] }),
    ];
    const until = new Date(BASE + 30 * 60 * M);
    const early = predictDay(events, new Date(BASE + 25 * 60 * M + 30 * M), until, OPTIONS)![0]!;
    const late = predictDay(events, new Date(BASE + 25 * 60 * M + 150 * M), until, OPTIONS)![0]!;
    expect(early.endedAt).toBe(iso(BASE + 27 * 60 * M));
    expect(late.endedAt).toBe(iso(BASE + 27 * 60 * M));
    expect(late.continuesRunning).toBe(true);
    expect(simplify(predictDay(events, new Date(BASE + 25 * 60 * M + 150 * M), until, OPTIONS))?.[1]).toEqual([
      'feed',
      '03:40',
      '04:20',
      false,
    ]);
  });
});

describe('predictDay before it is ready', () => {
  const now = new Date(BASE + 23 * 60 * M + 55 * M);
  const until = new Date(BASE + 30 * 60 * M);

  it('has nothing to say while there are too few samples', () => {
    expect(predictDay(regularCycles(3), now, until, OPTIONS)).toBeNull();
  });

  it('has nothing to anchor on when nothing has been logged', () => {
    expect(predictDay([], now, until, { ...OPTIONS, minSamples: 0 })).toBeNull();
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

describe('predictDay with age-typical patterns', () => {
  const AGED = { ...OPTIONS, ageMonths: 4 };

  it('predicts from the first sleep using the typical wake window for the age', () => {
    const wake = BASE + 10 * 60 * M;
    const events = [
      makeEvent('sleep', { id: 'only', startedAt: iso(wake - 60 * M), endedAt: iso(wake), segments: [] }),
    ];
    const now = new Date(wake + 10 * M);
    const blocks = predictDay(events, now, new Date(wake + 6 * 60 * M), AGED)!;
    const sleep = blocks.find((block) => block.kind === 'sleep')!;
    expect(blocks[0]?.kind).toBe('feed');
    expect(sleep.startedAt).toBe(iso(wake + 120 * M));
    expect(sleep.startWindow).toEqual({ from: iso(wake + 90 * M), to: iso(wake + 150 * M) });
  });

  it('pulls a learned wake window toward the typical one for the age', () => {
    const events = regularCycles(8);
    const now = new Date(BASE + 23 * 60 * M + 55 * M);
    const learned = predictDay(events, now, new Date(BASE + 30 * 60 * M), OPTIONS)!;
    const blended = predictDay(events, now, new Date(BASE + 30 * 60 * M), AGED)!;
    const sleepStart = (blocks: typeof learned) => Date.parse(blocks.find((b) => b.kind === 'sleep')!.startedAt);
    const wake = BASE + 23 * 60 * M + 50 * M;
    expect(sleepStart(learned)).toBe(wake + 60 * M);
    expect(sleepStart(blended)).toBeGreaterThan(wake + 60 * M);
    expect(sleepStart(blended)).toBeLessThan(wake + 120 * M);
  });

  it('spreads the window across the spread of past wake windows', () => {
    const gaps = [40, 50, 60, 70, 80];
    let cursor = BASE;
    const events = gaps.flatMap((gap, index) => {
      const sleepStart = cursor;
      const wake = sleepStart + 90 * M;
      cursor = wake + gap * M;
      return [
        makeEvent('sleep', { id: `s${index}`, startedAt: iso(sleepStart), endedAt: iso(wake), segments: [] }),
        makeEvent('bottle', { id: `f${index}`, startedAt: iso(wake + 5 * M), endedAt: iso(wake + 20 * M) }),
      ];
    });
    const lastWake = cursor - gaps.at(-1)! * M;
    const now = new Date(lastWake + 25 * M);
    const blocks = predictDay(events, now, new Date(now.getTime() + 4 * 60 * M), { ...OPTIONS, minSamples: 0 })!;
    const sleep = blocks.find((block) => block.kind === 'sleep')!;
    const from = Date.parse(sleep.startWindow!.from);
    const to = Date.parse(sleep.startWindow!.to);
    expect(from).toBeGreaterThanOrEqual(lastWake + 40 * M);
    expect(to).toBeLessThanOrEqual(lastWake + 80 * M);
    expect(from).toBeLessThanOrEqual(Date.parse(sleep.startedAt));
    expect(to).toBeGreaterThanOrEqual(Date.parse(sleep.startedAt));
  });

  it('keeps an overdue window in the past while the sleep itself lands after now', () => {
    const wake = BASE + 10 * 60 * M;
    const events = [
      makeEvent('sleep', { id: 'only', startedAt: iso(wake - 60 * M), endedAt: iso(wake), segments: [] }),
    ];
    const now = new Date(wake + 4 * 60 * M);
    const blocks = predictDay(events, now, new Date(now.getTime() + 4 * 60 * M), AGED)!;
    const sleep = blocks.find((block) => block.kind === 'sleep')!;
    expect(Date.parse(sleep.startWindow!.to)).toBeLessThan(now.getTime());
    expect(Date.parse(sleep.startedAt)).toBeGreaterThanOrEqual(now.getTime());
  });

  it('gives a wake-up range for a running sleep', () => {
    const start = BASE + 10 * 60 * M;
    const events = [makeEvent('sleep', { id: 'running', startedAt: iso(start), endedAt: null, segments: [] })];
    const now = new Date(start + 20 * M);
    const blocks = predictDay(events, now, new Date(now.getTime() + 4 * 60 * M), AGED)!;
    expect(blocks[0]).toMatchObject({
      kind: 'sleep',
      continuesRunning: true,
      endedAt: iso(start + 75 * M),
      endWindow: { from: iso(start + 30 * M), to: iso(start + 120 * M) },
    });
  });

  it('does not wait for history when the age is known', () => {
    const now = new Date(BASE + 9 * 60 * M);
    expect(predictDayStatus(regularCycles(3), now, new Date(BASE + 15 * 60 * M), AGED).status).toBe('ready');
    expect(predictDayStatus([], now, new Date(BASE + 15 * 60 * M), AGED)).toEqual({ status: 'no-anchor' });
  });
});
