import { createHash } from 'node:crypto';
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

  it('is deterministic for a given now', () => {
    const events = sampleMonthEvents(now);
    expect(events).toHaveLength(824);
    expect(events[0]).toMatchObject({
      id: 'month-feed-1',
      type: 'breast_feed',
      startedAt: '2026-09-13T18:40:00.000Z',
      endedAt: '2026-09-13T19:04:00.000Z',
      segments: [
        { side: 'left', startedAt: '2026-09-13T18:40:00.000Z', endedAt: '2026-09-13T18:50:00.000Z' },
        { side: 'right', startedAt: '2026-09-13T18:51:00.000Z', endedAt: '2026-09-13T19:04:00.000Z' },
      ],
    });
    expect(events[100]).toMatchObject({ id: 'month-nappy-101', startedAt: '2026-09-16T16:21:28.544Z' });
    expect(events.at(-1)).toMatchObject({ id: 'month-nappy-825', startedAt: '2026-10-13T01:50:05.023Z' });
    const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
    expect(digest(events)).toBe('a19635aaf2910abcf46127739bc092573f0b976e793725b9777101cb39c5e031');
    expect(digest(sampleStatsReport(now))).toBe('608e40ca0e198e063ed12167719da5533f07ddd31d96e5dee5276a04ba946cab');
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
    expect(sampleStatsReport(now).cards.map((card) => card.key)).toEqual(['sleep', 'feeds', 'breast-time', 'nappies']);
  });
});
