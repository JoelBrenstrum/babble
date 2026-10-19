import { describe, expect, it } from 'vitest';
import { isWithinNight, nightEndOffsetMinutes, nightIntervals, nightWindow } from './night';

const overnight = { timeZone: 'UTC', nightStartMinutes: 19 * 60, nightEndMinutes: 7 * 60 };
const early = { timeZone: 'UTC', nightStartMinutes: 60, nightEndMinutes: 6 * 60 };

describe('nightEndOffsetMinutes', () => {
  it('wraps an end before the start into the next day', () => {
    expect(nightEndOffsetMinutes(overnight)).toBe(31 * 60);
    expect(nightEndOffsetMinutes(early)).toBe(6 * 60);
  });
});

describe('nightWindow', () => {
  it('runs from the evening into the next morning', () => {
    expect(nightWindow('2026-10-06', overnight)).toEqual({
      start: new Date('2026-10-06T19:00:00Z'),
      end: new Date('2026-10-07T07:00:00Z'),
    });
  });

  it("uses the baby's time zone", () => {
    expect(nightWindow('2026-10-06', { ...overnight, timeZone: 'Pacific/Auckland' })).toEqual({
      start: new Date('2026-10-06T06:00:00Z'),
      end: new Date('2026-10-06T18:00:00Z'),
    });
  });
});

describe('nightIntervals', () => {
  it('builds overnight windows around the day', () => {
    const [before, during, after] = nightIntervals('2026-10-06', overnight);
    expect(before).toEqual({ start: new Date('2026-10-05T19:00:00Z'), end: new Date('2026-10-06T07:00:00Z') });
    expect(during).toEqual({ start: new Date('2026-10-06T19:00:00Z'), end: new Date('2026-10-07T07:00:00Z') });
    expect(after!.start).toEqual(new Date('2026-10-07T19:00:00Z'));
  });

  it('supports a night window that does not cross midnight', () => {
    const [, during] = nightIntervals('2026-10-06', early);
    expect(during).toEqual({ start: new Date('2026-10-06T01:00:00Z'), end: new Date('2026-10-06T06:00:00Z') });
  });
});

describe('isWithinNight', () => {
  it('covers the evening and the early morning of an overnight window', () => {
    expect(isWithinNight(new Date('2026-10-06T20:00:00Z'), overnight)).toBe(true);
    expect(isWithinNight(new Date('2026-10-07T05:00:00Z'), overnight)).toBe(true);
    expect(isWithinNight(new Date('2026-10-07T07:00:00Z'), overnight)).toBe(false);
    expect(isWithinNight(new Date('2026-10-06T12:00:00Z'), overnight)).toBe(false);
  });

  it('handles a window inside one day', () => {
    expect(isWithinNight(new Date('2026-10-06T00:30:00Z'), early)).toBe(false);
    expect(isWithinNight(new Date('2026-10-06T03:00:00Z'), early)).toBe(true);
    expect(isWithinNight(new Date('2026-10-06T06:00:00Z'), early)).toBe(false);
  });

  it('is never night when the start and end match', () => {
    expect(isWithinNight(new Date('2026-10-06T20:00:00Z'), { ...overnight, nightEndMinutes: 19 * 60 })).toBe(false);
  });

  it('reads the clock in the given time zone', () => {
    expect(isWithinNight(new Date('2026-10-06T08:00:00Z'), { ...overnight, timeZone: 'Pacific/Auckland' })).toBe(true);
  });
});
