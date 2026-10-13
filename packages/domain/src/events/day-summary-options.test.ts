import { describe, expect, it } from 'vitest';
import { nightOf, summaryOptions } from './day-summary';

const now = new Date('2026-10-06T12:00:00Z');

describe('nightOf', () => {
  it('builds the night settings for a day', () => {
    expect(nightOf({ timeZone: 'UTC', nightStartMinutes: 1140, nightEndMinutes: 420 }, '2026-10-06')).toEqual({
      dayKey: '2026-10-06',
      timeZone: 'UTC',
      startMinutes: 1140,
      endMinutes: 420,
    });
  });
});

describe('summaryOptions', () => {
  const settings = { downtime_merge_threshold_sec: 30, night_start_minutes: 1140, night_end_minutes: 420 };

  it('carries the night and merge gap from settings', () => {
    expect(summaryOptions(settings, { timezone: 'Pacific/Auckland' }, '2026-10-06', now)).toEqual({
      now,
      mergeGapMs: 30_000,
      night: { dayKey: '2026-10-06', timeZone: 'Pacific/Auckland', startMinutes: 1140, endMinutes: 420 },
    });
  });

  it('only has now until settings load', () => {
    expect(summaryOptions(undefined, { timezone: 'UTC' }, '2026-10-06', now)).toEqual({ now });
    expect(summaryOptions(null, { timezone: 'UTC' }, '2026-10-06', now)).toEqual({ now });
  });
});
