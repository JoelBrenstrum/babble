import { DAY_MS } from '../time/constants';
import { dayKeyFor, dayWindow } from '../time/local-time';
import type { TimeWindow } from './days';

export function homeWindow(
  now: Date,
  baby: { timezone: string; day_start_minutes: number },
): { dayKey: string; day: TimeWindow; window: TimeWindow; since: string } {
  const dayKey = dayKeyFor(now.toISOString(), baby.timezone, baby.day_start_minutes);
  const day = dayWindow(dayKey, baby.timezone, baby.day_start_minutes);
  const sinceHour = new Date(day.start.getTime() - DAY_MS).toISOString().slice(0, 13);
  return { dayKey, day, window: { start: day.start, end: now }, since: `${sinceHour}:00:00Z` };
}
