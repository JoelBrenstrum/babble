import type { BabyEvent } from './types';

export function latestFeed(events: readonly BabyEvent[]): BabyEvent | undefined {
  return events
    .filter((event) => (event.type === 'breast_feed' || event.type === 'bottle') && !event.deletedAt)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];
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
  const limit = autoEndMinutes * 60_000;
  return running.filter((event) => {
    if (event.type !== 'breast_feed' && event.type !== 'pump') return false;
    if (event.segments.some((segment) => segment.endedAt === null)) return false;
    const lastEnd = event.segments.reduce(
      (latest, segment) => Math.max(latest, segment.endedAt ? Date.parse(segment.endedAt) : 0),
      Date.parse(event.startedAt),
    );
    return now.getTime() - lastEnd >= limit;
  });
}

export type NapPrompt =
  { kind: 'end-nap'; nap: BabyEvent; feedStartedAt: string } | { kind: 'start-nap'; feedEndedAt: string };

export function napPromptOnFeedStart(running: readonly BabyEvent[], feedStartedAt: string): NapPrompt | null {
  const nap = running.find((event) => event.type === 'sleep' && event.endedAt === null);
  return nap ? { kind: 'end-nap', nap, feedStartedAt } : null;
}

export function napPromptOnFeedEnd(running: readonly BabyEvent[], feedEndedAt: string): NapPrompt | null {
  const napRunning = running.some((event) => event.type === 'sleep' && event.endedAt === null);
  return napRunning ? null : { kind: 'start-nap', feedEndedAt };
}
