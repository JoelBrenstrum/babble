import { describe, expect, it } from 'vitest';
import { homeWindow } from './home-window';

const baby = { timezone: 'Pacific/Auckland', day_start_minutes: 420 };

describe('homeWindow', () => {
  it('runs from the day start until now', () => {
    const now = new Date('2026-10-08T03:00:00Z');
    const result = homeWindow(now, baby);
    expect(result.dayKey).toBe('2026-10-08');
    expect(result.window).toEqual({ start: new Date('2026-10-07T18:00:00Z'), end: now });
    expect(result.day.end).toEqual(new Date('2026-10-08T18:00:00Z'));
  });

  it('uses the previous day before the day starts', () => {
    const result = homeWindow(new Date('2026-10-07T17:00:00Z'), baby);
    expect(result.dayKey).toBe('2026-10-07');
    expect(result.window.start).toEqual(new Date('2026-10-06T18:00:00Z'));
  });

  it('fetches from an hour-aligned instant a day before the window, so the query key is stable', () => {
    const a = homeWindow(new Date('2026-10-08T03:00:00Z'), baby);
    const b = homeWindow(new Date('2026-10-08T03:00:30Z'), baby);
    expect(a.since).toBe('2026-10-06T18:00:00Z');
    expect(b.since).toBe(a.since);
  });
});
