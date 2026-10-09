import { minutesToClock } from '../format/time-of-day';
import { isWithinNight } from '../time/local-time';

export type ThemePreference = 'system' | 'light' | 'dark' | 'night';

export interface NightWindow {
  timeZone: string;
  start: number;
  end: number;
}

export function parseThemePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'night' ? value : 'system';
}

export function themeOverride(
  preference: string | null,
  night: NightWindow | null,
  now: Date,
): 'light' | 'dark' | null {
  if (preference === 'light' || preference === 'dark') return preference;
  if (preference !== 'night' || !night) return null;
  return isWithinNight(now, night.timeZone, night.start, night.end) ? 'dark' : 'light';
}

export function parseNightWindow(value: string | null): NightWindow | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<NightWindow>;
    if (typeof parsed.timeZone !== 'string' || typeof parsed.start !== 'number' || typeof parsed.end !== 'number')
      return null;
    return { timeZone: parsed.timeZone, start: parsed.start, end: parsed.end };
  } catch {
    return null;
  }
}

export function nightThemeHint(babyName: string, night: NightWindow | null): string {
  if (!night) return `Dark during ${babyName}'s night window.`;
  return `Dark between ${minutesToClock(night.start)} and ${minutesToClock(night.end)}, from ${babyName}'s night settings.`;
}
