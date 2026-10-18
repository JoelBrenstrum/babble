import { MINUTES_PER_DAY } from './constants';
import { localInstant, minutesOfDay, shiftDay } from './local-time';
import type { TimeWindow } from './windows';

export interface NightSettings {
  nightStartMinutes: number;
  nightEndMinutes: number;
}

export interface ZonedNightSettings extends NightSettings {
  timeZone: string;
}

export function nightEndOffsetMinutes(settings: NightSettings): number {
  return settings.nightEndMinutes > settings.nightStartMinutes
    ? settings.nightEndMinutes
    : settings.nightEndMinutes + MINUTES_PER_DAY;
}

export function nightWindow(dayKey: string, settings: ZonedNightSettings): TimeWindow {
  return {
    start: localInstant(dayKey, settings.nightStartMinutes, settings.timeZone),
    end: localInstant(dayKey, nightEndOffsetMinutes(settings), settings.timeZone),
  };
}

export function nightIntervals(dayKey: string, settings: ZonedNightSettings): TimeWindow[] {
  return [-1, 0, 1].map((days) => nightWindow(shiftDay(dayKey, days), settings));
}

export function isWithinNight(instant: Date, settings: ZonedNightSettings): boolean {
  if (settings.nightStartMinutes === settings.nightEndMinutes) return false;
  const minutes = minutesOfDay(instant, settings.timeZone);
  const sinceStart = minutes < settings.nightStartMinutes ? minutes + MINUTES_PER_DAY : minutes;
  return sinceStart >= settings.nightStartMinutes && sinceStart < nightEndOffsetMinutes(settings);
}
