import { joinSpans, type Span } from '../time/spans';
import type { TimeWindow } from '../time/windows';
import { asleepIntervals } from './sleep-stretches';
import type { AlertEnd, BabyEvent } from './types';

export interface AlertSplit {
  awakeMs: number;
  alertMs: number;
  feedingMs: number;
  otherAwakeMs: number;
  alerts: number;
  longestAlertMs: number;
  endedBy: Partial<Record<AlertEnd, number>>;
}

const union = (spans: readonly Span[]) => joinSpans(spans, (gap) => gap <= 0);

const clip = (spans: readonly Span[], from: number, to: number): Span[] =>
  spans
    .map((span) => ({ start: Math.max(span.start, from), end: Math.min(span.end, to) }))
    .filter((span) => span.end > span.start);

export function subtractSpans(spans: readonly Span[], cuts: readonly Span[]): Span[] {
  const remaining: Span[] = [];
  const sortedCuts = union(cuts);
  for (const span of union(spans)) {
    let start = span.start;
    for (const cut of sortedCuts) {
      if (cut.end <= start || cut.start >= span.end) continue;
      if (cut.start > start) remaining.push({ start, end: cut.start });
      start = Math.max(start, cut.end);
    }
    if (start < span.end) remaining.push({ start, end: span.end });
  }
  return remaining;
}

const totalMs = (spans: readonly Span[]) => spans.reduce((sum, span) => sum + span.end - span.start, 0);

function feedingSpans(event: BabyEvent, now: number): Span[] {
  if (event.type === 'breast_feed') {
    return event.segments.map((segment) => ({
      start: Date.parse(segment.startedAt),
      end: segment.endedAt ? Date.parse(segment.endedAt) : now,
    }));
  }
  if (event.type === 'bottle' && event.endedAt) {
    return [{ start: Date.parse(event.startedAt), end: Date.parse(event.endedAt) }];
  }
  return [];
}

export function alertSplit(events: readonly BabyEvent[], window: TimeWindow, now: Date): AlertSplit {
  const from = window.start.getTime();
  const to = Math.min(window.end.getTime(), now.getTime());
  const split: AlertSplit = {
    awakeMs: 0,
    alertMs: 0,
    feedingMs: 0,
    otherAwakeMs: 0,
    alerts: 0,
    longestAlertMs: 0,
    endedBy: {},
  };
  if (to <= from) return split;

  const live = events.filter((event) => !event.deletedAt);
  const asleep = union(
    clip(
      live.flatMap((event) =>
        event.type === 'sleep'
          ? asleepIntervals(event, now).map((interval) => ({
              start: interval.start.getTime(),
              end: interval.end.getTime(),
            }))
          : [],
      ),
      from,
      to,
    ),
  );
  const alertEvents = live.filter((event) => event.type === 'alert');
  const alert = subtractSpans(
    clip(
      alertEvents.map((event) => ({
        start: Date.parse(event.startedAt),
        end: event.endedAt ? Date.parse(event.endedAt) : now.getTime(),
      })),
      from,
      to,
    ),
    asleep,
  );
  const feeding = subtractSpans(
    clip(
      live.flatMap((event) => feedingSpans(event, now.getTime())),
      from,
      to,
    ),
    [...asleep, ...alert],
  );

  split.awakeMs = to - from - totalMs(asleep);
  split.alertMs = totalMs(alert);
  split.feedingMs = totalMs(feeding);
  split.otherAwakeMs = Math.max(0, split.awakeMs - split.alertMs - split.feedingMs);
  split.longestAlertMs = alert.reduce((longest, span) => Math.max(longest, span.end - span.start), 0);
  for (const event of alertEvents) {
    const start = Date.parse(event.startedAt);
    if (start < from || start >= to) continue;
    split.alerts += 1;
    const reason = event.details.endedBy;
    if (reason) split.endedBy[reason] = (split.endedBy[reason] ?? 0) + 1;
  }
  return split;
}

export function alertShare(split: Pick<AlertSplit, 'alertMs' | 'awakeMs'>): number | null {
  return split.awakeMs > 0 ? split.alertMs / split.awakeMs : null;
}

export function formatShare(share: number | null): string {
  return share === null ? '—' : `${Math.round(share * 100)}%`;
}

export function commonestEnd(counts: Partial<Record<AlertEnd, number>>): AlertEnd | null {
  let best: AlertEnd | null = null;
  for (const [reason, count] of Object.entries(counts) as [AlertEnd, number][]) {
    if (count > 0 && (best === null || count > (counts[best] ?? 0))) best = reason;
  }
  return best;
}
