import type { Side, TimedSegment } from './types';

export type SessionRow =
  | { kind: 'side'; side: Side; durationMs: number; running: boolean }
  | { kind: 'downtime'; durationMs: number; running: boolean; latest?: true };

export interface SessionSummary {
  rows: SessionRow[];
  activeMs: number;
  downtimeMs: number;
  leftMs: number;
  rightMs: number;
  spanMs: number;
}

interface Interval {
  side: Side;
  start: number;
  end: number;
  open: boolean;
}

export function summariseSegments(
  segments: readonly TimedSegment[],
  options: { mergeGapMs: number; now: Date; pausedSince?: string | null },
): SessionSummary {
  const now = options.now.getTime();
  const all: Interval[] = [...segments]
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
    .map((segment) => ({
      side: segment.side,
      start: Date.parse(segment.startedAt),
      end: segment.endedAt ? Date.parse(segment.endedAt) : now,
      open: segment.endedAt === null,
    }));
  const meaningful = all.filter((interval) => interval.open || interval.end - interval.start >= options.mergeGapMs);
  const intervals = meaningful.length > 0 ? meaningful : all;

  const rows: SessionRow[] = [];
  let downtimeMs = 0;
  let latestGap: Extract<SessionRow, { kind: 'downtime' }> | null = null;
  let lastSide: Extract<SessionRow, { kind: 'side' }> | null = null;

  const addDowntime = (durationMs: number, running: boolean) => {
    const last = rows.at(-1);
    if (last?.kind === 'downtime') {
      last.durationMs += durationMs;
      last.running = running;
      return last;
    }
    const row = { kind: 'downtime' as const, durationMs, running };
    rows.push(row);
    return row;
  };

  for (const [index, interval] of intervals.entries()) {
    const previous = intervals[index - 1];
    const gap = previous ? Math.max(0, interval.start - previous.end) : 0;
    if (previous && gap >= options.mergeGapMs) {
      latestGap = addDowntime(gap, false);
      downtimeMs += gap;
    }
    const duration = Math.max(0, interval.end - interval.start);
    if (lastSide && rows.at(-1) === lastSide && lastSide.side === interval.side) {
      lastSide.durationMs += duration;
      lastSide.running = interval.open;
    } else {
      lastSide = { kind: 'side', side: interval.side, durationMs: duration, running: interval.open };
      rows.push(lastSide);
    }
  }
  if (latestGap) latestGap.latest = true;

  const lastInterval = intervals.at(-1);
  if (options.pausedSince && lastInterval && !lastInterval.open) {
    const idle = Math.max(0, now - Math.max(Date.parse(options.pausedSince), lastInterval.end));
    if (idle > 0) {
      addDowntime(idle, true);
      downtimeMs += idle;
    }
  }

  const sideMs = (side: Side) =>
    intervals.filter((i) => i.side === side).reduce((sum, i) => sum + Math.max(0, i.end - i.start), 0);
  const leftMs = sideMs('left');
  const rightMs = sideMs('right');
  const first = intervals[0];
  const spanEnd = options.pausedSince ? now : (lastInterval?.end ?? now);

  return {
    rows,
    activeMs: leftMs + rightMs,
    downtimeMs,
    leftMs,
    rightMs,
    spanMs: first ? Math.max(0, spanEnd - first.start) : 0,
  };
}

export type EditableRow = { kind: 'side'; side: Side; durationMs: number } | { kind: 'downtime'; durationMs: number };

export function segmentsToEditableRows(segments: readonly TimedSegment[], now: Date): EditableRow[] {
  const sorted = [...segments].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  const rows: EditableRow[] = [];
  sorted.forEach((segment, index) => {
    const previous = sorted[index - 1];
    if (previous?.endedAt) {
      const gap = Date.parse(segment.startedAt) - Date.parse(previous.endedAt);
      if (gap > 0) rows.push({ kind: 'downtime', durationMs: gap });
    }
    const end = segment.endedAt ? Date.parse(segment.endedAt) : now.getTime();
    rows.push({ kind: 'side', side: segment.side, durationMs: Math.max(0, end - Date.parse(segment.startedAt)) });
  });
  return rows;
}

export function editableRowsToSegments(
  startedAt: string,
  rows: readonly EditableRow[],
): { segments: TimedSegment[]; endedAt: string } {
  let cursor = Date.parse(startedAt);
  const segments: TimedSegment[] = [];
  for (const row of rows) {
    const duration = Math.max(0, Math.round(row.durationMs));
    if (row.kind === 'downtime') {
      cursor += duration;
      continue;
    }
    if (duration === 0) continue;
    segments.push({
      side: row.side,
      startedAt: new Date(cursor).toISOString(),
      endedAt: new Date(cursor + duration).toISOString(),
    });
    cursor += duration;
  }
  const lastEnd = segments.at(-1)?.endedAt ?? startedAt;
  return { segments, endedAt: lastEnd };
}
