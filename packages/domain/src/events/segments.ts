import { byStartedAtAsc } from '../time/instants';
import type { BabyEvent, EventOfType, Side, Stretch, TimedSegment } from './types';

export type SegmentLike = TimedSegment;

export interface SegmentTotals {
  leftMs: number;
  rightMs: number;
  activeMs: number;
  openSide: Side | null;
  lastSide: Side | null;
  openSegmentStartedAt: string | null;
  open: { side: Side; startedAt: string } | null;
}

export type SegmentedEvent = EventOfType<'breast_feed' | 'pump' | 'sleep'>;

export function hasSegments(event: BabyEvent): event is SegmentedEvent {
  return event.type === 'breast_feed' || event.type === 'pump' || event.type === 'sleep';
}

export function mapSegments(event: BabyEvent, map: <S extends Stretch>(segments: S[]) => S[]): BabyEvent {
  switch (event.type) {
    case 'sleep':
      return { ...event, segments: map(event.segments) };
    case 'breast_feed':
      return { ...event, segments: map(event.segments) };
    case 'pump':
      return { ...event, segments: map(event.segments) };
    default:
      return event;
  }
}

export function lastSegmentEnd(event: { segments: readonly Stretch[] }): number | null {
  let latest: number | null = null;
  for (const segment of event.segments) {
    if (segment.endedAt === null) return null;
    const end = Date.parse(segment.endedAt);
    if (latest === null || end > latest) latest = end;
  }
  return latest;
}

export function segmentTotals(segments: readonly TimedSegment[], now: Date): SegmentTotals {
  const sorted = [...segments].sort(byStartedAtAsc);
  let leftMs = 0;
  let rightMs = 0;
  let open: TimedSegment | null = null;

  for (const segment of sorted) {
    const end = segment.endedAt ? Date.parse(segment.endedAt) : now.getTime();
    const duration = Math.max(0, end - Date.parse(segment.startedAt));
    if (segment.side === 'left') leftMs += duration;
    else rightMs += duration;
    if (!segment.endedAt) open = segment;
  }

  return {
    leftMs,
    rightMs,
    activeMs: leftMs + rightMs,
    openSide: open?.side ?? null,
    lastSide: sorted.at(-1)?.side ?? null,
    openSegmentStartedAt: open?.startedAt ?? null,
    open: open ? { side: open.side, startedAt: open.startedAt } : null,
  };
}

export function otherSide(side: Side): Side {
  return side === 'left' ? 'right' : 'left';
}
