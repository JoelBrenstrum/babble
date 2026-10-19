import { nightSettingsFrom, type NightSettingsRow } from '../events/baby-settings';
import { dayKeyFor, formatTimeOfDay } from '../time/local-time';
import { nightIntervals } from '../time/night';
import type { TimeWindow } from '../time/windows';

export interface NightMarker {
  frac: number;
  label: string;
}

export function nightMarkers(
  window: TimeWindow,
  settings: NightSettingsRow | null | undefined,
  timeZone: string,
): NightMarker[] {
  if (!settings) return [];
  const night = nightSettingsFrom(settings);
  if (night.nightStartMinutes === night.nightEndMinutes) return [];
  const start = window.start.getTime();
  const end = window.end.getTime();
  const nights = nightIntervals(dayKeyFor(window.start.toISOString(), timeZone, 0), { timeZone, ...night });
  return nights
    .map((night) => night.start)
    .filter((at) => at.getTime() >= start && at.getTime() <= end)
    .map((at) => ({
      frac: (at.getTime() - start) / (end - start),
      label: `Night starts ${formatTimeOfDay(at.toISOString(), timeZone)}`,
    }));
}
