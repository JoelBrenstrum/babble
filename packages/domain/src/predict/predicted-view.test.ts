import { describe, expect, it } from 'vitest';
import type { PredictedBlock } from './predict-day';
import { betweenTimes, predictedItemTip, predictedLayout, predictionSince, predictionText } from './predicted-view';

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

  it('stays honest when a running nap outlasts its estimate', () => {
    const endWindow = { from: '2026-10-13T01:00:00Z', to: '2026-10-13T01:40:00Z' };
    const blocks = [block('sleep', '2026-10-13T00:00:00Z', '2026-10-13T01:20:00Z', true, { endWindow })];
    expect(predictionText(blocks, new Date('2026-10-13T01:30:00Z'), TZ)).toBe('Likely awake by 2:40 pm');
    expect(predictionText(blocks, new Date('2026-10-13T01:45:00Z'), TZ)).toBe('Sleeping longer than usual');
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

  it('explains each block in its tip, including the range it could fall in', () => {
    const layout = predictedLayout(
      [
        block('sleep', '2026-10-13T00:00:00Z', '2026-10-13T01:12:00Z', true, {
          endWindow: { from: '2026-10-13T01:00:00Z', to: '2026-10-13T01:30:00Z' },
        }),
        block('sleep', '2026-10-13T04:00:00Z', '2026-10-13T05:00:00Z', false, {
          startWindow: { from: '2026-10-13T03:00:00Z', to: '2026-10-13T04:30:00Z' },
        }),
      ],
      window,
      now,
      TZ,
    );
    expect(layout.sleep[0]!.tip).toEqual({
      title: 'Still asleep',
      lines: [
        'Likely awake around 2:12 pm',
        'Recent sleeps ended between 2:00 and 2:30 pm.',
        'Based on the last few days',
      ],
    });
    expect(layout.sleep[1]!.tip).toEqual({
      title: 'Next sleep',
      lines: [
        'Likely from 5:00 pm to 6:00 pm (about 1h 00m)',
        'Around the usual time. Recent sleeps started between 4:00 and 5:30 pm.',
        'Based on the last few days',
      ],
    });
  });

  it('words a running feed as feeding rather than sleeping', () => {
    const feeding = block('feed', '2026-10-13T00:00:00Z', '2026-10-13T00:20:00Z', true, {
      endWindow: { from: '2026-10-13T00:10:00Z', to: '2026-10-13T00:35:00Z' },
    });
    expect(predictedItemTip(feeding, now, TZ)).toEqual({
      title: 'Still feeding',
      lines: [
        'Likely done around 1:20 pm',
        'Recent feeds ended between 1:10 and 1:35 pm.',
        'Based on the last few days',
      ],
    });
  });

  it('draws a sleep that has outlasted its estimate as an empty block and says so', () => {
    const running = block('sleep', '2026-10-13T00:00:00Z', '2026-10-12T23:40:00Z', true, {
      endWindow: { from: '2026-10-12T23:20:00Z', to: '2026-10-12T23:50:00Z' },
    });
    const layout = predictedLayout([running], window, now, TZ);
    expect(layout.sleep[0]).toMatchObject({ startFrac: 0.25, endFrac: 0.25 });
    expect(predictedItemTip(running, now, TZ).lines).toEqual([
      'Sleeping longer than usual',
      'Based on the last few days',
    ]);
    const within = { ...running, endWindow: { from: '2026-10-12T23:20:00Z', to: '2026-10-13T00:20:00Z' } };
    expect(predictedItemTip(within, now, TZ).lines[0]).toBe('Likely awake by 1:20 pm');
  });

  it('says whether the block falls later or earlier than its usual range', () => {
    const overdue = block('sleep', '2026-10-13T08:00:00Z', '2026-10-13T10:25:00Z', false, {
      startWindow: { from: '2026-10-13T05:43:00Z', to: '2026-10-13T06:08:00Z' },
    });
    expect(predictedItemTip(overdue, now, TZ).lines.slice(0, 2)).toEqual([
      'Likely from 9:00 pm to 11:25 pm (about 2h 25m)',
      'Later than usual. Recent sleeps started between 6:43 and 7:08 pm.',
    ]);
    const early = block('feed', '2026-10-13T02:00:00Z', '2026-10-13T02:30:00Z', false, {
      startWindow: { from: '2026-10-13T02:30:00Z', to: '2026-10-13T03:00:00Z' },
    });
    expect(predictedItemTip(early, now, TZ).lines[1]).toBe(
      'Earlier than usual. Recent feeds started between 3:30 and 4:00 pm.',
    );
  });

  it('leaves out the range line when the window is narrow or missing', () => {
    const plain = block('feed', '2026-10-13T01:20:00Z', '2026-10-13T02:00:00Z');
    expect(predictedItemTip(plain, now, TZ)).toEqual({
      title: 'Next feed',
      lines: ['Likely from 2:20 pm to 3:00 pm (about 40m)', 'Based on the last few days'],
    });
    const close = block('sleep', '2026-10-13T04:00:00Z', '2026-10-13T05:00:00Z', false, {
      startWindow: { from: '2026-10-13T03:58:00Z', to: '2026-10-13T04:03:00Z' },
    });
    expect(predictedItemTip(close, now, TZ).lines).toHaveLength(2);
  });
});

describe('betweenTimes', () => {
  it('writes am or pm once when both ends share it', () => {
    expect(betweenTimes({ from: '2026-10-12T20:15:00Z', to: '2026-10-12T20:47:00Z' }, TZ)).toBe(
      'between 9:15 and 9:47 am',
    );
  });

  it('keeps both when the range crosses midday', () => {
    expect(betweenTimes({ from: '2026-10-12T22:45:00Z', to: '2026-10-12T23:10:00Z' }, TZ)).toBe(
      'between 11:45 am and 12:10 pm',
    );
  });
});
