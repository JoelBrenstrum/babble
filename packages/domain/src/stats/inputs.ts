import { mergeGapMsFrom, nightSettingsFrom, type NightSettingsRow } from '../events/baby-settings';
import type { Units } from '../events/types';
import { dayKeyFor, dayWindow } from '../time/local-time';
import type { StatsSettings } from './settings';
import { rangeDays, type StatsRange } from './report';

interface StatsBaby {
  timezone: string;
  day_start_minutes: number;
  birth_date: string;
}

export function statsInputs(
  range: StatsRange,
  baby: StatsBaby,
  now: Date,
): { todayKey: string; keys: string[]; from: string; to: string } {
  const todayKey = dayKeyFor(now.toISOString(), baby.timezone, baby.day_start_minutes);
  const keys = rangeDays(range, todayKey, baby.birth_date);
  return {
    todayKey,
    keys,
    from: dayWindow(keys[0]!, baby.timezone, baby.day_start_minutes).start.toISOString(),
    to: dayWindow(todayKey, baby.timezone, baby.day_start_minutes).end.toISOString(),
  };
}

export function statsOptions(
  baby: Pick<StatsBaby, 'timezone' | 'day_start_minutes'>,
  settings: NightSettingsRow & { downtime_merge_threshold_sec: number },
  units: Units,
): StatsSettings {
  return {
    timeZone: baby.timezone,
    dayStartMinutes: baby.day_start_minutes,
    ...nightSettingsFrom(settings),
    mergeGapMs: mergeGapMsFrom(settings),
    units,
  };
}
