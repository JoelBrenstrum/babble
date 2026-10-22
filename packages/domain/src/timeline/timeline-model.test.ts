import { describe, expect, it } from 'vitest';
import { makeEvent } from '../events/test-events';
import { timelineModel, timelineRange, type TimelineView } from './timeline-model';

const baby = { timezone: 'Pacific/Auckland', day_start_minutes: 420, birth_date: '2026-10-01' };
const settings = { downtime_merge_threshold_sec: 30, night_start_minutes: 1140, night_end_minutes: 420 };
const now = new Date('2026-10-08T03:00:00Z');

const events = [
  makeEvent('sleep', { id: 'night', startedAt: '2026-10-07T20:00:00Z', endedAt: '2026-10-08T02:00:00Z', segments: [] }),
  makeEvent('bottle', { id: 'bottle', startedAt: '2026-10-08T01:00:00Z', endedAt: '2026-10-08T01:00:00Z' }),
  makeEvent('nappy', { id: 'nappy', startedAt: '2026-10-06T01:00:00Z', endedAt: '2026-10-06T01:00:00Z' }),
];
const model = (view: TimelineView, date?: string) => timelineModel({ view, date, events, settings, baby, now });

describe('timelineRange', () => {
  it('covers one day and navigates by one', () => {
    const range = timelineRange({ view: 'day', date: undefined, baby, now });
    expect(range).toMatchObject({
      todayKey: '2026-10-08',
      dayKey: '2026-10-08',
      keys: ['2026-10-08'],
      from: '2026-10-07T18:00:00.000Z',
      to: '2026-10-08T18:00:00.000Z',
      previousKey: '2026-10-07',
      nextKey: '2026-10-08',
      canGoNext: false,
      rangeLabel: 'Today',
    });
  });

  it('clamps a future date to today and allows going forward from the past', () => {
    expect(timelineRange({ view: 'day', date: '2026-12-01', baby, now }).dayKey).toBe('2026-10-08');
    const past = timelineRange({ view: 'day', date: '2026-10-05', baby, now });
    expect(past).toMatchObject({
      canGoNext: true,
      nextKey: '2026-10-06',
      previousKey: '2026-10-04',
      rangeLabel: 'Mon 5 Oct',
    });
  });

  it('steps a week at a time and never goes past today', () => {
    const range = timelineRange({ view: '7d', date: '2026-10-04', baby, now });
    expect(range.keys).toHaveLength(7);
    expect(range.previousKey).toBe('2026-09-27');
    expect(range.nextKey).toBe('2026-10-08');
    expect(range.rangeLabel).toBe('28 Sep – 4 Oct');
  });

  it('starts a month at birth', () => {
    const range = timelineRange({ view: '30d', date: undefined, baby, now });
    expect(range.keys[0]).toBe('2026-10-01');
    expect(range.keys.at(-1)).toBe('2026-10-08');
  });

  it('quantises the rolling 24 hours to the minute so the query key holds still', () => {
    const a = timelineRange({ view: '24h', date: undefined, baby, now: new Date('2026-10-08T03:00:10.250Z') });
    const b = timelineRange({ view: '24h', date: undefined, baby, now: new Date('2026-10-08T03:00:40.900Z') });
    expect(a.from).toBe('2026-10-07T03:00:00.000Z');
    expect(a.to).toBe('2026-10-08T03:01:00.000Z');
    expect([b.from, b.to]).toEqual([a.from, a.to]);
  });
});

describe('timelineModel', () => {
  it('returns a day with its summary, layout and now marker', () => {
    const result = model('day');
    if (result.view !== 'day') throw new Error('expected the day view');
    expect(result.day.summary.sleepMs).toBe(6 * 3_600_000);
    expect(result.day.layout.feeds.map((item) => item.event.id)).toEqual(['bottle']);
    expect(result.day.events.map((event) => event.id)).toContain('bottle');
    expect(result.nowFrac).toBeCloseTo((9 * 3_600_000) / (24 * 3_600_000), 5);
    expect(result.ticks[0]).toEqual({ frac: 0, label: '07' });
    expect(result.ticks).toHaveLength(25);
    expect(result.ticks.filter((tick) => tick.minor)).toHaveLength(16);
  });

  it('has no now marker for a past day', () => {
    const result = model('day', '2026-10-07');
    expect(result.view === 'day' && result.nowFrac).toBeNull();
  });

  it('returns the rolling window with its own summary and ticks', () => {
    const result = model('24h');
    if (result.view !== '24h') throw new Error('expected the 24h view');
    expect(result.window.end).toEqual(now);
    expect(result.summary.feeds).toBe(1);
    expect(result.nowFrac).toBe(1);
    expect(result.ticks.filter((tick) => !tick.minor).length).toBeGreaterThan(0);
    expect(result.ticks.filter((tick) => tick.minor).length).toBeGreaterThan(0);
  });

  it('returns every day of a week, with summaries for none of the future and week totals', () => {
    const result = model('7d', '2026-10-06');
    if (result.view !== '7d') throw new Error('expected the 7d view');
    expect(result.days.map((day) => day.dayKey)).toHaveLength(7);
    expect(result.days.every((day) => day.summary !== null && day.layout !== null)).toBe(true);
    expect(result.week.days).toBeGreaterThan(0);
    expect(result.days.find((day) => day.dayKey === '2026-10-06')?.summary?.nappies).toBe(1);
  });

  it('works before settings have loaded', () => {
    const result = timelineModel({ view: 'day', date: undefined, events, settings: undefined, baby, now });
    expect(result.view === 'day' && result.day.summary.nightMs).toBe(0);
  });
});
