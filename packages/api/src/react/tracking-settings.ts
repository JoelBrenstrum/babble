import type { NappyPromptTiming, Units } from '@babble/domain';
import type { BabySettings } from '../types';

export interface TrackingSettings {
  units: Units;
  mergeGapMs: number;
  autoEndPausedMinutes: number;
  nappyPrompt: NappyPromptTiming;
}

export function trackingSettingsFrom(settings: BabySettings | undefined): TrackingSettings {
  return {
    units: settings?.units ?? 'metric',
    mergeGapMs: (settings?.downtime_merge_threshold_sec ?? 15) * 1000,
    autoEndPausedMinutes: settings?.auto_end_paused_session_min ?? 30,
    nappyPrompt: settings?.nappy_prompt ?? 'feed_start',
  };
}
