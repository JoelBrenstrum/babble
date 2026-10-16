import { describe, expect, it } from 'vitest';
import { makeEvent } from '../events/test-events';
import {
  ageInMonths,
  estimateToday,
  formatPercentile,
  growthEstimateReadout,
  growthMilestoneText,
  growthPointReadout,
  growthReport,
  linearFit,
  lmsAt,
  nextMilestones,
  readoutEdge,
  normalCdf,
  valueAtZ,
  zForPercentile,
  zScore,
  type GrowthMeasure,
} from './growth';

const weigh = (startedAt: string, weightG: number | null, lengthMm: number | null = null) =>
  makeEvent('growth', { id: startedAt, startedAt, details: { weightG, lengthMm, headCircumferenceMm: null } });

describe('WHO maths', () => {
  it('reads the WHO table and interpolates between months', () => {
    expect(lmsAt('weight', 'male', 0)).toEqual([0.3487, 3.3464, 0.14602]);
    expect(lmsAt('weight', 'male', 0.5)![1]).toBeCloseTo((3.3464 + 4.4709) / 2);
    expect(lmsAt('weight', 'male', 25)).toBeNull();
  });

  it('puts the median at the 50th percentile', () => {
    const lms = lmsAt('weight', 'female', 6)!;
    expect(zScore(lms[1], lms)).toBeCloseTo(0);
    expect(normalCdf(0)).toBeCloseTo(0.5);
  });

  it('matches the published WHO percentiles', () => {
    const boyAtBirth = lmsAt('weight', 'male', 0)!;
    expect(valueAtZ(zForPercentile(5), boyAtBirth)).toBeCloseTo(2.604, 2);
    expect(valueAtZ(zForPercentile(95), boyAtBirth)).toBeCloseTo(4.215, 2);
    expect(normalCdf(zScore(4.214527, boyAtBirth)) * 100).toBeCloseTo(95, 1);
  });

  it('formats percentiles as ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 52, 0.4, 99.6].map(formatPercentile)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '52nd',
      'below 1st',
      'above 99th',
    ]);
  });

  it('measures age from the local date of the measurement', () => {
    expect(ageInMonths('2026-01-01', '2026-01-31T11:30:00Z', 'Pacific/Auckland')).toBeCloseTo(31 / (365.25 / 12));
  });
});

describe('readoutEdge', () => {
  it('keeps a readout inside the chart near either edge', () => {
    expect(readoutEdge(0.1)).toBe('left');
    expect(readoutEdge(0.5)).toBe('center');
    expect(readoutEdge(0.9)).toBe('right');
  });
});

describe('growthReport', () => {
  const baby = { birthDate: '2026-09-01', sex: 'female' as const, timeZone: 'UTC' };

  it('charts each measure with the latest value, percentile and WHO curves', () => {
    const report = growthReport(
      [weigh('2026-09-01T10:00:00Z', 3232, 491), weigh('2026-10-01T10:00:00Z', 4187)],
      baby,
      'metric',
    );
    expect(report.needsSex).toBe(false);
    expect(report.charts.map((chart) => chart.key)).toEqual(['weight', 'length']);
    const weight = report.charts[0]!;
    expect(weight.latest).toEqual({ value: '4.19 kg', percentile: '51st', at: '2026-10-01T10:00:00Z' });
    expect(weight.points).toHaveLength(2);
    expect(weight.points[0]).toMatchObject({ reading: '3.23 kg', percentile: '50th', at: '2026-09-01T10:00:00Z' });
    expect(growthPointReadout(weight.points[0]!, 'UTC')).toBe('1 Sept · 3.23 kg · 50th percentile');
    expect(growthPointReadout(weight.points[1]!, 'UTC')).toBe('1 Oct · 4.19 kg · 51st percentile');
    expect(weight.curves.map((curve) => curve.percentile)).toEqual([3, 15, 50, 85, 97]);
    expect(weight.xMax).toBe(3);
    expect(weight.curves[2]!.points[0]).toEqual({ months: 0, value: expect.closeTo(3.2322, 3) });
  });

  it('converts to pounds and inches', () => {
    const [weight] = growthReport([weigh('2026-10-01T10:00:00Z', 4536)], baby, 'imperial').charts;
    expect(weight!.unit).toBe('lb');
    expect(weight!.latest.value).toBe('10 lb 0 oz');
    expect(weight!.points[0]!.value).toBeCloseTo(10, 1);
  });

  it('asks for the sex before comparing with WHO', () => {
    const report = growthReport([weigh('2026-10-01T10:00:00Z', 4000)], { ...baby, sex: null }, 'metric');
    expect(report.needsSex).toBe(true);
    expect(report.charts[0]!.latest.percentile).toBeNull();
    expect(report.charts[0]!.curves).toEqual([]);
    expect(growthPointReadout(report.charts[0]!.points[0]!, 'UTC')).toBe('1 Oct · 4.00 kg');
  });

  it('has no percentile past two years but still charts the point', () => {
    const [weight] = growthReport([weigh('2028-12-01T10:00:00Z', 14000)], baby, 'metric').charts;
    expect(weight!.latest.percentile).toBeNull();
    expect(weight!.xMax).toBe(29);
    expect(weight!.curves[0]!.points.at(-1)!.months).toBe(24);
  });

  it('is empty without growth entries', () => {
    expect(growthReport([], baby, 'metric')).toEqual({ needsSex: false, charts: [] });
  });
});

