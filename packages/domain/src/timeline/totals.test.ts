import { describe, expect, it } from 'vitest';
import { summariseDay, summariseWeek } from '../events/day-summary';
import {
  countedDays,
  dayTotalCards,
  feedTimeSplit,
  formatDayRange,
  nappyKind,
  weekdayLabel,
  weekSummaryStrip,
  weekTableRows,
} from './totals';

const empty = summariseDay([], { start: new Date(0), end: new Date(1) });

describe('dayTotalCards', () => {
  it('formats each tracker and hides pumping when there was none', () => {
    const cards = dayTotalCards(
      {
        ...empty,
        sleepMs: 14 * 3_600_000 + 20 * 60_000,
        naps: 6,
        napMs: 7 * 3_600_000 + 15 * 60_000,
        feeds: 8,
        bottles: 1,
        bottleMl: 90,
        nappies: 7,
        wet: 5,
        dirty: 4,
        lastNappyAt: '2026-10-06T09:48:00Z',
      },
      'metric',
      'Pacific/Auckland',
    );
    expect(cards.map((card) => [card.label, card.value])).toEqual([
      ['Sleep', '14h 20m'],
      ['Feeds', '8'],
      ['Nappies', '7'],
    ]);
    expect(cards[0]!.details[0]).toEqual({ label: 'Naps', value: '6 · 7h 15m' });
    expect(cards[1]!.details.map((detail) => detail.label)).toEqual(['Left', 'Right', 'Idle', 'Bottle']);
    expect(cards[1]!.details[3]).toEqual({ label: 'Bottle', value: '1 · 90 ml' });
    expect(cards[2]!.details[2]).toEqual({ label: 'Last', value: '10:48 pm' });
  });

  it('adds pumping when there was some', () => {
    const cards = dayTotalCards(
      { ...empty, pumps: 2, pumpMl: 210, pumpLeftMl: 105, pumpRightMl: 105 },
      'metric',
      'UTC',
    );
    expect(cards.at(-1)).toMatchObject({ label: 'Pump', value: '210 ml' });
  });
});

describe('week summaries', () => {
  it('shows dashes for a week with no days yet', () => {
    expect(weekSummaryStrip(summariseWeek([])).map((item) => item.value)).toEqual(['—', '—', '—']);
  });

  it('builds the daily totals table with gaps for future days', () => {
    const days = [
      { ...empty, sleepMs: 14 * 3_600_000, feeds: 9, nappies: 8 },
      { ...empty, sleepMs: 13 * 3_600_000, feeds: 8, nappies: 7, bottleMl: 60 },
      null,
    ];
    const rows = weekTableRows(days, summariseWeek(days.filter((day) => day !== null)), 'metric');
    expect(rows.find((row) => row.key === 'feeds')).toEqual({
      key: 'feeds',
      label: 'Feeds',
      values: ['9', '8', null],
      average: '8.5',
    });
    expect(rows.find((row) => row.key === 'bottle')!.values).toEqual(['—', '60 ml', null]);
    expect(rows.find((row) => row.key === 'sleep')!.average).toBe('13h 30m');
    expect(rows.filter((row) => ['left', 'right', 'idle'].includes(row.key)).map((row) => row.label)).toEqual([
      'Left',
      'Right',
      'Idle',
    ]);
  });

  it('averages finished days, or today when the week has just started', () => {
    const keys = ['2026-10-05', '2026-10-06', '2026-10-07'];
    expect(countedDays(keys, '2026-10-07')).toEqual(['2026-10-05', '2026-10-06']);
    expect(countedDays(keys, '2026-10-05')).toEqual(['2026-10-05']);
  });
});

describe('labels', () => {
  it('names nappies', () => {
    expect(nappyKind({ wet: true, dirty: true })).toBe('Both');
    expect(nappyKind({ wet: false, dirty: true })).toBe('Dirty');
    expect(nappyKind({ wet: true, dirty: false })).toBe('Wet');
    expect(nappyKind({ wet: false, dirty: false })).toBe('Dry');
  });

  it('formats day ranges', () => {
    expect(formatDayRange(['2026-09-28', '2026-10-04'])).toBe('28 Sep – 4 Oct');
    expect(formatDayRange(['2026-10-05', '2026-10-11'])).toBe('5 – 11 Oct');
    expect(weekdayLabel('2026-10-05')).toEqual({ weekday: 'Mon', day: '5' });
  });
});

describe('feedTimeSplit', () => {
  it('splits breast time into left, right and idle', () => {
    expect(feedTimeSplit({ leftMs: 42 * 60_000, rightMs: 38 * 60_000, idleMs: 9 * 60_000 })).toBe(
      'L 42m · R 38m · idle 9m',
    );
  });

  it('leaves out idle under a minute, and shows a dash with no breastfeeds', () => {
    expect(feedTimeSplit({ leftMs: 600_000, rightMs: 0, idleMs: 20_000 })).toBe('L 10m · R 0m');
    expect(feedTimeSplit({ leftMs: 0, rightMs: 0, idleMs: 0 })).toBe('—');
  });
});
