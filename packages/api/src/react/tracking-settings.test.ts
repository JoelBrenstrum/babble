import { describe, expect, it } from 'vitest';
import type { BabySettings } from '../types';
import { trackingSettingsFrom } from './tracking-settings';

describe('trackingSettingsFrom', () => {
  it('falls back to defaults before settings load', () => {
    expect(trackingSettingsFrom(undefined)).toEqual({
      units: 'metric',
      mergeGapMs: 15_000,
      autoEndPausedMinutes: 30,
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
