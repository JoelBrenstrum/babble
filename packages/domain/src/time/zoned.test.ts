import { describe, expect, it } from 'vitest';
import { zonedToUtc } from './zoned';

const at = (year: number, month: number, day: number, hour: number, minute = 0) => ({ year, month, day, hour, minute });

describe('zonedToUtc', () => {
  it('converts NZ daylight time', () => {
    expect(zonedToUtc(at(2025, 10, 6, 6, 43), 'Pacific/Auckland').toISOString()).toBe('2025-10-05T17:43:00.000Z');
  });

  it('converts NZ standard time', () => {
    expect(zonedToUtc(at(2025, 7, 1, 12), 'Pacific/Auckland').toISOString()).toBe('2025-07-01T00:00:00.000Z');
  });

  it('picks the earlier instant for an ambiguous fall-back time', () => {
    expect(zonedToUtc(at(2025, 4, 6, 2, 30), 'Pacific/Auckland').toISOString()).toBe('2025-04-05T13:30:00.000Z');
  });

  it('shifts a spring-forward gap time forward', () => {
    expect(zonedToUtc(at(2025, 9, 28, 2, 30), 'Pacific/Auckland').toISOString()).toBe('2025-09-27T14:30:00.000Z');
  });

  it('handles UTC and negative offsets', () => {
    expect(zonedToUtc(at(2025, 1, 15, 9), 'UTC').toISOString()).toBe('2025-01-15T09:00:00.000Z');
    expect(zonedToUtc(at(2025, 1, 15, 9), 'America/New_York').toISOString()).toBe('2025-01-15T14:00:00.000Z');
  });
});
