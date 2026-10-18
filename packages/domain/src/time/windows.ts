import { DAY_MS } from './constants';

export interface TimeWindow {
  start: Date;
  end: Date;
}

export function fractionOf(window: TimeWindow, instant: number): number {
  const start = window.start.getTime();
  const span = window.end.getTime() - start;
  return Math.min(1, Math.max(0, (instant - start) / span));
}

export function overlapMs(a: TimeWindow, b: TimeWindow): number {
  return Math.max(0, Math.min(a.end.getTime(), b.end.getTime()) - Math.max(a.start.getTime(), b.start.getTime()));
}

export function lastDayWindow(now: Date): TimeWindow {
  return { start: new Date(now.getTime() - DAY_MS), end: now };
}
