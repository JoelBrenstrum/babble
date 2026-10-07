import { describe, expect, it } from 'vitest';
import { makeEvent } from '../events/test-events';
import { gapsBetween, rangeDays, statsReport, weeklyBars, type StatsSettings } from './stats';

const settings: StatsSettings = {
  timeZone: 'UTC',
  dayStartMinutes: 0,
  nightStartMinutes: 19 * 60,
  nightEndMinutes: 7 * 60,
  mergeGapMs: 15_000,
  units: 'metric',
};
const NOW = new Date('2026-10-08T12:00:00Z');
const at = (iso: string) => Date.parse(iso);

describe('rangeDays', () => {
  it('covers the last 7 or 30 days, or everything since birth', () => {
    expect(rangeDays('7d', '2026-10-08', '2026-01-01')).toHaveLength(7);
    expect(rangeDays('30d', '2026-10-08', '2026-01-01')[0]).toBe('2026-09-09');
    expect(rangeDays('all', '2026-10-08', '2026-10-05')).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
    ]);
  });
});

describe('gapsBetween', () => {
  const within = { start: new Date('2026-10-06T00:00:00Z'), end: new Date('2026-10-07T00:00:00Z') };

  it('averages gaps that start in range and ignores overlaps and long gaps', () => {
    const spans = [
      { start: at('2026-10-06T01:00:00Z'), end: at('2026-10-06T02:00:00Z') },
      { start: at('2026-10-06T04:00:00Z'), end: at('2026-10-06T05:00:00Z') },
      { start: at('2026-10-06T04:30:00Z'), end: at('2026-10-06T06:00:00Z') },
      { start: at('2026-10-06T09:00:00Z'), end: at('2026-10-06T10:00:00Z') },
      { start: at('2026-10-06T23:00:00Z'), end: at('2026-10-06T23:30:00Z') },
    ];
    expect(gapsBetween(spans, within)).toEqual({ totalMs: 5 * 3_600_000, count: 2 });
  });
});

describe('weeklyBars', () => {
  it('keeps daily bars for a month or less', () => {
    const bars = Array.from({ length: 30 }, (_, index) => ({ label: String(index), values: [index] }));
    expect(weeklyBars(bars)).toHaveLength(30);
  });

  it('averages longer ranges per week, ending on the latest day', () => {
    const bars = Array.from({ length: 35 }, (_, index) => ({ label: String(index), values: [index < 7 ? 7 : 14] }));
    const weeks = weeklyBars(bars);
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual({ label: '0', values: [7] });
    expect(weeks.at(-1)).toEqual({ label: '28', values: [14] });
  });
});

describe('statsReport', () => {
  const keys = ['2026-10-06', '2026-10-07', '2026-10-08'];
  const events = [
    makeEvent('sleep', { id: 's1', startedAt: '2026-10-06T20:00:00Z', endedAt: '2026-10-07T04:00:00Z' }),
    makeEvent('sleep', { id: 's2', startedAt: '2026-10-07T06:00:00Z', endedAt: '2026-10-07T08:00:00Z' }),
    makeEvent('sleep', { id: 's3', startedAt: '2026-10-07T13:00:00Z', endedAt: '2026-10-07T14:00:00Z' }),
    makeEvent('breast_feed', {
      id: 'f1',
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: '2026-10-06T10:35:00Z',
      segments: [
        { side: 'left', startedAt: '2026-10-06T10:00:00Z', endedAt: '2026-10-06T10:15:00Z' },
        { side: 'right', startedAt: '2026-10-06T10:20:00Z', endedAt: '2026-10-06T10:35:00Z' },
      ],
    }),
    makeEvent('bottle', {
      id: 'b1',
      startedAt: '2026-10-06T13:00:00Z',
      details: { content: 'formula', amountMl: 100, amountLeftMl: 0 },
    }),
    makeEvent('nappy', {
      id: 'n1',
      startedAt: '2026-10-07T09:00:00Z',
      details: { ...makeEvent('nappy').details, wet: true, dirty: true, pooColours: ['mustard'] },
    }),
    makeEvent('nappy', {
      id: 'n2',
      startedAt: '2026-10-08T09:00:00Z',
      details: { ...makeEvent('nappy').details, wet: true },
    }),
  ];
  const report = statsReport(events, keys, '2026-10-08', NOW, settings);
  const figure = (card: string, label: string) =>
    report.cards.find((item) => item.key === card)!.figures.find((item) => item.label === label)!.value;

  it('averages finished days only', () => {
    expect(report).toMatchObject({ days: 2, todayOnly: false });
    expect(figure('sleep', 'Per day')).toBe('5h 30m');
    expect(figure('feeds', 'Per day')).toBe('1');
    expect(figure('nappies', 'Dirty per day')).toBe('0.5');
  });

  it('measures stretches, wake windows, gaps, sides and downtime', () => {
    expect(figure('sleep', 'Longest stretch')).toBe('8h 00m');
    expect(figure('sleep', 'Wake window')).toBe('3h 30m');
    expect(figure('feeds', 'Average gap')).toBe('3h 00m');
    expect(figure('feeds', 'Left / right')).toBe('50% / 50%');
    expect(figure('feeds', 'Downtime per feed')).toBe('5m');
    expect(figure('feeds', 'Bottle per day')).toBe('50 ml');
  });

  it('charts each day and lists recent poo colours', () => {
    const sleep = report.cards[0]!.chart;
    expect(sleep).toMatchObject({ series: ['Night', 'Naps'], weekly: false, max: 7 });
    expect(sleep.bars.map((bar) => bar.label)).toEqual(keys);
    expect(sleep.bars[1]!.values).toEqual([5, 2]);
    expect(report.cards.find((card) => card.key === 'nappies')!.colours).toEqual(['mustard']);
  });

  it('starts from the first logged day, so empty days before it do not lower the averages', () => {
    const longer = statsReport(events, ['2026-10-01', '2026-10-02', ...keys], '2026-10-08', NOW, settings);
    expect(longer.days).toBe(2);
    expect(longer.cards[0]!.chart.bars[0]!.label).toBe('2026-10-06');
  });

  it('falls back to today when nothing earlier was logged', () => {
    const todayOnly = statsReport(
      events.filter((event) => event.id === 'n2'),
      keys,
      '2026-10-08',
      NOW,
      settings,
    );
    expect(todayOnly).toMatchObject({ days: 1, todayOnly: true });
    expect(todayOnly.cards[2]!.figures[0]!.value).toBe('1');
  });

  it('leaves imported feeds out of downtime, since they have none recorded', () => {
    const imported = events.map((event) =>
      event.id === 'f1' ? { ...event, source: 'huckleberry_csv' as const } : event,
    );
    const report = statsReport(imported, keys, '2026-10-08', NOW, settings);
    expect(report.cards[1]!.figures.find((item) => item.label === 'Downtime per feed')!.value).toBe('—');
  });

  it('shows a dash for bottles when there were none', () => {
    const report = statsReport(
      events.filter((event) => event.type !== 'bottle'),
      keys,
      '2026-10-08',
      NOW,
      settings,
    );
    expect(report.cards[1]!.figures.find((item) => item.label === 'Bottle per day')!.value).toBe('—');
  });

  it('only shows pumping when there was some', () => {
    expect(report.cards.map((card) => card.key)).toEqual(['sleep', 'feeds', 'nappies']);
  });
});
