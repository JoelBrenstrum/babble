import { formatDurationShort } from '../format/duration';
import { MINUTE_MS } from '../time/constants';
import { byStartedAtAsc, ms } from '../time/instants';
import type { BabyEvent } from './types';

export const MERGE_FEEDS_WITHIN_MS = 30 * MINUTE_MS;

export interface FeedMerge {
  earlierId: string;
  laterId: string;
  gapMs: number;
}

const isBreastFeed = (event: BabyEvent) => event.type === 'breast_feed' && !event.deletedAt;

export function mergeCandidate(earlier: BabyEvent, later: BabyEvent): FeedMerge | null {
  if (!isBreastFeed(earlier) || !isBreastFeed(later) || earlier.babyId !== later.babyId) return null;
  if (earlier.endedAt === null) return null;
  const gapMs = ms(later.startedAt) - ms(earlier.endedAt);
  if (gapMs < 0 || gapMs > MERGE_FEEDS_WITHIN_MS) return null;
  return { earlierId: earlier.id, laterId: later.id, gapMs };
}

export function mergeableFeeds(events: readonly BabyEvent[]): Map<string, FeedMerge> {
  const feeds = events.filter(isBreastFeed).sort(byStartedAtAsc);
  const merges = new Map<string, FeedMerge>();
  feeds.forEach((later, index) => {
    const earlier = feeds[index - 1];
    const merge = earlier && mergeCandidate(earlier, later);
    if (merge) merges.set(later.id, merge);
  });
  return merges;
}

export function liveMergeOffer(running: BabyEvent, events: readonly BabyEvent[]): FeedMerge | null {
  if (!isBreastFeed(running) || running.endedAt !== null) return null;
  const earlier = events
    .filter((event) => isBreastFeed(event) && event.id !== running.id && ms(event.startedAt) < ms(running.startedAt))
    .sort(byStartedAtAsc)
    .at(-1);
  return earlier ? mergeCandidate(earlier, running) : null;
}

export function mergeGapText(gapMs: number): string {
  return gapMs < MINUTE_MS ? 'Under a minute apart' : `${formatDurationShort(gapMs)} apart`;
}

export function liveMergeText(gapMs: number): string {
  return gapMs < MINUTE_MS
    ? 'Started straight after the last feed'
    : `Started ${formatDurationShort(gapMs)} after the last feed`;
}
