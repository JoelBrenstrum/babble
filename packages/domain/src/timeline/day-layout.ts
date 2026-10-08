import type { BabyEvent, Side } from '../events/types';
import { dayWindow } from '../time/local-time';
import { fractionOf, type TimeWindow } from './days';

export interface TimelineItem {
  event: BabyEvent;
  startFrac: number;
  endFrac: number;
  running: boolean;
  continuesBefore: boolean;
  continuesAfter: boolean;
  column: number;
  parts: { side: Side | null; startFrac: number; endFrac: number }[];
}

export interface DayLayout {
  sleep: TimelineItem[];
  feeds: TimelineItem[];
  nappies: TimelineItem[];
  pumps: TimelineItem[];
}

const LANE: Partial<Record<BabyEvent['type'], keyof DayLayout>> = {
  sleep: 'sleep',
  breast_feed: 'feeds',
  bottle: 'feeds',
  nappy: 'nappies',
  pump: 'pumps',
};

export const MARKER_GAP_FRAC = 0.035;

const INSTANT_TYPES = new Set<BabyEvent['type']>(['bottle', 'nappy']);

export function eventSpan(event: BabyEvent, now: Date): TimeWindow {
  const start = new Date(event.startedAt);
  if (INSTANT_TYPES.has(event.type)) return { start, end: start };
  const end = event.endedAt ? new Date(event.endedAt) : now;
  return { start, end: end < start ? start : end };
}

export function overlapsWindow(event: BabyEvent, window: TimeWindow, now: Date): boolean {
  if (event.deletedAt) return false;
  const span = eventSpan(event, now);
  if (span.start.getTime() === span.end.getTime()) return span.start >= window.start && span.start < window.end;
  return span.start < window.end && span.end > window.start;
}

export function dayLayout(events: readonly BabyEvent[], window: TimeWindow, now: Date): DayLayout {
  const layout: DayLayout = { sleep: [], feeds: [], nappies: [], pumps: [] };
  const lastMarker: Record<keyof DayLayout, number[]> = { sleep: [], feeds: [], nappies: [], pumps: [] };
  const sorted = [...events].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));

  for (const event of sorted) {
    const lane = LANE[event.type];
    if (!lane || !overlapsWindow(event, window, now)) continue;
    const span = eventSpan(event, now);
    const startFrac = fractionOf(window, span.start.getTime());
    let column = 0;
    if (INSTANT_TYPES.has(event.type)) {
      const columns = lastMarker[lane];
      while (columns[column] !== undefined && startFrac - columns[column]! < MARKER_GAP_FRAC) column += 1;
      columns[column] = startFrac;
    }
    const segments: { side: Side | null; startedAt: string; endedAt: string | null }[] =
      event.type === 'breast_feed' || event.type === 'pump'
        ? event.segments
        : event.type === 'sleep'
          ? event.segments.map((stretch) => ({ ...stretch, side: null }))
          : [];
    layout[lane].push({
      event,
      startFrac,
      endFrac: fractionOf(window, span.end.getTime()),
      running: event.endedAt === null && !INSTANT_TYPES.has(event.type),
      continuesBefore: span.start < window.start,
      continuesAfter: span.end > window.end,
      column,
      parts: segments.map((segment) => ({
        side: segment.side,
        startFrac: fractionOf(window, Date.parse(segment.startedAt)),
        endFrac: fractionOf(window, segment.endedAt ? Date.parse(segment.endedAt) : now.getTime()),
      })),
    });
  }
  return layout;
}

export function bucketByDay(
  events: readonly BabyEvent[],
  dayKeys: readonly string[],
  timeZone: string,
  dayStartMinutes: number,
  now: Date,
): { dayKey: string; window: TimeWindow; events: BabyEvent[] }[] {
  return dayKeys.map((dayKey) => {
    const window = dayWindow(dayKey, timeZone, dayStartMinutes);
    return { dayKey, window, events: events.filter((event) => overlapsWindow(event, window, now)) };
  });
}

const MARKER_SHIFT_PERCENT = 30;
const MARKER_MAX_SHIFTS = 2;

export function markerShiftPercent(column: number): number {
  return Math.min(column, MARKER_MAX_SHIFTS) * MARKER_SHIFT_PERCENT;
}
