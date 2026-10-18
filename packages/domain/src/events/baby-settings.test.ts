import { describe, expect, it } from 'vitest';
import { mergeGapMsFrom, nightSettingsFrom } from './baby-settings';

describe('nightSettingsFrom', () => {
  it('maps the settings row onto the night window', () => {
    expect(nightSettingsFrom({ night_start_minutes: 1140, night_end_minutes: 420 })).toEqual({
      nightStartMinutes: 1140,
      nightEndMinutes: 420,
    });
  });
});

describe('mergeGapMsFrom', () => {
  it('converts the downtime threshold to milliseconds', () => {
    expect(mergeGapMsFrom({ downtime_merge_threshold_sec: 15 })).toBe(15_000);
  });
});
