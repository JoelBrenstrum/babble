import { describe, expect, it } from 'vitest';
import { growthChartGeometry } from './geometry';
import type { GrowthChart } from './growth';

const chart: GrowthChart = {
  key: 'weight',
  label: 'Weight',
  unit: 'kg',
  latest: { value: '4.00 kg', percentile: null, at: '2026-10-01T10:00:00Z' },
  points: [
    { months: 0, value: 3, reading: '3.00 kg', percentile: null, at: '2026-09-01T10:00:00Z' },
    { months: 1, value: 4, reading: '4.00 kg', percentile: null, at: '2026-10-01T10:00:00Z' },
  ],
  estimate: { months: 1.5, value: 4.5, reading: '4.50 kg', percentile: null },
  milestones: [{ months: 2, value: 5, reading: '5 kg', dayKey: '2026-11-01' }],
  curves: [
    {
      percentile: 50,
      points: [
        { months: 0, value: 3.2 },
        { months: 2, value: 5.2 },
      ],
    },
  ],
  xMax: 4,
  yMin: 2,
  yMax: 6,
};

const size = { width: 320, height: 180, pad: { left: 34, right: 8, top: 8, bottom: 22 } };

describe('growthChartGeometry', () => {
  const geometry = growthChartGeometry(chart, size);

  it('scales months across the plot width and values up the plot height', () => {
    expect(geometry.x(0)).toBe(34);
    expect(geometry.x(4)).toBe(312);
    expect(geometry.y(6)).toBe(8);
    expect(geometry.y(2)).toBe(158);
    expect(geometry.y(4)).toBe(83);
  });

  it('draws the measured line, the trend ahead of it and each percentile curve', () => {
    expect(geometry.measuredPath).toBe('M34.0,120.5 L103.5,83.0');
    expect(geometry.aheadPath).toBe('M103.5,83.0 L138.3,64.3 L173.0,45.5');
    expect(geometry.curves).toEqual([{ percentile: 50, d: 'M34.0,113.0 L173.0,38.0' }]);
  });

  it('positions the axis ticks', () => {
    expect(geometry.xTicks).toEqual([
      { months: 0, x: 34 },
      { months: 1, x: 103.5 },
      { months: 2, x: 173 },
      { months: 3, x: 242.5 },
      { months: 4, x: 312 },
    ]);
    expect(geometry.yTicks.map((tick) => tick.label)).toEqual(['2', '3', '4', '5', '6']);
    expect(geometry.yTicks[2]).toEqual({ value: 4, y: 83, label: '4' });
  });

  it('omits lines that need more than one point', () => {
    const single = growthChartGeometry(
      { ...chart, points: chart.points.slice(1), estimate: null, milestones: [] },
      size,
    );
    expect(single.measuredPath).toBeNull();
    expect(single.aheadPath).toBeNull();
  });
});
