import { describe, expect, it } from 'vitest';
import type { PredictedBlock } from './predict-day';
import { predictedLayout, predictionSince, predictionText } from './predicted-view';

const TZ = 'Pacific/Auckland';
const block = (kind: PredictedBlock['kind'], startedAt: string, endedAt: string, continuesRunning = false) => ({
  kind,
  startedAt,
  endedAt,
  continuesRunning,
});

describe('predictionSince', () => {
  it('looks back seven days from the start of the hour so the query stays cached', () => {
    expect(predictionSince(new Date('2026-10-13T09:47:12Z'))).toBe('2026-10-06T09:00:00Z');
  });
});

describe('predictionText', () => {
  it('says when a running nap will likely end', () => {
    const blocks = [block('sleep', '2026-10-13T00:00:00Z', '2026-10-13T01:20:00Z', true)];
    expect(predictionText(blocks, TZ)).toBe('Likely awake around 2:20 pm');
  });

  it('says when the next nap will likely start', () => {
    const blocks = [
      block('feed', '2026-10-13T00:00:00Z', '2026-10-13T00:40:00Z', true),
      block('sleep', '2026-10-13T00:50:00Z', '2026-10-13T02:00:00Z'),
    ];
    expect(predictionText(blocks, TZ)).toBe('Likely asleep around 1:50 pm');
  });

  it('says nothing without a prediction', () => {
    expect(predictionText(null, TZ)).toBeNull();
    expect(predictionText([], TZ)).toBeNull();
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
});
