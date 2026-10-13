import { describe, expect, it } from 'vitest';
import {
  dayKeyFor,
  dayWindow,
  formatDayLabel,
  formatShortDate,
  formatTimeOfDay,
  fromLocalInputValue,
  localInstant,
  minutesOfDay,
  parseDayKey,
  shiftDay,
  shiftLocalDays,
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

describe('day boundaries across daylight saving', () => {
  const zone = 'Pacific/Auckland';
  const SIX_AM = 360;
  const hoursBetween = (window: { start: Date; end: Date }) =>
    (window.end.getTime() - window.start.getTime()) / 3_600_000;

  it('keeps the day start at 6am local on the autumn changeover (25 hour day)', () => {
    const window = dayWindow('2026-04-04', zone, SIX_AM);
    expect(window.start.toISOString()).toBe('2026-04-03T17:00:00.000Z');
    expect(window.end.toISOString()).toBe('2026-04-04T18:00:00.000Z');
    expect(hoursBetween(window)).toBe(25);
    expect(hoursBetween(dayWindow('2026-04-05', zone, SIX_AM))).toBe(24);
  });

  it('keeps the day start at 6am local on the spring changeover (23 hour day)', () => {
    const window = dayWindow('2026-09-26', zone, SIX_AM);
    expect(window.start.toISOString()).toBe('2026-09-25T18:00:00.000Z');
    expect(window.end.toISOString()).toBe('2026-09-26T17:00:00.000Z');
    expect(hoursBetween(window)).toBe(23);
  });

  it('assigns instants either side of the 6am start to the right day', () => {
    expect(dayKeyFor('2026-09-26T16:59:00Z', zone, SIX_AM)).toBe('2026-09-26');
    expect(dayKeyFor('2026-09-26T17:00:00Z', zone, SIX_AM)).toBe('2026-09-27');
    expect(dayKeyFor('2026-04-04T17:59:00Z', zone, SIX_AM)).toBe('2026-04-04');
    expect(dayKeyFor('2026-04-04T18:00:00Z', zone, SIX_AM)).toBe('2026-04-05');
  });

  it.each(['2026-04-04', '2026-04-05', '2026-09-26', '2026-09-27'])('agrees with dayWindow on %s', (key) => {
    const { start, end } = dayWindow(key, zone, SIX_AM);
    expect(dayKeyFor(start.toISOString(), zone, SIX_AM)).toBe(key);
    expect(dayKeyFor(new Date(end.getTime() - 1).toISOString(), zone, SIX_AM)).toBe(key);
    expect(dayKeyFor(end.toISOString(), zone, SIX_AM)).toBe(shiftDay(key, 1));
  });
});

describe('local instants', () => {
  it('parses day keys', () => {
    expect(parseDayKey('2026-10-06')).toEqual({ year: 2026, month: 10, day: 6 });
  });

  it('places minutes past midnight, including past 24 hours', () => {
    expect(localInstant('2026-10-06', 420, 'Pacific/Auckland').toISOString()).toBe('2026-10-05T18:00:00.000Z');
    expect(localInstant('2026-10-06', 1440 + 60, 'UTC').toISOString()).toBe('2026-10-07T01:00:00.000Z');
  });

  it('reads minutes of the day in half-hour zones', () => {
    expect(minutesOfDay(new Date('2026-10-06T00:00:00Z'), 'Asia/Kolkata')).toBe(5 * 60 + 30);
  });

  it('shifts by calendar days, not 24 hours, across a changeover', () => {
    expect(shiftLocalDays('2026-09-26T23:30:15.250Z', -1, 'Pacific/Auckland')).toBe('2026-09-26T00:30:15.250Z');
    expect(shiftLocalDays('2026-10-06T12:00:00Z', -1, 'UTC')).toBe('2026-10-05T12:00:00.000Z');
  });
});
