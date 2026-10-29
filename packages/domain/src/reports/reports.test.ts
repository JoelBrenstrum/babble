import { describe, expect, it } from 'vitest';
import { makeEvent } from '../events/test-events';
import { HOUR_MS, MINUTE_MS } from '../time/constants';
import { bucketing, reportDays } from './buckets';
import { donutSlices, lineGeometry } from './geometry';
import { reportCsv } from './csv';
import {
  allowedSplits,
  canAddMeasure,
  chartProblem,
  emptySpec,
  reportMeta,
  suggestChart,
  suggestedName,
  toggleMeasure,
  withChart,
} from './builder';
import { measureById, MEASURES } from './measures';
import { bucketReadout, runReport } from './report';
import type { ReportSettings } from './samples';
import { parseReportSpec, rangeNeedsPlus, type ReportSpec } from './spec';
import { REPORT_TEMPLATES } from './templates';

const settings: ReportSettings = {
  timeZone: 'UTC',
  dayStartMinutes: 0,
  nightStartMinutes: 19 * 60,
  nightEndMinutes: 7 * 60,
  mergeGapMs: 15_000,
  units: 'metric',
  birthDate: '2026-08-01',
  carers: { 'user-1': 'Joel', 'user-2': 'Sam' },
};
const NOW = new Date('2026-10-08T12:00:00Z');
const TODAY = '2026-10-08';

const spec = (overrides: Partial<ReportSpec>): ReportSpec => ({ ...emptySpec(), ...overrides });

const sleep = (startedAt: string, endedAt: string, extra: Record<string, unknown> = {}) =>
  makeEvent('sleep', { startedAt, endedAt, segments: [], ...extra });
const bottle = (startedAt: string, amountMl: number, amountLeftMl: number | null = null, createdBy = 'user-1') =>
  makeEvent('bottle', { startedAt, details: { content: 'formula', amountMl, amountLeftMl }, createdBy });
const feed = (startedAt: string, minutes: number) =>
  makeEvent('breast_feed', {
    startedAt,
    endedAt: new Date(Date.parse(startedAt) + minutes * MINUTE_MS).toISOString(),
    segments: [
      { side: 'left', startedAt, endedAt: new Date(Date.parse(startedAt) + minutes * MINUTE_MS).toISOString() },
    ],
  });

describe('parseReportSpec', () => {
  it('round-trips a valid spec and drops what it cannot read', () => {
    const parsed = parseReportSpec({
      version: 1,
      range: { preset: '30d' },
      bucket: 'day',
      series: [{ measure: 'sleep.total', aggregate: 'sum', label: ' Asleep ' }],
      splitBy: 'location',
      chart: 'bar',
      compare: 'previous',
      filters: [
        { key: 'location', values: ['cot'] },
        { key: 'text', text: ' ' },
        { key: 'nope', values: [] },
      ],
      options: { average: 7, stack: false, bogus: true },
    });
    expect(parsed).toEqual({
      version: 1,
      range: { preset: '30d' },
      bucket: 'day',
      series: [{ measure: 'sleep.total', aggregate: 'sum', label: 'Asleep' }],
      splitBy: 'location',
      chart: 'bar',
      compare: 'previous',
      filters: [{ key: 'location', values: ['cot'] }],
      options: { average: 7, stack: false },
    });
  });

  it('rejects other versions, unknown charts, bad ranges and too many series', () => {
    const base = { version: 1, range: { preset: '7d' }, bucket: 'day', series: [], chart: 'bar' };
    expect(parseReportSpec({ ...base, version: 2 })).toBeNull();
    expect(parseReportSpec({ ...base, chart: 'pie' })).toBeNull();
    expect(parseReportSpec({ ...base, range: { from: '2026-10-05', to: '2026-10-01' } })).toBeNull();
    expect(
      parseReportSpec({ ...base, series: Array.from({ length: 5 }, () => ({ measure: 'feeds.count' })) }),
    ).toBeNull();
    expect(parseReportSpec({ ...base, range: { from: '2026-10-01', to: '2026-10-05' } })?.range).toEqual({
      from: '2026-10-01',
      to: '2026-10-05',
    });
  });

  it('needs Plus for long ranges', () => {
    expect(rangeNeedsPlus({ preset: '30d' })).toBe(false);
    expect(rangeNeedsPlus({ preset: '90d' })).toBe(true);
    expect(rangeNeedsPlus({ preset: 'all' })).toBe(true);
    expect(rangeNeedsPlus({ from: '2026-09-01', to: '2026-09-20' })).toBe(false);
    expect(rangeNeedsPlus({ from: '2026-08-01', to: '2026-09-20' })).toBe(true);
  });
});

