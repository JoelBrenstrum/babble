import { dayKeyFor, formatTimeOfDay } from '../time/local-time';
import { nightIntervals, type TimeWindow } from './days';

export interface NightMarker {
  kind: 'start' | 'end';
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
  const markers = nights.flatMap((night) => [
    { kind: 'start' as const, at: night.start },
    { kind: 'end' as const, at: night.end },
  ]);
  return markers
    .filter(({ at }) => at.getTime() >= start && at.getTime() <= end)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map(({ kind, at }) => ({
      kind,
      frac: (at.getTime() - start) / (end - start),
      label: `${kind === 'start' ? 'Night starts' : 'Night ends'} ${formatTimeOfDay(at.toISOString(), timeZone)}`,
    }));
}
