import { describe, expect, it } from 'vitest';
import {
  dayKeyFor,
  dayWindow,
  formatDayLabel,
  formatShortDate,
  formatTimeOfDay,
  fromLocalInputValue,
  shiftDay,
  toLocalInputValue,
} from './local-time';

describe('local time inputs', () => {
  it('round-trips through the baby timezone', () => {
    expect(toLocalInputValue('2026-10-05T14:12:00Z', 'Pacific/Auckland')).toBe('2026-10-06T03:12');
    expect(fromLocalInputValue('2026-10-06T03:12', 'Pacific/Auckland')).toBe('2026-10-05T14:12:00.000Z');
    expect(fromLocalInputValue('nonsense', 'Pacific/Auckland')).toBeNull();
  });

  it('formats a short date', () => {
    expect(formatShortDate('2026-10-01T23:30:00Z', 'Pacific/Auckland')).toBe('2 Oct');
  });

  it('formats a time of day', () => {
    expect(formatTimeOfDay('2026-10-05T14:12:00Z', 'Pacific/Auckland')).toBe('3:12 am');
    expect(formatTimeOfDay('2026-10-06T02:05:00Z', 'Pacific/Auckland')).toBe('3:05 pm');
  });
});

describe('days', () => {
  it('assigns events to days using the day start', () => {
    expect(dayKeyFor('2026-10-05T17:30:00Z', 'Pacific/Auckland', 0)).toBe('2026-10-06');
    expect(dayKeyFor('2026-10-05T17:30:00Z', 'Pacific/Auckland', 420)).toBe('2026-10-05');
  });

  it('labels days', () => {
    expect(formatDayLabel('2026-10-06', '2026-10-06')).toBe('Today');
    expect(formatDayLabel('2026-10-05', '2026-10-06')).toBe('Yesterday');
    expect(formatDayLabel('2026-10-03', '2026-10-06')).toBe('Sat 3 Oct');
  });

  it('shifts days across month boundaries', () => {
    expect(shiftDay('2026-10-01', -1)).toBe('2026-09-30');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('dayWindow', () => {
  it('spans one day from the day start in the baby timezone', () => {
    expect(dayWindow('2026-10-06', 'Pacific/Auckland', 420)).toEqual({
      start: new Date('2026-10-05T18:00:00Z'),
      end: new Date('2026-10-06T18:00:00Z'),
    });
  });

  it('is 23 hours long on a DST spring-forward day', () => {
    const { start, end } = dayWindow('2026-09-27', 'Pacific/Auckland', 0);
    expect(end.getTime() - start.getTime()).toBe(23 * 3_600_000);
  });
});
