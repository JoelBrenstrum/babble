import { describe, expect, it } from 'vitest';
import { DEFAULT_FAMILY_SETTINGS } from '../families';
import type { BabySettings } from '../types';
import { trackingSettingsFrom } from './tracking-settings';

describe('trackingSettingsFrom', () => {
  it('falls back to defaults before settings load', () => {
    expect(trackingSettingsFrom(undefined)).toEqual({
      units: DEFAULT_FAMILY_SETTINGS.units,
      mergeGapMs: DEFAULT_FAMILY_SETTINGS.downtime_merge_threshold_sec * 1000,
      autoEndPausedMinutes: DEFAULT_FAMILY_SETTINGS.auto_end_paused_session_min,
      nappyPrompt: 'feed_start',
    });
  });

  it('converts stored settings', () => {
    const settings = {
      units: 'imperial',
      downtime_merge_threshold_sec: 60,
      auto_end_paused_session_min: 45,
      nappy_prompt: 'feed_end',
    } as BabySettings;
    expect(trackingSettingsFrom(settings)).toEqual({
      units: 'imperial',
      mergeGapMs: 60_000,
      autoEndPausedMinutes: 45,
      nappyPrompt: 'feed_end',
    });
  });
});
