import { MINUTE_MS } from '../time/constants';
import { byStartedAtAsc, byStartedAtDesc, ms } from '../time/instants';
import { hasSegments, lastSegmentEnd, otherSide } from './segments';
import type { BabyEvent, EventOfType, Side } from './types';

export function latestFeed(events: readonly BabyEvent[]): BabyEvent | undefined {
  return events
    .filter((event) => (event.type === 'breast_feed' || event.type === 'bottle') && !event.deletedAt)
    .sort(byStartedAtDesc)[0];
}

export function nextBreastSide(events: readonly BabyEvent[]): Side | null {
  const last = events
    .filter((event): event is EventOfType<'breast_feed'> => event.type === 'breast_feed')
    .filter((event) => !event.deletedAt && event.segments.length > 0)
    .sort(byStartedAtDesc)[0];
  const lastSegment = last && [...last.segments].sort(byStartedAtAsc).at(-1);
  return lastSegment ? otherSide(lastSegment.side) : null;
}

export function canResumeFeed(
  event: BabyEvent,
  latestFeedId: string | undefined,
  running: readonly BabyEvent[],
): boolean {
  if (event.type !== 'breast_feed' || event.endedAt === null || event.deletedAt) return false;
  if (event.id !== latestFeedId) return false;
  return !running.some((item) => item.type === 'breast_feed' && item.id !== event.id);
}

export function staleSessions(running: readonly BabyEvent[], now: Date, autoEndMinutes: number): BabyEvent[] {
  const limit = autoEndMinutes * MINUTE_MS;
  return running.filter((event) => {
    if (!hasSegments(event)) return false;
    const settledEnd = lastSegmentEnd(event);
    if (event.segments.length === 0 ? event.type === 'sleep' : settledEnd === null) return false;
    return now.getTime() - Math.max(settledEnd ?? 0, ms(event.startedAt)) >= limit;
  });
}

export function feedEndTime(event: BabyEvent, now: Date): string {
  const end = event.type === 'breast_feed' || event.type === 'pump' ? lastSegmentEnd(event) : null;
  return new Date(end ?? now.getTime()).toISOString();
}
