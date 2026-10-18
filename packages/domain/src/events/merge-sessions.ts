import { formatDurationShort } from '../format/duration';
import { MINUTE_MS } from '../time/constants';
import { byStartedAtAsc, ms } from '../time/instants';
import type { BabyEvent } from './types';

export const MERGE_WITHIN_MS = 20 * MINUTE_MS;

export type MergeableType = 'breast_feed' | 'sleep';

export interface SessionMerge {
  type: MergeableType;
  earlierId: string;
  laterId: string;
  gapMs: number;
}

const isMergeable = (event: BabyEvent): event is Extract<BabyEvent, { type: MergeableType }> =>
  (event.type === 'breast_feed' || event.type === 'sleep') && !event.deletedAt;

export function mergeCandidate(earlier: BabyEvent, later: BabyEvent): SessionMerge | null {
  if (!isMergeable(earlier) || !isMergeable(later)) return null;
  if (earlier.type !== later.type || earlier.babyId !== later.babyId) return null;
  if (earlier.endedAt === null || ms(later.startedAt) <= ms(earlier.startedAt)) return null;
  if (later.endedAt !== null && ms(later.endedAt) < ms(earlier.endedAt)) return null;
  const gapMs = ms(later.startedAt) - ms(earlier.endedAt);
  if (gapMs > MERGE_WITHIN_MS) return null;
  return { type: later.type, earlierId: earlier.id, laterId: later.id, gapMs };
}

export function mergeableSessions(events: readonly BabyEvent[]): Map<string, SessionMerge> {
  const merges = new Map<string, SessionMerge>();
  for (const type of ['breast_feed', 'sleep'] as const) {
    const sessions = events.filter((event) => isMergeable(event) && event.type === type).sort(byStartedAtAsc);
    sessions.forEach((later, index) => {
      const earlier = sessions[index - 1];
      const merge = earlier && mergeCandidate(earlier, later);
      if (merge) merges.set(later.id, merge);
    });
  }
  return merges;
}

export function liveMergeOffer(running: BabyEvent, events: readonly BabyEvent[]): SessionMerge | null {
  if (!isMergeable(running) || running.endedAt !== null) return null;
  const earlier = events
    .filter(
      (event) =>
        isMergeable(event) &&
        event.type === running.type &&
        event.id !== running.id &&
        ms(event.startedAt) < ms(running.startedAt),
    )
    .sort(byStartedAtAsc)
    .at(-1);
  return earlier ? mergeCandidate(earlier, running) : null;
}

const NOUNS: Record<MergeableType, { one: string; many: string }> = {
  breast_feed: { one: 'feed', many: 'feeds' },
  sleep: { one: 'sleep', many: 'sleeps' },
};

export function mergeGapText(gapMs: number): string {
  if (gapMs < 0)
    return -gapMs < MINUTE_MS ? 'Overlaps by under a minute' : `Overlaps by ${formatDurationShort(-gapMs)}`;
  return gapMs < MINUTE_MS ? 'Under a minute apart' : `${formatDurationShort(gapMs)} apart`;
}

export function liveMergeText(merge: SessionMerge): string {
  const { one } = NOUNS[merge.type];
  if (merge.gapMs < 0) return `Started before the last ${one} ended`;
  return merge.gapMs < MINUTE_MS
    ? `Started straight after the last ${one}`
    : `Started ${formatDurationShort(merge.gapMs)} after the last ${one}`;
}

export function resumeCopy(type: MergeableType): { action: string; hint: string } {
  const { one } = NOUNS[type];
  return {
    action: `Resume ${one}`,
    hint: `Resume only appears on the most recent ${one}, for ${MERGE_WITHIN_MS / MINUTE_MS} minutes after it ends.`,
  };
}

export interface MergeCopy {
  title: string;
  confirm: string;
  liveConfirm: string;
}

export function mergeCopy(type: MergeableType): MergeCopy {
  if (type === 'sleep') {
    return {
      title: 'Merge sleeps',
      confirm:
        "Merge these two sleeps into one? Any time between them shows as awake, notes are combined, and this can't be undone.",
      liveConfirm: 'Merge this sleep into the last one? It keeps running as one sleep, with the time between as awake.',
    };
  }
  return {
    title: 'Merge feeds',
    confirm: "Merge these two feeds into one? Their sides and notes are combined, and this can't be undone.",
    liveConfirm: "Merge this feed into the last one? It keeps running as one feed, with both feeds' sides.",
  };
}
