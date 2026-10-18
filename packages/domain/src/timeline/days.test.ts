import { describe, expect, it } from 'vitest';
import { dayWindow } from '../time/local-time';
import { lastDayWindow } from '../time/windows';
import { hourTicks, windowTicks } from './days';

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

describe('the last 24 hours', () => {
  const now = new Date('2026-10-08T14:20:00Z');

  it('ticks on local clock hours inside the window', () => {
    const ticks = windowTicks(lastDayWindow(now), 'Pacific/Auckland', 3);
    expect(ticks.map((tick) => tick.label)).toEqual(['06', '09', '12', '15', '18', '21', '00', '03']);
    expect(ticks[0]!.frac).toBeCloseTo(160 / 1440, 5);
  });

  it('handles half-hour time zones', () => {
    const ticks = windowTicks(lastDayWindow(now), 'Asia/Kolkata', 6);
    expect(ticks.map((tick) => tick.label)).toEqual(['00', '06', '12', '18']);
  });
});

describe('ticks on a daylight saving changeover day', () => {
  const zone = 'Pacific/Auckland';

  it('spaces six-hourly ticks over a 25 hour day', () => {
    const ticks = windowTicks(dayWindow('2026-04-04', zone, 360), zone, 6);
    expect(ticks.map((tick) => tick.label)).toEqual(['06', '12', '18', '00', '06']);
    expect(ticks.map((tick) => tick.frac)).toEqual([0, 6 / 25, 12 / 25, 18 / 25, 1]);
  });

  it('spaces six-hourly ticks over a 23 hour day', () => {
    const ticks = windowTicks(dayWindow('2026-09-26', zone, 360), zone, 6);
    expect(ticks.map((tick) => tick.label)).toEqual(['06', '12', '18', '00', '06']);
    expect(ticks.map((tick) => tick.frac)).toEqual([0, 6 / 23, 12 / 23, 18 / 23, 1]);
  });

  it('agrees with hourTicks', () => {
    expect(hourTicks('2026-09-26', zone, 360, 6)).toEqual(windowTicks(dayWindow('2026-09-26', zone, 360), zone, 6));
  });
});
