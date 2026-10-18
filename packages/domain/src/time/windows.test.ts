import { describe, expect, it } from 'vitest';
import { fractionOf, lastDayWindow, overlapMs } from './windows';

const window = { start: new Date('2026-10-06T00:00:00Z'), end: new Date('2026-10-07T00:00:00Z') };

describe('fractionOf', () => {
  it('places an instant within the window and clamps outside it', () => {
    expect(fractionOf(window, Date.parse('2026-10-06T06:00:00Z'))).toBe(0.25);
    expect(fractionOf(window, Date.parse('2026-10-05T06:00:00Z'))).toBe(0);
    expect(fractionOf(window, Date.parse('2026-10-08T06:00:00Z'))).toBe(1);
  });
});

describe('overlapMs', () => {
  it('measures the shared time between two windows', () => {
    const other = { start: new Date('2026-10-06T22:00:00Z'), end: new Date('2026-10-07T03:00:00Z') };
    expect(overlapMs(window, other)).toBe(2 * 3_600_000);
    expect(overlapMs(other, window)).toBe(2 * 3_600_000);
  });

  it('is zero when the windows do not touch', () => {
    const later = { start: new Date('2026-10-08T00:00:00Z'), end: new Date('2026-10-09T00:00:00Z') };
    expect(overlapMs(window, later)).toBe(0);
  });
});

describe('lastDayWindow', () => {
  it('runs from 24 hours ago until now', () => {
    const now = new Date('2026-10-08T14:20:00Z');
    expect(lastDayWindow(now)).toEqual({ start: new Date('2026-10-07T14:20:00Z'), end: now });
  });
});
