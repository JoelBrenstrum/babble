import { describe, expect, it } from 'vitest';
import { formatDuration, formatDurationShort, formatPerDay, formatTimer } from './duration';
import { clampDurationPart, joinDuration, splitDuration } from './duration-input';

describe('formatDurationShort', () => {
  it.each([
    [0, '0m'],
    [59_000, '0m'],
    [60_000, '1m'],
    [3_600_000, '1h 00m'],
    [5_400_000, '1h 30m'],
  ])('%i → %s', (value, expected) => expect(formatDurationShort(value)).toBe(expected));

  it('matches formatDuration without seconds', () => {
    expect(formatDurationShort(4_325_000)).toBe(formatDuration(4_325_000, { seconds: false }));
  });
});

describe('formatTimer and formatDuration share the same split', () => {
  it('agree on whole values', () => {
    expect(formatTimer(3_723_000)).toBe('1:02:03');
    expect(formatDuration(3_723_000, { seconds: true })).toBe('1h 02m 03s');
    expect(formatTimer(-1000)).toBe('0:00');
  });
});

describe('formatPerDay', () => {
  it('shows whole numbers plainly and others to one decimal', () => {
    expect(formatPerDay(4)).toBe('4');
    expect(formatPerDay(4.25)).toBe('4.3');
    expect(formatPerDay(0)).toBe('0');
  });
});

describe('duration inputs', () => {
  it('splits milliseconds into minutes and seconds, rounding to the second', () => {
    expect(splitDuration(332_400)).toEqual({ minutes: 5, seconds: 32 });
    expect(splitDuration(0)).toEqual({ minutes: 0, seconds: 0 });
    expect(splitDuration(3_599_999)).toEqual({ minutes: 60, seconds: 0 });
  });

  it('joins them back', () => {
    expect(joinDuration(5, 32)).toBe(332_000);
  });

  it('clamps typed values to digits within a range', () => {
    expect(clampDurationPart('12', 59)).toBe(12);
    expect(clampDurationPart('99', 59)).toBe(59);
    expect(clampDurationPart('', 59)).toBe(0);
    expect(clampDurationPart('4a7', 999)).toBe(47);
    expect(clampDurationPart('-5', 59)).toBe(5);
    expect(clampDurationPart('abc', 59)).toBe(0);
  });
});
