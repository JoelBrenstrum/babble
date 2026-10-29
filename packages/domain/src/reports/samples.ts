import type { BabyEvent } from '../events/types';
import { nightWindow, type ZonedNightSettings } from '../time/night';
import type { TimeWindow } from '../time/windows';
import type { StatsSettings } from '../stats/settings';
import type { SplitKey } from './spec';

export interface ReportSettings extends StatsSettings {
  birthDate: string;
  carers?: Record<string, string>;
}

export interface Sample {
  event: BabyEvent;
  at: number;
  end?: number;
  value: number;
  tags?: Partial<Record<SplitKey, string[]>>;
}

export interface SampleContext {
  events: readonly BabyEvent[];
  now: Date;
  settings: ReportSettings;
  range: TimeWindow;
  nights: TimeWindow[];
}

export interface Interval {
  start: number;
  end: number;
}

export function nightsOver(dayKeys: readonly string[], settings: ZonedNightSettings): TimeWindow[] {
  if (settings.nightStartMinutes === settings.nightEndMinutes) return [];
  return [...new Set(dayKeys)].map((dayKey) => nightWindow(dayKey, settings));
}

export function clipToWindows(interval: Interval, windows: readonly TimeWindow[]): Interval[] {
  const clipped: Interval[] = [];
  for (const window of windows) {
    const start = Math.max(interval.start, window.start.getTime());
    const end = Math.min(interval.end, window.end.getTime());
    if (end > start) clipped.push({ start, end });
  }
  return clipped;
}

export function subtractWindows(interval: Interval, windows: readonly TimeWindow[]): Interval[] {
  let remaining: Interval[] = [interval];
  for (const window of windows) {
    const start = window.start.getTime();
    const end = window.end.getTime();
    remaining = remaining.flatMap((piece) => {
      if (end <= piece.start || start >= piece.end) return [piece];
      const pieces: Interval[] = [];
      if (start > piece.start) pieces.push({ start: piece.start, end: start });
      if (end < piece.end) pieces.push({ start: end, end: piece.end });
      return pieces;
    });
  }
  return remaining;
}

export function intervalSamples(event: BabyEvent, intervals: readonly Interval[], tags?: Sample['tags']): Sample[] {
  return intervals
    .filter((interval) => interval.end > interval.start)
    .map((interval) => ({
      event,
      at: interval.start,
      end: interval.end,
      value: interval.end - interval.start,
      ...(tags ? { tags } : {}),
    }));
}

export function gapSamples(
  spans: readonly { event: BabyEvent; start: number; end: number }[],
  maxGapMs: number,
  skipWithinMs = 0,
): Sample[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const samples: Sample[] = [];
  let previous: (typeof sorted)[number] | null = null;
  for (const span of sorted) {
    if (previous) {
      const gap = span.start - previous.end;
      if (gap > skipWithinMs && gap < maxGapMs) {
        samples.push({ event: previous.event, at: previous.end, value: gap });
      }
      if (span.end < previous.end) continue;
    }
    previous = span;
  }
  return samples;
}
