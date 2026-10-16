import { dayKeyFor, formatTimeOfDay } from '../time/local-time';
import { nightIntervals, type TimeWindow } from './days';

export interface NightMarker {
  frac: number;
  label: string;
}

export function nightMarkers(
  window: TimeWindow,
  settings: { night_start_minutes: number; night_end_minutes: number } | null | undefined,
  timeZone: string,
): NightMarker[] {
  if (!settings || settings.night_start_minutes === settings.night_end_minutes) return [];
  const start = window.start.getTime();
  const end = window.end.getTime();
  const nights = nightIntervals(
    dayKeyFor(window.start.toISOString(), timeZone, 0),
    timeZone,
    settings.night_start_minutes,
    settings.night_end_minutes,
  );
  return nights
    .map((night) => night.start)
    .filter((at) => at.getTime() >= start && at.getTime() <= end)
    .map((at) => ({
      frac: (at.getTime() - start) / (end - start),
      label: `Night starts ${formatTimeOfDay(at.toISOString(), timeZone)}`,
    }));
}
