import { applySessionAction, type BabyEvent, type SessionAction } from '@babble/domain';
import type { QueryClient } from '@tanstack/react-query';
import type { SleepChanges } from '../events';
import { queryKeys } from '../queries';

export interface EventCacheSnapshot {
  running: BabyEvent[] | undefined;
  single: BabyEvent | undefined;
}

export function replaceInRunning(running: readonly BabyEvent[], next: BabyEvent): BabyEvent[] {
  return running.flatMap((item) => (item.id !== next.id ? [item] : next.endedAt || next.deletedAt ? [] : [next]));
}

export function applyRunningUpdate(
  running: readonly BabyEvent[],
  event: BabyEvent,
  action: SessionAction,
  now: Date,
): BabyEvent[] {
  return replaceInRunning(running, applySessionAction(event, action, now));
}

export function mergeSleepDetails(event: BabyEvent, changes: SleepChanges): BabyEvent {
  if (event.type !== 'sleep') return event;
  const { notes, ...details } = changes;
  return {
    ...event,
    details: { ...event.details, ...details },
    ...('notes' in changes ? { notes: notes ?? null } : {}),
  };
}

export function findCachedEvent(queryClient: QueryClient, babyId: string, eventId: string): BabyEvent | undefined {
  return (
    queryClient.getQueryData<BabyEvent[]>(queryKeys.runningEvents(babyId))?.find((item) => item.id === eventId) ??
    queryClient.getQueryData<BabyEvent>(queryKeys.event(babyId, eventId))
  );
}

export function snapshotEventCaches(queryClient: QueryClient, babyId: string, eventId: string): EventCacheSnapshot {
  return {
    running: queryClient.getQueryData<BabyEvent[]>(queryKeys.runningEvents(babyId)),
    single: queryClient.getQueryData<BabyEvent>(queryKeys.event(babyId, eventId)),
  };
}

export function restoreEventCaches(
  queryClient: QueryClient,
  babyId: string,
  eventId: string,
  snapshot: EventCacheSnapshot,
): void {
  if (snapshot.running) queryClient.setQueryData(queryKeys.runningEvents(babyId), snapshot.running);
  if (snapshot.single) queryClient.setQueryData(queryKeys.event(babyId, eventId), snapshot.single);
}

export function patchEventCaches(queryClient: QueryClient, babyId: string, event: BabyEvent): void {
  queryClient.setQueryData<BabyEvent[]>(queryKeys.runningEvents(babyId), (current) =>
    current ? replaceInRunning(current, event) : current,
  );
  if (queryClient.getQueryData(queryKeys.event(babyId, event.id)) !== undefined) {
    queryClient.setQueryData(queryKeys.event(babyId, event.id), event);
  }
}

export async function optimisticRunning(
  queryClient: QueryClient,
  babyId: string,
  eventId: string,
  produce: (current: BabyEvent) => BabyEvent,
  fallback?: BabyEvent,
): Promise<EventCacheSnapshot> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: queryKeys.runningEvents(babyId) }),
    queryClient.cancelQueries({ queryKey: queryKeys.event(babyId, eventId) }),
  ]);
  const snapshot = snapshotEventCaches(queryClient, babyId, eventId);
  const current = findCachedEvent(queryClient, babyId, eventId) ?? fallback;
  if (current) patchEventCaches(queryClient, babyId, produce(current));
  return snapshot;
}
