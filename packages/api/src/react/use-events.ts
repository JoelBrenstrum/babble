import {
  applySessionAction,
  sessionNoun,
  type BabyEvent,
  type EventDraft,
  type SessionAction,
  type SessionMerge,
  type SessionType,
  type Side,
  type Units,
} from '@babble/domain';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import type { BabbleClient } from '../client';
import { clock } from '../clock';
import { toBabbleError } from '../errors';
import {
  deleteEvent,
  restoreEvent,
  mergeSessions,
  reopenSession,
  type ReopenTarget,
  runSessionAction,
  saveEvent,
  savePumpAmounts,
  saveSleepDetails,
  startSession,
  subscribeToBabyEvents,
  type PumpAmountChanges,
  type SleepChanges,
} from '../events';
import { runNapAction, type DataNapAction } from '../nap';
import { babySettingsQuery, queryKeys, runningEventsQuery } from '../queries';
import { autoEndStaleSessions } from './auto-end';
import { useNotify, type Notify } from './notify';
import {
  mergePumpAmounts,
  mergeSleepDetails,
  optimisticRunning,
  restoreEventCaches,
  type EventCacheSnapshot,
} from './optimistic';
import { refreshEvents } from './refresh';
import { trackingSettingsFrom, type TrackingSettings } from './tracking-settings';

export type { TrackingSettings };

const AUTO_END_CHECK_MS = 60_000;

export function useRealtimeEvents(client: BabbleClient, babyId: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const invalidate = () => void queryClient.invalidateQueries({ queryKey: queryKeys.events(babyId) });
    return subscribeToBabyEvents(client, babyId, invalidate, invalidate);
  }, [client, babyId, queryClient]);
}

export function useTrackingSettings(client: BabbleClient, babyId: string): TrackingSettings {
  return trackingSettingsFrom(useQuery(babySettingsQuery(client, babyId)).data);
}

export function useUnits(client: BabbleClient, babyId: string): Units {
  return useTrackingSettings(client, babyId).units;
}

export function useAutoEndStaleSessions(
  client: BabbleClient,
  babyId: string,
  options: { recheckKey?: unknown; enabled?: boolean } = {},
) {
  const queryClient = useQueryClient();
  const { autoEndPausedMinutes } = useTrackingSettings(client, babyId);
  const running = useQuery(runningEventsQuery(client, babyId)).data;
  const inFlight = useRef(new Set<string>());
  const { recheckKey, enabled = true } = options;
  useEffect(() => {
    if (!enabled) return;
    const check = () =>
      void autoEndStaleSessions({
        client,
        queryClient,
        babyId,
        running: running ?? [],
        now: clock.now(),
        autoEndMinutes: autoEndPausedMinutes,
        inFlight: inFlight.current,
      });
    check();
    const id = setInterval(check, AUTO_END_CHECK_MS);
    return () => clearInterval(id);
  }, [running, autoEndPausedMinutes, client, babyId, queryClient, recheckKey, enabled]);
}

function undoAction(client: BabbleClient, queryClient: QueryClient, babyId: string, eventId: string) {
  return {
    label: 'Undo',
    run: () => void restoreEvent(client, eventId).then(() => refreshEvents(queryClient, babyId)),
  };
}

interface OptimisticContext {
  eventId: string;
  snapshot: EventCacheSnapshot;
}

interface OptimisticTarget {
  eventId: string;
  fallback?: BabyEvent;
  produce: (current: BabyEvent) => BabyEvent;
}

function useEventMutation<V, R = unknown>(
  babyId: string,
  options: {
    mutationFn: (variables: V) => Promise<R>;
    optimistic?: (variables: V) => OptimisticTarget | null;
    onSuccess?: (variables: V, notify: Notify) => void;
    toastErrors?: boolean;
  },
) {
  const queryClient = useQueryClient();
  const notify = useNotify();
  return useMutation<R, Error, V, OptimisticContext | undefined>({
    mutationFn: options.mutationFn,
    onMutate: async (variables) => {
      const target = options.optimistic?.(variables);
      if (!target) return undefined;
      const { eventId, fallback, produce } = target;
      const snapshot = await optimisticRunning(queryClient, babyId, eventId, produce, fallback);
      return { eventId, snapshot };
    },
    onSuccess: (_, variables) => options.onSuccess?.(variables, notify),
    onError: (error, _, context) => {
      if (context) restoreEventCaches(queryClient, babyId, context.eventId, context.snapshot);
      if (options.toastErrors) notify({ message: toBabbleError(error).message });
    },
    onSettled: () => refreshEvents(queryClient, babyId),
  });
}

