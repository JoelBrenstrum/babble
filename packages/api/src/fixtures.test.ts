import { describe, expect, it } from 'vitest';
import { sampleMonthEvents, sampleMonthView, sampleStatsReport } from './fixtures';

const now = new Date('2026-10-13T02:00:00Z');

describe('sample month', () => {
  it('makes a month of sleeps and feeds that ends before now', () => {
    const events = sampleMonthEvents(now);
    expect(events.some((event) => event.type === 'sleep')).toBe(true);
    expect(events.some((event) => event.type === 'breast_feed')).toBe(true);
    expect(events.every((event) => Date.parse(event.endedAt ?? event.startedAt) <= now.getTime())).toBe(true);
  });

  it('lays out 30 days with a summary for the locked 30-day timeline', () => {
    const view = sampleMonthView(now);
    expect(view.days).toHaveLength(30);
    expect(view.days.at(-1)!.dayKey).toBe(view.todayKey);
    expect(view.week.days).toBe(29);
    expect(view.week.feedsPerDay).toBeGreaterThan(5);
    expect(view.week.nappiesPerDay).toBeGreaterThan(5);
  });

  it('builds stats cards for the locked all-time view', () => {
    expect(sampleStatsReport(now).cards.map((card) => card.key)).toEqual(['sleep', 'feeds', 'nappies']);
  });
});
