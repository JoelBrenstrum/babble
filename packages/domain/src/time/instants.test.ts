import { describe, expect, it } from 'vitest';
import { byStartedAtAsc, byStartedAtDesc, compareIso, daysUntil, ms } from './instants';

describe('instants', () => {
  it('parses and compares ISO strings by instant, not text', () => {
    expect(ms('2026-10-06T10:00:00Z')).toBe(Date.UTC(2026, 9, 6, 10));
    expect(compareIso('2026-10-06T10:00:00Z', '2026-10-06T11:00:00Z')).toBeLessThan(0);
    expect(compareIso('2026-10-06T10:00:00Z', '2026-10-06T10:00:00.000Z')).toBe(0);
    expect(compareIso('2026-10-06T23:00:00+13:00', '2026-10-06T11:00:00Z')).toBeLessThan(0);
  });

  it('sorts oldest or newest first', () => {
    const events = [
      { startedAt: '2026-10-06T10:00:00Z' },
      { startedAt: '2026-10-06T12:00:00Z' },
      { startedAt: '2026-10-06T11:00:00Z' },
    ];
    expect([...events].sort(byStartedAtAsc).map((e) => e.startedAt.slice(11, 13))).toEqual(['10', '11', '12']);
    expect([...events].sort(byStartedAtDesc).map((e) => e.startedAt.slice(11, 13))).toEqual(['12', '11', '10']);
  });

  it('rounds the days until an instant', () => {
    const now = new Date('2026-10-06T00:00:00Z');
    expect(daysUntil('2026-10-13T00:00:00Z', now)).toBe(7);
    expect(daysUntil('2026-10-06T10:00:00Z', now)).toBe(0);
    expect(daysUntil('2026-10-05T00:00:00Z', now)).toBe(-1);
  });
});