describe('reportDays and bucketing', () => {
  it('resolves presets and clamps custom ranges to today', () => {
    expect(reportDays({ preset: '7d' }, TODAY, '2026-08-01')).toHaveLength(7);
    expect(reportDays({ preset: 'all' }, TODAY, '2026-10-05')).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
    ]);
    expect(reportDays({ from: '2026-10-06', to: '2026-10-20' }, TODAY, '2026-08-01')).toEqual([
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
    ]);
  });

  it('splits an interval across hour buckets and groups days into weeks', () => {
    const hours = bucketing('hour', ['2026-10-07', '2026-10-08'], settings);
    const pieces = hours.splitInterval({
      start: Date.parse('2026-10-07T22:30:00Z'),
      end: Date.parse('2026-10-08T00:15:00Z'),
    });
    expect(pieces.map((piece) => [piece.index, piece.interval.end - piece.interval.start])).toEqual([
      [22, 30 * MINUTE_MS],
      [23, HOUR_MS],
      [0, 15 * MINUTE_MS],
    ]);

    const weeks = bucketing('week', reportDays({ preset: '14d' }, TODAY, '2026-08-01'), settings);
    expect(weeks.defs.map((def) => def.days)).toEqual([7, 7]);
    expect(weeks.defs[1]!.title).toBe('Week of 2 Oct');
    expect(weeks.indexOfDay('2026-10-03')).toBe(1);
    expect(weeks.indexOfDay('2026-09-20')).toBe(-1);

    const weekdays = bucketing('weekday', ['2026-10-05', '2026-10-06', '2026-10-12'], settings);
    expect(weekdays.defs.map((def) => def.days)).toEqual([2, 1, 0, 0, 0, 0, 0]);
  });
});

