import { describe, expect, it } from 'vitest';
import { hourTicks, lastDays, localInstant, nightIntervals } from './days';

describe('localInstant', () => {
  it('rolls minutes past midnight into the next day', () => {
    expect(localInstant('2026-10-06', 1440 + 420, 'Pacific/Auckland').toISOString()).toBe('2026-10-06T18:00:00.000Z');
  });
});

describe('hourTicks', () => {
  it('labels ticks from the day start', () => {
    const ticks = hourTicks('2026-10-06', 'UTC', 7 * 60, 6);
    expect(ticks.map((tick) => tick.label)).toEqual(['07', '13', '19', '01', '07']);
    expect(ticks.map((tick) => tick.frac)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it('spaces ticks by real time across a spring-forward day', () => {
    const ticks = hourTicks('2026-09-27', 'Pacific/Auckland', 0, 6);
    expect(ticks.map((tick) => tick.label)).toEqual(['00', '06', '12', '18', '00']);
    expect(ticks[1]!.frac).toBeCloseTo(5 / 23);
    expect(ticks[4]!.frac).toBe(1);
  });
});

describe('nightIntervals', () => {
  it('builds overnight windows around the day', () => {
    const [before, during, after] = nightIntervals('2026-10-06', 'UTC', 19 * 60, 7 * 60);
    expect(before).toEqual({ start: new Date('2026-10-05T19:00:00Z'), end: new Date('2026-10-06T07:00:00Z') });
    expect(during).toEqual({ start: new Date('2026-10-06T19:00:00Z'), end: new Date('2026-10-07T07:00:00Z') });
    expect(after!.start).toEqual(new Date('2026-10-07T19:00:00Z'));
  });

  it('supports a night window that does not cross midnight', () => {
    const [, during] = nightIntervals('2026-10-06', 'UTC', 60, 6 * 60);
    expect(during).toEqual({ start: new Date('2026-10-06T01:00:00Z'), end: new Date('2026-10-06T06:00:00Z') });
  });
});

describe('lastDays', () => {
  it('lists the days ending on the given day, across a month boundary', () => {
    expect(lastDays('2026-10-03', 7)).toEqual([
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ]);
  });
});
