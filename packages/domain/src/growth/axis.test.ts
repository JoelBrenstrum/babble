import { describe, expect, it } from 'vitest';
import { chartAxis, niceStep } from './axis';

describe('niceStep', () => {
  it.each([
    [4, 1],
    [10, 5],
    [100, 50],
    [3, 1],
    [0.8, 0.2],
  ])('range %f → step %f', (range, expected) => expect(niceStep(range)).toBeCloseTo(expected));
});

describe('chartAxis', () => {
  it('ticks the y axis on nice steps inside the range', () => {
    const { yTicks } = chartAxis({ yMin: 2, yMax: 12, xMax: 12 });
    expect(yTicks).toEqual([5, 10]);
  });

  it('spaces the months by how long the chart is', () => {
    expect(chartAxis({ yMin: 0, yMax: 10, xMax: 6 }).xTicks).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(chartAxis({ yMin: 0, yMax: 10, xMax: 12 }).xTicks).toEqual([0, 2, 4, 6, 8, 10, 12]);
    expect(chartAxis({ yMin: 0, yMax: 10, xMax: 24 }).xTicks).toEqual([0, 3, 6, 9, 12, 15, 18, 21, 24]);
    expect(chartAxis({ yMin: 0, yMax: 10, xMax: 36 }).xTicks).toEqual([0, 6, 12, 18, 24, 30, 36]);
  });
});