describe('runReport', () => {
  it('clips sleep across day boundaries and into the night window', () => {
    const events = [
      sleep('2026-10-06T22:00:00Z', '2026-10-07T06:00:00Z'),
      sleep('2026-10-07T10:00:00Z', '2026-10-07T11:30:00Z'),
    ];
    const total = runReport(
      spec({ range: { preset: '7d' }, series: [{ measure: 'sleep.total' }] }),
      events,
      TODAY,
      NOW,
      settings,
    );
    const byDay = Object.fromEntries(
      total.buckets.map((bucket, index) => [bucket.key, total.series[0]!.values[index]]),
    );
    expect(byDay['2026-10-06']).toBe(2 * HOUR_MS);
    expect(byDay['2026-10-07']).toBe(7.5 * HOUR_MS);

    const night = runReport(
      spec({ range: { preset: '7d' }, series: [{ measure: 'sleep.night' }, { measure: 'sleep.nap' }] }),
      events,
      TODAY,
      NOW,
      settings,
    );
    const index = night.buckets.findIndex((bucket) => bucket.key === '2026-10-07');
    expect(night.series[0]!.values[index]).toBe(6 * HOUR_MS);
    expect(night.series[1]!.values[index]).toBe(1.5 * HOUR_MS);
    expect(night.max).toBe(7.5 * HOUR_MS);
  });

  it('splits one measure by a detail and labels the series', () => {
    const events = [
      sleep('2026-10-07T10:00:00Z', '2026-10-07T11:00:00Z', {
        details: {
          locations: ['cot'],
          fallAsleep: null,
          startMoods: [],
          endMoods: [],
          wokenByCarer: false,
          quality: null,
        },
      }),
      sleep('2026-10-07T13:00:00Z', '2026-10-07T13:30:00Z', {
        details: {
          locations: ['pram'],
          fallAsleep: null,
          startMoods: [],
          endMoods: [],
          wokenByCarer: false,
          quality: null,
        },
      }),
      sleep('2026-10-07T15:00:00Z', '2026-10-07T15:30:00Z', {
        details: { locations: [], fallAsleep: null, startMoods: [], endMoods: [], wokenByCarer: false, quality: null },
      }),
    ];
    const result = runReport(
      spec({ range: { preset: '7d' }, series: [{ measure: 'sleep.total' }], splitBy: 'location', chart: 'donut' }),
      events,
      TODAY,
      NOW,
      settings,
    );
    expect(result.series.map((series) => series.label)).toEqual(['Cot', 'Pram', 'Not set']);
    const slices = donutSlices(result, 60, 16);
    expect(slices.map((slice) => Math.round(slice.fraction * 100))).toEqual([50, 25, 25]);
  });

  it('counts feeds per hour into a heatmap grid and per day at week buckets', () => {
    const events = Array.from({ length: 14 }, (_, index) =>
      bottle(`2026-10-0${1 + Math.floor(index / 2)}T${index % 2 ? '14' : '02'}:00:00Z`, 60),
    );
    const heat = runReport(
      spec({ range: { preset: '7d' }, bucket: 'hour', chart: 'heatmap', series: [{ measure: 'feeds.count' }] }),
      events,
      TODAY,
      NOW,
      settings,
    );
    expect(heat.grid?.rows).toHaveLength(7);
    expect(heat.grid?.values[0]![2]).toBe(1);
    expect(heat.grid?.values[0]![14]).toBe(1);
    expect(heat.grid?.max).toBe(1);
    expect(heat.series[0]!.values[2]).toBeCloseTo(6 / 7);

    const weekly = runReport(
      spec({ range: { preset: '14d' }, bucket: 'week', series: [{ measure: 'feeds.count' }] }),
      events,
      TODAY,
      NOW,
      settings,
    );
    expect(weekly.series[0]!.values.map((value) => Math.round((value ?? 0) * 100) / 100)).toEqual([0.29, 1.71]);
    expect(weekly.figures[0]).toMatchObject({ label: 'Per day', value: '1.1' });
  });

  it('measures bottle volume less what was left and splits by carer with names', () => {
    const events = [
      bottle('2026-10-07T08:00:00Z', 120, 20, 'user-1'),
      bottle('2026-10-07T12:00:00Z', 90, null, 'user-2'),
      bottle('2026-10-07T16:00:00Z', 60, null, 'user-9'),
    ];
    const result = runReport(
      spec({ range: { preset: '7d' }, series: [{ measure: 'feeds.bottleMl' }], splitBy: 'carer' }),
      events,
      TODAY,
      NOW,
      settings,
    );
    expect(result.series.map((series) => [series.label, series.total])).toEqual([
      ['Joel', 100 / 6],
      ['Sam', 90 / 6],
      ['Former carer', 60 / 6],
    ]);
    expect(result.series.map((series) => series.tone)).toEqual(['person-1', 'person-2', 'person-3']);
  });

  it('builds a histogram of gaps between feeds with a median', () => {
    const events = ['06:00', '08:30', '11:00', '15:00'].map((time) => bottle(`2026-10-07T${time}:00Z`, 60));
    const result = runReport(
      spec({ range: { preset: '7d' }, chart: 'histogram', series: [{ measure: 'feeds.gap' }] }),
      events,
      TODAY,
      NOW,
      settings,
    );
    expect(result.distribution?.count).toBe(3);
    expect(result.distribution?.median).toBe(2.5 * HOUR_MS);
    expect(result.distribution?.width).toBe(30 * MINUTE_MS);
    expect(result.distribution?.bins.reduce((total, bin) => total + bin.count, 0)).toBe(3);
    expect(result.figures.map((figure) => figure.label)).toContain('Median');
  });

  it('compares with the previous period and reads out a bucket', () => {
    const events = [
      feed('2026-10-07T08:00:00Z', 20),
      feed('2026-10-07T12:00:00Z', 10),
      feed('2026-09-30T08:00:00Z', 30),
    ];
    const result = runReport(
      spec({ range: { preset: '7d' }, series: [{ measure: 'feeds.breast' }], compare: 'previous' }),
      events,
      TODAY,
      NOW,
      settings,
    );
    expect(result.compare?.label).toBe('Previous 7 days');
    expect(result.compare?.series[0]!.values.reduce<number>((total, value) => total + (value ?? 0), 0)).toBe(1);
    expect(result.figures[0]!.delta).toBe('Up 0.2');
    const index = result.buckets.findIndex((bucket) => bucket.key === '2026-10-07');
    expect(bucketReadout(result, index, 'metric')).toEqual(['Wed 7 Oct', 'Breastfeeds 2', 'Breastfeeds before 1']);
  });

  it('drops empty days, accumulates and smooths when asked', () => {
    const events = [bottle('2026-10-05T08:00:00Z', 50), bottle('2026-10-07T08:00:00Z', 70)];
    const result = runReport(
      spec({
        range: { preset: '7d' },
        series: [{ measure: 'feeds.bottleMl' }],
        options: { emptyDays: false, cumulative: true, average: 7 },
      }),
      events,
      TODAY,
      NOW,
      settings,
    );
    expect(result.buckets.map((bucket) => bucket.key)).toEqual(['2026-10-05', '2026-10-07']);
    expect(result.series[0]!.values).toEqual([50, 120]);
    expect(result.series[0]!.average).toHaveLength(2);
  });

  it('draws rhythm rows as fractions of each day', () => {
    const events = [sleep('2026-10-07T06:00:00Z', '2026-10-07T12:00:00Z'), bottle('2026-10-07T18:00:00Z', 60)];
    const result = runReport(
      spec({
        range: { preset: '7d' },
        chart: 'rhythm',
        series: [{ measure: 'sleep.total' }, { measure: 'feeds.count' }],
      }),
      events,
      TODAY,
      NOW,
      settings,
    );
    const row = result.rhythm?.find((item) => item.dayKey === '2026-10-07');
    expect(row?.blocks.map((block) => [block.type, block.start, block.end])).toEqual([
      ['sleep', 0.25, 0.5],
      ['bottle', 0.75, 0.75],
    ]);
  });

  it('is empty with no matching entries and ignores deleted ones', () => {
    const events = [bottle('2026-10-07T08:00:00Z', 50)];
    const deleted = { ...events[0]!, deletedAt: '2026-10-07T09:00:00Z' };
    expect(runReport(spec({ series: [{ measure: 'feeds.bottleMl' }] }), [deleted], TODAY, NOW, settings).empty).toBe(
      true,
    );
    expect(
      runReport(
        spec({ series: [{ measure: 'feeds.bottleMl' }], filters: [{ key: 'bottleContent', values: ['breast_milk'] }] }),
        events,
        TODAY,
        NOW,
        settings,
      ).empty,
    ).toBe(true);
    expect(
      runReport(
        spec({ series: [{ measure: 'feeds.bottleMl' }], filters: [{ key: 'bottleContent', values: ['formula'] }] }),
        events,
        TODAY,
        NOW,
        settings,
      ).empty,
    ).toBe(false);
  });

  it('runs every template and every measure without throwing', () => {
    const events = [
      sleep('2026-10-06T22:00:00Z', '2026-10-07T06:00:00Z'),
      feed('2026-10-07T08:00:00Z', 20),
      bottle('2026-10-07T12:00:00Z', 90),
      makeEvent('nappy', { startedAt: '2026-10-07T09:00:00Z' }),
      makeEvent('pump', {
        startedAt: '2026-10-07T10:00:00Z',
        details: { leftMl: 40, rightMl: 50, totalMl: null },
        segments: [],
      }),
      makeEvent('solids', {
        startedAt: '2026-10-07T11:00:00Z',
        details: { foods: ['Pear'], amount: 'some', reaction: 'liked' },
      }),
      makeEvent('growth', {
        startedAt: '2026-10-01T09:00:00Z',
        details: { weightG: 5000, lengthMm: 600, headCircumferenceMm: 400 },
      }),
      makeEvent('growth', {
        startedAt: '2026-10-08T09:00:00Z',
        details: { weightG: 5210, lengthMm: 610, headCircumferenceMm: 405 },
      }),
      makeEvent('custom', { startedAt: '2026-10-07T13:00:00Z', details: { title: 'Vaccine', description: '' } }),
    ];
    for (const template of REPORT_TEMPLATES) {
      expect(parseReportSpec(template.spec)).toEqual(template.spec);
      expect(chartProblem(template.spec, template.spec.chart)).toBeNull();
      const result = runReport(template.spec, events, TODAY, NOW, settings);
      expect(result.series.length).toBeGreaterThan(0);
    }
    for (const measure of MEASURES) {
      const result = runReport(
        spec({ range: { preset: '14d' }, series: [{ measure: measure.id }] }),
        events,
        TODAY,
        NOW,
        settings,
      );
      expect(result.unit).toBe(measure.unit);
    }
    const gain = runReport(
      spec({ range: { preset: '14d' }, series: [{ measure: 'growth.gain' }] }),
      events,
      TODAY,
      NOW,
      settings,
    );
    expect(gain.series[0]!.total).toBe(210);
  });
});

