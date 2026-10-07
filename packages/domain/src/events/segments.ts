import type { Side, TimedSegment } from './types';

export interface SegmentLike {
  side: Side;
  startedAt: string;
  endedAt: string | null;
}

export interface SegmentTotals {
  leftMs: number;
  rightMs: number;
  activeMs: number;
  openSide: Side | null;
  lastSide: Side | null;
  openSegmentStartedAt: string | null;
}

export function segmentTotals(segments: readonly (SegmentLike | TimedSegment)[], now: Date): SegmentTotals {
  const sorted = [...segments].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  let leftMs = 0;
  let rightMs = 0;
  let open: SegmentLike | null = null;

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
  };
}

export function otherSide(side: Side): Side {
  return side === 'left' ? 'right' : 'left';
}
