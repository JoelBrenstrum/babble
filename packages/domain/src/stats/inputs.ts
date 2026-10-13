import type { Units } from '../events/types';
import { dayKeyFor, dayWindow } from '../time/local-time';
import { SECOND_MS } from '../time/constants';
import type { StatsSettings } from './cards';
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
  settings: { night_start_minutes: number; night_end_minutes: number; downtime_merge_threshold_sec: number },
  units: Units,
): StatsSettings {
  return {
    timeZone: baby.timezone,
    dayStartMinutes: baby.day_start_minutes,
    nightStartMinutes: settings.night_start_minutes,
    nightEndMinutes: settings.night_end_minutes,
    mergeGapMs: settings.downtime_merge_threshold_sec * SECOND_MS,
    units,
  };
}
