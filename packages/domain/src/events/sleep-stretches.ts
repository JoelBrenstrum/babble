import { overlapMs, type TimeWindow } from '../timeline/days';
import type { SleepStretch } from './types';

export interface SleepSummary {
  asleepMs: number;
  awakeMs: number;
  wakeUps: number;
  paused: boolean;
}

export interface NapLike {
  startedAt: string;
  endedAt: string | null;
  segments: readonly SleepStretch[];
}

const sorted = (stretches: readonly SleepStretch[]) =>
  [...stretches].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));

export function asleepIntervals(nap: NapLike, now: Date): TimeWindow[] {
  if (nap.segments.length === 0) {
    const start = new Date(nap.startedAt);
    const end = nap.endedAt ? new Date(nap.endedAt) : now;
    return [{ start, end: end < start ? start : end }];
  }
  return sorted(nap.segments).map((stretch) => ({
    start: new Date(stretch.startedAt),
    end: stretch.endedAt ? new Date(stretch.endedAt) : now,
  }));
}

export function summariseSleep(nap: NapLike, now: Date): SleepSummary {
  const intervals = asleepIntervals(nap, now);
  const asleepMs = intervals.reduce((total, interval) => total + interval.end.getTime() - interval.start.getTime(), 0);
  const paused = nap.endedAt === null && nap.segments.length > 0 && nap.segments.every((s) => s.endedAt !== null);
  let awakeMs = 0;
  let gaps = 0;
  for (let index = 1; index < intervals.length; index += 1) {
    const gap = intervals[index]!.start.getTime() - intervals[index - 1]!.end.getTime();
    if (gap > 0) {
      awakeMs += gap;
      gaps += 1;
    }
  }
  const last = intervals.at(-1)!;
  if (paused) awakeMs += Math.max(0, now.getTime() - last.end.getTime());
  return { asleepMs, awakeMs, wakeUps: gaps + (paused ? 1 : 0), paused };
}

export function asleepWithin(nap: NapLike, window: TimeWindow, now: Date): number {
  return asleepIntervals(nap, now).reduce((total, interval) => total + overlapMs(interval, window), 0);
}

// Editing a nap's start or end stretches the first and last stretches to match, and drops any that fall outside.
export function fitStretches(
  stretches: readonly SleepStretch[],
  startedAt: string,
  endedAt: string | null,
): SleepStretch[] {
  const start = Date.parse(startedAt);
  const end = endedAt ? Date.parse(endedAt) : Number.POSITIVE_INFINITY;
  const kept = sorted(stretches).filter(
    (stretch) =>
      Date.parse(stretch.startedAt) < end && (stretch.endedAt === null || Date.parse(stretch.endedAt) > start),
  );
  if (kept.length === 0) return [];
  return kept.map((stretch, index) => ({
    startedAt: index === 0 ? startedAt : stretch.startedAt,
    endedAt: index === kept.length - 1 && endedAt ? endedAt : stretch.endedAt,
  }));
}

export type NapRow = { kind: 'asleep' | 'awake'; durationMs: number; running: boolean };

export function napRows(nap: NapLike, now: Date): NapRow[] {
  const intervals = asleepIntervals(nap, now);
  const summary = summariseSleep(nap, now);
  const openEnded = nap.endedAt === null && !summary.paused;
  const rows: NapRow[] = [];
  intervals.forEach((interval, index) => {
    const durationMs = interval.end.getTime() - interval.start.getTime();
    const running = openEnded && index === intervals.length - 1;
    const gap = index > 0 ? interval.start.getTime() - intervals[index - 1]!.end.getTime() : 0;
    const previous = rows.at(-1);
    if (index > 0 && gap <= 0 && previous) {
      previous.durationMs += durationMs;
      previous.running = running;
      return;
    }
    if (gap > 0) rows.push({ kind: 'awake', durationMs: gap, running: false });
    rows.push({ kind: 'asleep', durationMs, running });
  });
  if (summary.paused) {
    rows.push({
      kind: 'awake',
      durationMs: Math.max(0, now.getTime() - intervals.at(-1)!.end.getTime()),
      running: true,
    });
  }
  return rows;
}
