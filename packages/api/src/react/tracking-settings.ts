import type { NappyPromptTiming, Units } from '@babble/domain';
import { DEFAULT_FAMILY_SETTINGS } from '../families';
import type { BabySettings } from '../types';

export interface TrackingSettings {
  units: Units;
  mergeGapMs: number;
  autoEndPausedMinutes: number;
  nappyPrompt: NappyPromptTiming;
}

export function trackingSettingsFrom(settings: BabySettings | undefined): TrackingSettings {
  const { units, downtime_merge_threshold_sec, auto_end_paused_session_min } = settings ?? DEFAULT_FAMILY_SETTINGS;
  return {
    units,
    mergeGapMs: downtime_merge_threshold_sec * 1000,
    autoEndPausedMinutes: auto_end_paused_session_min,
    nappyPrompt: settings?.nappy_prompt ?? 'feed_start',
  };
}
