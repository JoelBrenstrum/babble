import { describe, expect, it } from 'vitest';
import { countChange, durationChange } from './change';

const HOUR = 3_600_000;

describe('durationChange', () => {
  it('signs the difference in hours and minutes', () => {
    expect(durationChange(5 * HOUR, 4.5 * HOUR)).toBe('+30m');
    expect(durationChange(4 * HOUR, 5.25 * HOUR)).toBe('−1h 15m');
    expect(durationChange(HOUR, HOUR + 10_000)).toBe('Same');
  });
});

describe('countChange', () => {
  it('signs the difference to one decimal place', () => {
    expect(countChange(7, 5.5)).toBe('+1.5');
    expect(countChange(5, 6.3)).toBe('−1.3');
    expect(countChange(4, 4.04)).toBe('Same');
  });
});
