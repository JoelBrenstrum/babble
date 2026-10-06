import { describe, expect, it } from 'vitest';
import { babyAgeLabel } from './baby-age';
import { clockToMinutes, minutesToClock, todayInTimeZone } from './time-of-day';

describe('babyAgeLabel', () => {
  it.each([
    ['2026-10-08', 'Not born yet'],
    ['2026-10-06', 'Born today'],
    ['2026-10-05', '1 day old'],
    ['2026-09-26', '10 days old'],
    ['2026-09-23', '13 days old'],
    ['2026-09-22', '2w'],
    ['2026-08-16', '7w 2d'],
    ['2026-07-06', '3 months'],
    ['2025-04-06', '18 months'],
    ['2024-10-06', '2 years'],
    ['2024-07-06', '2y 3m'],
  ])('born %s → %s', (birthDate, expected) => {
    expect(babyAgeLabel(birthDate, '2026-10-06')).toBe(expected);
  });

  it('only counts a month once the day of month is reached', () => {
    expect(babyAgeLabel('2026-01-20', '2026-05-19')).toBe('3 months');
    expect(babyAgeLabel('2026-01-20', '2026-05-20')).toBe('4 months');
  });
});

describe('minutesToClock', () => {
  it.each([
    [0, '12:00 am'],
    [420, '7:00 am'],
    [720, '12:00 pm'],
    [1139, '6:59 pm'],
    [1440, '12:00 am'],
  ])('%i → %s', (minutes, expected) => expect(minutesToClock(minutes)).toBe(expected));

  it('supports a 24-hour clock', () => expect(minutesToClock(1140, 'h23')).toBe('19:00'));
});

describe('clockToMinutes', () => {
  it.each([
    ['07:00', 420],
    ['7:30', 450],
    ['23:59', 1439],
    ['24:00', null],
    ['7pm', null],
  ])('%j → %j', (value, expected) => expect(clockToMinutes(value)).toBe(expected));
});

describe('todayInTimeZone', () => {
  it('uses the given time zone', () => {
    const instant = new Date('2026-10-06T12:30:00Z');
    expect(todayInTimeZone('Pacific/Auckland', instant)).toBe('2026-10-07');
    expect(todayInTimeZone('America/New_York', instant)).toBe('2026-10-06');
  });
});
