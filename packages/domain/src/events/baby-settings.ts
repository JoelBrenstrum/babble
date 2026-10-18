import { SECOND_MS } from '../time/constants';
import type { NightSettings } from '../time/night';

export interface NightSettingsRow {
  night_start_minutes: number;
  night_end_minutes: number;
}

export function nightSettingsFrom(row: NightSettingsRow): NightSettings {
  return { nightStartMinutes: row.night_start_minutes, nightEndMinutes: row.night_end_minutes };
}

export function mergeGapMsFrom(row: { downtime_merge_threshold_sec: number }): number {
  return row.downtime_merge_threshold_sec * SECOND_MS;
}