describe('builder', () => {
  it('explains which charts fit and suggests one', () => {
    const one = spec({ series: [{ measure: 'feeds.count' }] });
    expect(chartProblem(one, 'donut')).toBe('Donut needs a split or a second measure');
    expect(chartProblem(one, 'heatmap')).toBe('Heatmap needs Hour of day');
    expect(chartProblem(one, 'histogram')).toBe('Histogram needs a per-entry measure');
    expect(chartProblem(emptySpec(), 'bar')).toBe('Pick a measure first');
    expect(suggestChart({ ...one, bucket: 'hour' })).toBe('heatmap');
    expect(suggestChart(spec({ series: [{ measure: 'sleep.length' }] }))).toBe('histogram');
    expect(suggestChart(spec({ series: [{ measure: 'sleep.night' }, { measure: 'sleep.nap' }] }))).toBe('area');
    expect(suggestChart(spec({ series: [{ measure: 'sleep.wake' }] }))).toBe('histogram');
    expect(suggestChart(spec({ series: [{ measure: 'growth.weight' }] }))).toBe('line');
    expect(withChart(one, 'heatmap').bucket).toBe('hour');
  });

  it('keeps measures compatible and resets splits that no longer apply', () => {
    const sleepTotal = measureById('sleep.total')!;
    const bottleMl = measureById('feeds.bottleMl')!;
    let current = toggleMeasure(emptySpec(), sleepTotal);
    expect(allowedSplits(current)).toContain('location');
    current = { ...current, splitBy: 'location' };
    expect(canAddMeasure(current, bottleMl)).toBe('Remove the split to add another measure');
    current = { ...current, splitBy: undefined };
    expect(canAddMeasure(current, bottleMl)).toBe('Mix measures with the same unit as Time asleep');
    expect(canAddMeasure(current, sleepTotal)).toBe('Already added');
    current = toggleMeasure({ ...current, splitBy: 'location', chart: 'donut' }, measureById('sleep.night')!);
    expect(current.splitBy).toBeUndefined();
    expect(current.chart).toBe('donut');
    expect(suggestedName(current)).toBe('Time asleep and Night sleep, 30 days');
    expect(suggestedName(spec({ series: [{ measure: 'feeds.count' }], bucket: 'hour' }))).toBe(
      'Feeds by hour of day, 30 days',
    );
    expect(
      reportMeta(
        spec({ series: [{ measure: 'sleep.total' }], splitBy: 'location', filters: [{ key: 'text', text: 'x' }] }),
      ),
    ).toBe('30 days · by location · 1 filter');
  });
});

describe('geometry and csv', () => {
  it('lays out lines within the chart size and exports rows', () => {
    const events = [bottle('2026-10-06T08:00:00Z', 50), bottle('2026-10-07T08:00:00Z', 100)];
    const result = runReport(
      spec({ range: { preset: '7d' }, chart: 'line', series: [{ measure: 'feeds.bottleMl' }] }),
      events,
      TODAY,
      NOW,
      settings,
    );
    const geometry = lineGeometry(
      result,
      { width: 300, height: 100, pad: { left: 0, right: 0, top: 10, bottom: 0 } },
      false,
    );
    expect(geometry.series[0]!.points).toHaveLength(7);
    const top = geometry.series[0]!.points.find((point) => point.index === 5)!;
    expect(top.y).toBe(10);
    expect(geometry.baseline).toBe(100);
    const csv = reportCsv(result, 'metric');
    expect(csv.split('\n')[0]).toBe('Bucket,Bottle volume');
    expect(csv.split('\n')).toHaveLength(8);
    expect(csv).toContain('Wed 7 Oct,100 ml');
  });
});
