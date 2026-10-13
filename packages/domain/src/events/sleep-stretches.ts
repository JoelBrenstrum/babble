import { overlapMs, type TimeWindow } from '../timeline/days';
import type { SleepStretch } from './types';
import { byStartedAtAsc } from '../time/instants';

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

const sorted = (stretches: readonly SleepStretch[]) => [...stretches].sort(byStartedAtAsc);

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

export type NapRow = { kind: 'asleep' | 'awake'; durationMs: number; running: boolean };

export interface NapTimeline {
  intervals: TimeWindow[];
  rows: NapRow[];
  paused: boolean;
}

export function napTimeline(nap: NapLike, now: Date): NapTimeline {
  const intervals = asleepIntervals(nap, now);
  const paused = nap.endedAt === null && nap.segments.length > 0 && nap.segments.every((s) => s.endedAt !== null);
  const openEnded = nap.endedAt === null && !paused;
  const rows: NapRow[] = [];
  intervals.forEach((interval, index) => {
    const durationMs = interval.end.getTime() - interval.start.getTime();
    const running = openEnded && index === intervals.length - 1;
    const previousInterval = intervals[index - 1];
    const gap = previousInterval ? interval.start.getTime() - previousInterval.end.getTime() : 0;
    const previous = rows.at(-1);
    if (previousInterval && gap <= 0 && previous) {
      previous.durationMs += durationMs;
      previous.running = running;
      return;
    }
    if (gap > 0) rows.push({ kind: 'awake', durationMs: gap, running: false });
    rows.push({ kind: 'asleep', durationMs, running });
  });
  const last = intervals.at(-1);
  if (paused && last) {
    rows.push({ kind: 'awake', durationMs: Math.max(0, now.getTime() - last.end.getTime()), running: true });
  }
  return { intervals, rows, paused };
}

const totalMs = (rows: readonly NapRow[], kind: NapRow['kind']) =>
  rows.filter((row) => row.kind === kind).reduce((total, row) => total + row.durationMs, 0);

export function summariseSleep(nap: NapLike, now: Date): SleepSummary {
  const { rows, paused } = napTimeline(nap, now);
  return {
    asleepMs: totalMs(rows, 'asleep'),
    awakeMs: totalMs(rows, 'awake'),
    wakeUps: rows.filter((row) => row.kind === 'awake').length,
    paused,
  };
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

export function napRows(nap: NapLike, now: Date): NapRow[] {
  return napTimeline(nap, now).rows;
}
