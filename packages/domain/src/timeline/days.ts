import { MINUTE_MS } from '../time/constants';
import { dayWindow, localInstant, minutesOfDay } from '../time/local-time';
import { fractionOf, type TimeWindow } from '../time/windows';

export interface HourTick {
  frac: number;
  label: string;
  minor?: boolean;
}

export function hourTicks(dayKey: string, timeZone: string, dayStartMinutes: number, everyHours: number): HourTick[] {
  const window = dayWindow(dayKey, timeZone, dayStartMinutes);
  const ticks: HourTick[] = [];
  for (let hours = 0; hours <= 24; hours += everyHours) {
    const minutes = dayStartMinutes + hours * 60;
    const instant = localInstant(dayKey, minutes, timeZone).getTime();
    const label = String(Math.floor(minutes / 60) % 24).padStart(2, '0');
    ticks.push({ frac: fractionOf(window, instant), label });
  }
  return ticks;
}

const QUARTER_HOUR = 15 * MINUTE_MS;

export function windowTicks(window: TimeWindow, timeZone: string, everyHours: number): HourTick[] {
  const ticks: HourTick[] = [];
  const first = Math.ceil(window.start.getTime() / QUARTER_HOUR) * QUARTER_HOUR;
  for (let instant = first; instant <= window.end.getTime(); instant += QUARTER_HOUR) {
    const minutes = minutesOfDay(new Date(instant), timeZone);
    const hour = Math.floor(minutes / 60);
    if (minutes % 60 === 0 && hour % everyHours === 0) {
      ticks.push({ frac: fractionOf(window, instant), label: String(hour).padStart(2, '0') });
    }
  }
  return ticks;
}

export function withMinorHours(major: readonly HourTick[], hourly: readonly HourTick[]): HourTick[] {
  const taken = new Set(major.map((tick) => tick.frac));
  return [...major, ...hourly.filter((tick) => !taken.has(tick.frac)).map((tick) => ({ ...tick, minor: true }))].sort(
    (a, b) => a.frac - b.frac,
  );
}