export function useSaveEvent(client: BabbleClient, babyId: string) {
  return useEventMutation(babyId, {
    mutationFn: ({ draft, id }: { draft: EventDraft; id?: string }) => saveEvent(client, babyId, draft, id),
  });
}

export function useDeleteEvent(client: BabbleClient, babyId: string) {
  const queryClient = useQueryClient();
  return useEventMutation(babyId, {
    mutationFn: (event: BabyEvent) => deleteEvent(client, event.id),
    onSuccess: (event, notify) =>
      notify({ message: 'Entry deleted', action: undoAction(client, queryClient, babyId, event.id) }),
    toastErrors: true,
  });
}

export function useRemoveEntry(client: BabbleClient, babyId: string) {
  return useEventMutation(babyId, { mutationFn: (eventId: string) => deleteEvent(client, eventId) });
}

export function useRestoreEntry(client: BabbleClient, babyId: string) {
  return useEventMutation(babyId, { mutationFn: (eventId: string) => restoreEvent(client, eventId) });
}

export function useReopenSession(client: BabbleClient, babyId: string) {
  return useEventMutation(babyId, { mutationFn: (target: ReopenTarget) => reopenSession(client, target) });
}

export function useMergeSessions(client: BabbleClient, babyId: string) {
  return useEventMutation(babyId, { mutationFn: (merge: SessionMerge) => mergeSessions(client, merge) });
}

export function useStartSession(client: BabbleClient, babyId: string) {
  return useEventMutation(babyId, {
    mutationFn: ({ type, side, startAt }: { type: SessionType; side?: Side; startAt?: string }) =>
      startSession(client, babyId, type, side, startAt),
  });
}

export function useSessionAction(client: BabbleClient, babyId: string) {
  return useEventMutation(babyId, {
    mutationFn: ({ event, action }: { event: BabyEvent; action: SessionAction }) =>
      runSessionAction(client, event.id, action),
    optimistic: ({ event, action }) => ({
      eventId: event.id,
      fallback: event,
      produce: (current) => applySessionAction(current, action, clock.now()),
    }),
    toastErrors: true,
  });
}

export function useDiscardSession(client: BabbleClient, babyId: string) {
  const queryClient = useQueryClient();
  return useEventMutation(babyId, {
    mutationFn: (event: BabyEvent) => deleteEvent(client, event.id),
    optimistic: (event) => ({
      eventId: event.id,
      fallback: event,
      produce: (current) => ({ ...current, deletedAt: clock.now().toISOString() }),
    }),
    onSuccess: (event, notify) => {
      const noun = sessionNoun(event.type);
      notify({
        message: `${noun[0]!.toUpperCase()}${noun.slice(1)} discarded`,
        action: undoAction(client, queryClient, babyId, event.id),
      });
    },
    toastErrors: true,
  });
}

export function useSaveSleepDetails(client: BabbleClient, babyId: string) {
  return useEventMutation(babyId, {
    mutationFn: ({ eventId, changes }: { eventId: string; changes: SleepChanges }) =>
      saveSleepDetails(client, eventId, changes),
    optimistic: ({ eventId, changes }) => ({
      eventId,
      produce: (current) => mergeSleepDetails(current, changes),
    }),
    toastErrors: true,
  });
}

export function useSavePumpAmounts(client: BabbleClient, babyId: string) {
  return useOptimisticEventMutation(babyId, {
    mutationFn: ({ eventId, changes }: { eventId: string; changes: PumpAmountChanges }) =>
      savePumpAmounts(client, eventId, changes),
    target: ({ eventId, changes }) => ({
      eventId,
      produce: (current) => mergePumpAmounts(current, changes),
    }),
  });
}

export function useNapAction(client: BabbleClient, babyId: string) {
  return useEventMutation(babyId, {
    mutationFn: (action: DataNapAction) => runNapAction(client, babyId, action),
    optimistic: (action) =>
      action.kind === 'start-nap'
        ? null
        : {
            eventId: action.kind === 'end-nap' ? action.napId : action.feedId,
            produce: (current) => applySessionAction(current, { kind: 'end', at: action.at }, clock.now()),
          },
    toastErrors: true,
  });
}