describe('growth estimate for today', () => {
  const along = (percentile: number, months: number[], measure: GrowthMeasure = 'weight') => {
    const z = zForPercentile(percentile);
    return months.map((age) => ({ months: age, value: valueAtZ(z, lmsAt(measure, 'female', age)!) }));
  };

  it('fits a straight line', () => {
    const fit = linearFit([
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 5 },
    ])!;
    expect(fit.at(3)).toBeCloseTo(7);
    expect(linearFit([{ x: 1, y: 1 }])).toBeNull();
    expect(
      linearFit([
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ]),
    ).toBeNull();
  });

  it('follows the percentile a baby is tracking, so it bends with the WHO curve', () => {
    const estimate = estimateToday('weight', along(50, [1, 2, 3]), 'female', 4)!;
    const median = lmsAt('weight', 'female', 4)![1];
    expect(estimate.value).toBeCloseTo(median, 3);
    expect(normalCdf(estimate.z!) * 100).toBeCloseTo(50, 1);
  });

  it('carries a rising percentile forward', () => {
    const points = [...along(25, [1]), ...along(40, [2]), ...along(55, [3])];
    const estimate = estimateToday('weight', points, 'female', 4)!;
    expect(normalCdf(estimate.z!) * 100).toBeGreaterThan(65);
  });

  it('uses a straight line without a sex', () => {
    const points = [
      { months: 1, value: 4 },
      { months: 2, value: 5 },
      { months: 3, value: 6 },
    ];
    expect(estimateToday('weight', points, null, 3.5)).toEqual({ value: 6.5, z: null });
  });

  it('needs three measurements, and today must be after the last one but not months later', () => {
    expect(estimateToday('weight', along(50, [1, 2]), 'female', 3)).toBeNull();
    expect(estimateToday('weight', along(50, [1, 2, 3]), 'female', 3)).toBeNull();
    expect(estimateToday('weight', along(50, [1, 2, 3]), 'female', 7)).toBeNull();
  });

  it('adds the estimate to the chart only when asked', () => {
    const events = [
      weigh('2026-01-01T10:00:00Z', 3300),
      weigh('2026-02-01T10:00:00Z', 4300),
      weigh('2026-03-01T10:00:00Z', 5200),
    ];
    const baby = { birthDate: '2026-01-01', sex: 'female' as const, timeZone: 'UTC' };
    expect(growthReport(events, baby, 'metric').charts[0]!.estimate).toBeNull();
    const chart = growthReport(events, baby, 'metric', new Date('2026-03-20T10:00:00Z')).charts[0]!;
    expect(chart.estimate!.months).toBeCloseTo(ageInMonths('2026-01-01', '2026-03-20T10:00:00Z', 'UTC'));
    expect(chart.estimate!.reading).toMatch(/kg$/);
    expect(growthEstimateReadout(chart.estimate!)).toMatch(
      /^Estimate for today · \d\.\d+ kg · \d+(st|nd|rd|th) percentile$/,
    );
  });

  it('finds the next two round numbers the trend reaches', () => {
    const points = [
      { months: 1, value: 4 },
      { months: 2, value: 5 },
      { months: 3, value: 6 },
    ];
    expect(nextMilestones('weight', points, null, 3.5, 'metric')).toEqual([
      { target: 7, days: 16 },
      { target: 8, days: 46 },
    ]);
    expect(nextMilestones('weight', points, null, 3.5, 'imperial').map((item) => item.target)).toEqual([16, 18]);
    expect(nextMilestones('length', along(50, [1, 2, 3], 'length'), 'female', 3.2, 'metric')[0]!.target).toBe(65);
  });

  it('skips head size, a flat trend, a stale trend and too few measurements', () => {
    const flat = [
      { months: 1, value: 5 },
      { months: 2, value: 5 },
      { months: 3, value: 5 },
    ];
    expect(nextMilestones('head', along(50, [1, 2, 3], 'head'), 'female', 3.2, 'metric')).toEqual([]);
    expect(nextMilestones('weight', flat, null, 3.5, 'metric')).toEqual([]);
    expect(nextMilestones('weight', along(50, [1, 2, 3]), 'female', 7, 'metric')).toEqual([]);
    expect(nextMilestones('weight', along(50, [1, 2]), 'female', 2.5, 'metric')).toEqual([]);
  });

  it('dates milestones from today and only when asked', () => {
    const events = [
      weigh('2026-01-01T10:00:00Z', 3300),
      weigh('2026-02-01T10:00:00Z', 4300),
      weigh('2026-03-01T10:00:00Z', 5200),
    ];
    const baby = { birthDate: '2026-01-01', sex: 'female' as const, timeZone: 'UTC' };
    expect(growthReport(events, baby, 'metric').charts[0]!.milestones).toEqual([]);
    const [first, second] = growthReport(events, baby, 'metric', new Date('2026-03-20T10:00:00Z')).charts[0]!
      .milestones;
    expect(first!.reading).toBe('6 kg');
    expect(second!.reading).toBe('7 kg');
    expect(first!.dayKey > '2026-03-20' && second!.dayKey > first!.dayKey).toBe(true);
    expect(growthMilestoneText({ reading: '6 kg', dayKey: '2026-11-03' })).toBe('6 kg around 3 Nov');
  });
});
