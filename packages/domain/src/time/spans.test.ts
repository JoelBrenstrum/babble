import { describe, expect, it } from 'vitest';
import { joinSpans } from './spans';

describe('joinSpans', () => {
  const within = (gapMs: number) => gapMs <= 5;

  it('extends a span over a following one that starts within the gap', () => {
    expect(
      joinSpans(
        [
          { start: 0, end: 10 },
          { start: 15, end: 20 },
          { start: 30, end: 40 },
        ],
        within,
      ),
    ).toEqual([
      { start: 0, end: 20 },
      { start: 30, end: 40 },
    ]);
  });

  it('sorts by start first and keeps the furthest end', () => {
    expect(
      joinSpans(
        [
          { start: 12, end: 14 },
          { start: 0, end: 30 },
        ],
        within,
      ),
    ).toEqual([{ start: 0, end: 30 }]);
  });

  it('leaves the input untouched', () => {
    const spans = [
      { start: 0, end: 10 },
      { start: 11, end: 20 },
    ];
    joinSpans(spans, within);
    expect(spans).toEqual([
      { start: 0, end: 10 },
      { start: 11, end: 20 },
    ]);
  });
});
