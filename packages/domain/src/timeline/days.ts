import { dayWindow, fromLocalInputValue, shiftDay } from '../time/local-time';

export interface TimeWindow {
  start: Date;
  end: Date;
}

export function localInstant(dayKey: string, minutes: number, timeZone: string): Date {
  const dayOffset = Math.floor(minutes / 1440);
  const minuteOfDay = minutes - dayOffset * 1440;
  const hh = String(Math.floor(minuteOfDay / 60)).padStart(2, '0');
  const mm = String(minuteOfDay % 60).padStart(2, '0');
  return new Date(fromLocalInputValue(`${shiftDay(dayKey, dayOffset)}T${hh}:${mm}`, timeZone)!);
}

export function fractionOf(window: TimeWindow, instant: number): number {
  const start = window.start.getTime();
  const span = window.end.getTime() - start;
  return Math.min(1, Math.max(0, (instant - start) / span));
}

export function hourTicks(
  dayKey: string,
  timeZone: string,
  dayStartMinutes: number,
  everyHours: number,
): { frac: number; label: string }[] {
  const window = dayWindow(dayKey, timeZone, dayStartMinutes);
  const ticks: { frac: number; label: string }[] = [];
  for (let hours = 0; hours <= 24; hours += everyHours) {
    const minutes = dayStartMinutes + hours * 60;
    const instant = localInstant(dayKey, minutes, timeZone).getTime();
    const label = String(Math.floor(minutes / 60) % 24).padStart(2, '0');
    ticks.push({ frac: fractionOf(window, instant), label });
  }
  return ticks;
}

export function nightIntervals(
  dayKey: string,
  timeZone: string,
  startMinutes: number,
  endMinutes: number,
): TimeWindow[] {
  const endOffset = endMinutes > startMinutes ? endMinutes : endMinutes + 1440;
  return [-1, 0, 1].map((days) => {
    const key = shiftDay(dayKey, days);
    return { start: localInstant(key, startMinutes, timeZone), end: localInstant(key, endOffset, timeZone) };
  });
}

export function lastDays(endKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => shiftDay(endKey, index - count + 1));
}

export function overlapMs(a: TimeWindow, b: TimeWindow): number {
  return Math.max(0, Math.min(a.end.getTime(), b.end.getTime()) - Math.max(a.start.getTime(), b.start.getTime()));
}
