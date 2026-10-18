import { describe, expect, it } from 'vitest';
import type { GrowthChart } from './growth';
import { growthReadout, milestoneIndex, milestoneKey } from './selection';

const chart: GrowthChart = {
  key: 'weight',
  label: 'Weight',
  unit: 'kg',
  latest: { value: '4.00 kg', percentile: '50th', at: '2026-10-01T10:00:00Z' },
  points: [{ months: 1, value: 4, reading: '4.00 kg', percentile: '50th', at: '2026-10-01T10:00:00Z' }],
  estimate: { months: 1.5, value: 4.5, reading: '4.50 kg', percentile: null },
  milestones: [{ months: 2, value: 5, reading: '5 kg', dayKey: '2026-11-01' }],
  curves: [],
  xMax: 4,
  yMin: 2,
  yMax: 6,
};

describe('milestone keys', () => {
  it('round-trips the milestone index', () => {
    expect(milestoneKey(1)).toBe('milestone-1');
    expect(milestoneIndex('milestone-1')).toBe(1);
    expect(milestoneIndex('estimate')).toBeNull();
    expect(milestoneIndex(0)).toBeNull();
    expect(milestoneIndex(null)).toBeNull();
  });
});

describe('growthReadout', () => {
  it('describes the selected point', () => {
    expect(growthReadout(chart, 0, 'UTC')).toEqual({
      point: chart.points[0],
      text: '1 Oct · 4.00 kg · 50th percentile',
    });
    expect(growthReadout(chart, 'estimate', 'UTC')).toEqual({
      point: chart.estimate,
      text: 'Estimate for today · 4.50 kg',
    });
    expect(growthReadout(chart, milestoneKey(0), 'UTC')).toEqual({
      point: chart.milestones[0],
      text: '5 kg around 1 Nov',
    });
  });

  it('is empty for nothing selected or a point that is not there', () => {
    expect(growthReadout(chart, null, 'UTC')).toBeNull();
    expect(growthReadout(chart, 3, 'UTC')).toBeNull();
    expect(growthReadout(chart, milestoneKey(4), 'UTC')).toBeNull();
    expect(growthReadout({ ...chart, estimate: null }, 'estimate', 'UTC')).toBeNull();
  });
});
