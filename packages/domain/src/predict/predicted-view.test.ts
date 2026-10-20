import { describe, expect, it } from 'vitest';
import type { PredictedBlock } from './predict-day';
import { predictedItemTip, predictedLayout, predictionSince, predictionText } from './predicted-view';

const TZ = 'Pacific/Auckland';
const NOW = new Date('2026-10-13T00:30:00Z');
const block = (
  kind: PredictedBlock['kind'],
  startedAt: string,
  endedAt: string,
  continuesRunning = false,
  windows: Pick<PredictedBlock, 'startWindow' | 'endWindow'> = {},
): PredictedBlock => ({ kind, startedAt, endedAt, continuesRunning, ...windows });

describe('predictionSince', () => {
  it('looks back seven days from the start of the hour so the query stays cached', () => {
    expect(predictionSince(new Date('2026-10-13T09:47:12Z'))).toBe('2026-10-06T09:00:00Z');
  });
});

describe('predictionText', () => {
  it('says when a running nap will likely end', () => {
    const blocks = [block('sleep', '2026-10-13T00:00:00Z', '2026-10-13T01:20:00Z', true)];
    expect(predictionText(blocks, NOW, TZ)).toBe('Likely awake around 2:20 pm');
  });

  it('says when the next nap will likely start', () => {
    const blocks = [
      block('feed', '2026-10-13T00:00:00Z', '2026-10-13T00:40:00Z', true),
      block('sleep', '2026-10-13T00:50:00Z', '2026-10-13T02:00:00Z'),
    ];
    expect(predictionText(blocks, NOW, TZ)).toBe('Likely asleep around 1:50 pm');
  });

  it('gives a wake-up range when the running nap has a wide one', () => {
    const blocks = [
      block('sleep', '2026-10-13T00:00:00Z', '2026-10-13T01:20:00Z', true, {
        endWindow: { from: '2026-10-13T01:00:00Z', to: '2026-10-13T01:40:00Z' },
      }),
    ];
    expect(predictionText(blocks, NOW, TZ)).toBe('Likely awake 2:00 pm–2:40 pm');
  });

  it('rounds a narrow range down to a single time', () => {
    const blocks = [
      block('sleep', '2026-10-13T00:50:00Z', '2026-10-13T02:00:00Z', false, {
        startWindow: { from: '2026-10-13T00:48:00Z', to: '2026-10-13T00:55:00Z' },
      }),
    ];
    expect(predictionText(blocks, NOW, TZ)).toBe('Likely asleep around 1:50 pm');
  });

  it('describes the sleep window relative to now', () => {
    const startWindow = { from: '2026-10-13T00:40:00Z', to: '2026-10-13T01:05:00Z' };
    const blocks = [block('sleep', '2026-10-13T00:50:00Z', '2026-10-13T02:00:00Z', false, { startWindow })];
    expect(predictionText(blocks, new Date('2026-10-13T00:30:00Z'), TZ)).toBe('Next sleep likely 1:40 pm–2:05 pm');
    expect(predictionText(blocks, new Date('2026-10-13T00:50:00Z'), TZ)).toBe('Sleep window open until 2:05 pm');
    expect(predictionText(blocks, new Date('2026-10-13T01:10:00Z'), TZ)).toBe(
      'Past the usual sleep window, likely ready now',
    );
  });

  it('says nothing without a prediction', () => {
    expect(predictionText(null, NOW, TZ)).toBeNull();
    expect(predictionText([], NOW, TZ)).toBeNull();
  });
});

describe('predictedLayout', () => {
  const window = { start: new Date('2026-10-12T18:00:00Z'), end: new Date('2026-10-13T18:00:00Z') };
  const now = new Date('2026-10-13T00:00:00Z');

  it('places blocks in their lanes and fades the ones further ahead', () => {
    const layout = predictedLayout(
      [
        block('sleep', '2026-10-13T00:00:00Z', '2026-10-13T01:12:00Z', true),
        block('feed', '2026-10-13T01:20:00Z', '2026-10-13T02:00:00Z'),
        block('sleep', '2026-10-13T04:00:00Z', '2026-10-13T05:00:00Z'),
      ],
      window,
      now,
      TZ,
    );
    expect(layout.sleep.map((item) => [item.startFrac, item.endFrac, item.opacity])).toEqual([
      [0.25, 0.3, 1],
      [5 / 12, 11 / 24, 0.35],
    ]);
    expect(layout.feeds).toHaveLength(1);
    expect(layout.feeds[0]!.label).toBe('Likely feeding 2:20 pm–3:00 pm');
  });

  it('clips blocks to the day and drops ones after it', () => {
    const layout = predictedLayout(
      [
        block('sleep', '2026-10-13T17:00:00Z', '2026-10-13T19:00:00Z'),
        block('feed', '2026-10-13T19:00:00Z', '2026-10-13T19:30:00Z'),
      ],
      window,
      now,
      TZ,
    );
    expect(layout.sleep[0]!.endFrac).toBe(1);
    expect(layout.feeds).toEqual([]);
  });

  it('draws the likely range as a band and explains it in the tip', () => {
    const layout = predictedLayout(
      [
        block('sleep', '2026-10-13T00:00:00Z', '2026-10-13T01:12:00Z', true, {
          endWindow: { from: '2026-10-13T01:00:00Z', to: '2026-10-13T01:30:00Z' },
        }),
        block('sleep', '2026-10-13T04:00:00Z', '2026-10-13T05:00:00Z', false, {
          startWindow: { from: '2026-10-13T03:00:00Z', to: '2026-10-13T04:30:00Z' },
        }),
        block('feed', '2026-10-13T17:30:00Z', '2026-10-13T18:00:00Z', false, {
          startWindow: { from: '2026-10-13T17:00:00Z', to: '2026-10-13T19:00:00Z' },
        }),
      ],
      window,
      now,
      TZ,
    );
    expect(layout.sleep.map((item) => item.band)).toEqual([
      { startFrac: 7 / 24, endFrac: 7.5 / 24 },
      { startFrac: 9 / 24, endFrac: 10.5 / 24 },
    ]);
    expect(layout.feeds[0]!.band).toEqual({ startFrac: 23 / 24, endFrac: 1 });
    expect(layout.sleep[0]!.tip).toEqual({
      title: 'Sleep still going',
      lines: ['Likely ends around 2:12 pm', 'Could end 2:00 pm – 2:30 pm', 'Estimated from recent days'],
    });
    expect(layout.sleep[1]!.tip).toEqual({
      title: 'Likely sleep',
      lines: ['5:00 pm – 6:00 pm · 1h 00m', 'Could start 4:00 pm – 5:30 pm', 'Estimated from recent days'],
    });
  });

  it('leaves out the band and range line when the window is narrow or missing', () => {
    const plain = block('feed', '2026-10-13T01:20:00Z', '2026-10-13T02:00:00Z');
    expect(predictedItemTip(plain, TZ)).toEqual({
      title: 'Likely feed',
      lines: ['2:20 pm – 3:00 pm · 40m', 'Estimated from recent days'],
    });
    const layout = predictedLayout(
      [
        block('sleep', '2026-10-13T04:00:00Z', '2026-10-13T05:00:00Z', false, {
          startWindow: { from: '2026-10-13T03:58:00Z', to: '2026-10-13T04:03:00Z' },
        }),
      ],
      window,
      now,
      TZ,
    );
    expect(layout.sleep[0]!.band).toBeNull();
  });
});
