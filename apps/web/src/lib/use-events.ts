import {
  clock,
  babySettingsQuery,
  deleteEvent,
  endSession,
  pauseSession,
  queryKeys,
  restoreEvent,
  resumeSession,
  runningEventsQuery,
  saveEvent,
  startSession,
  subscribeToBabyEvents,
  switchSide,
  toBabbleError,
  type BabbleClient,
} from '@babble/api';
import {
  applySessionAction,
  sessionNoun,
  staleSessions,
  type BabyEvent,
  type EventDraft,
  type SessionAction,
  type Side,
  type Units,
} from '@babble/domain';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useToast } from '#/components/ui/toast';
import type { SessionType } from '@babble/domain';

export function useRealtimeEvents(client: BabbleClient, babyId: string) {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      subscribeToBabyEvents(
        client,
        babyId,
        () => void queryClient.invalidateQueries({ queryKey: queryKeys.events(babyId) }),
      ),
    [client, babyId, queryClient],
  );
}

export interface TrackingSettings {
  units: Units;
  mergeGapMs: number;
  autoEndPausedMinutes: number;
}

export function useTrackingSettings(client: BabbleClient, babyId: string): TrackingSettings {
  const settings = useQuery(babySettingsQuery(client, babyId)).data;
  return {
    units: settings?.units ?? 'metric',
    mergeGapMs: (settings?.downtime_merge_threshold_sec ?? 15) * 1000,
    autoEndPausedMinutes: settings?.auto_end_paused_session_min ?? 30,
  };
}

export function useUnits(client: BabbleClient, babyId: string): Units {
  return useTrackingSettings(client, babyId).units;
}

export function useAutoEndStaleSessions(client: BabbleClient, babyId: string) {
  const queryClient = useQueryClient();
  const { autoEndPausedMinutes } = useTrackingSettings(client, babyId);
  const running = useQuery(runningEventsQuery(client, babyId)).data;
  useEffect(() => {
    const check = () => {
      const stale = staleSessions(running ?? [], clock.now(), autoEndPausedMinutes);
      if (stale.length === 0) return;
      void Promise.all(stale.map((event) => endSession(client, event.id))).then(() =>
        refreshEvents(queryClient, babyId),
      );
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [running, autoEndPausedMinutes, client, babyId, queryClient]);
}

function refreshEvents(queryClient: QueryClient, babyId: string) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.events(babyId), refetchType: 'all' });
}

export function useSaveEvent(client: BabbleClient, babyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ draft, id }: { draft: EventDraft; id?: string }) => saveEvent(client, babyId, draft, id),
    onSettled: () => refreshEvents(queryClient, babyId),
  });
}

export function useDeleteEvent(client: BabbleClient, babyId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (event: BabyEvent) => deleteEvent(client, event.id),
    onSuccess: (_, event) => {
      toast({
        message: 'Entry deleted',
        action: {
          label: 'Undo',
          onClick: () => void restoreEvent(client, event.id).then(() => refreshEvents(queryClient, babyId)),
        },
      });
    },
    onError: (error) => toast({ message: toBabbleError(error).message }),
    onSettled: () => refreshEvents(queryClient, babyId),
  });
}

export function useStartSession(client: BabbleClient, babyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, side }: { type: SessionType; side?: Side }) => startSession(client, babyId, type, side),
    onSettled: () => refreshEvents(queryClient, babyId),
  });
}

export function useSessionAction(client: BabbleClient, babyId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const runningKey = queryKeys.runningEvents(babyId);

  return useMutation({
    mutationFn: ({ event, action }: { event: BabyEvent; action: SessionAction }) => {
      switch (action.kind) {
        case 'switch':
          return switchSide(client, event.id, action.side);
        case 'pause':
          return pauseSession(client, event.id);
        case 'resume':
          return resumeSession(client, event.id, action.side);
        case 'end':
          return endSession(client, event.id);
      }
    },
    onMutate: async ({ event, action }) => {
      await queryClient.cancelQueries({ queryKey: runningKey });
      const previous = queryClient.getQueryData<BabyEvent[]>(runningKey);
      const next = applySessionAction(event, action, clock.now());
      queryClient.setQueryData<BabyEvent[]>(runningKey, (current) =>
        (current ?? []).flatMap((item) => (item.id !== event.id ? [item] : next.endedAt ? [] : [next])),
      );
      queryClient.setQueryData(queryKeys.event(babyId, event.id), next);
      return { previous };
    },
    onError: (error, _, context) => {
      if (context?.previous) queryClient.setQueryData(runningKey, context.previous);
      toast({ message: toBabbleError(error).message });
    },
    onSettled: () => refreshEvents(queryClient, babyId),
  });
}

export function useDiscardSession(client: BabbleClient, babyId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const runningKey = queryKeys.runningEvents(babyId);

  return useMutation({
    mutationFn: (event: BabyEvent) => deleteEvent(client, event.id),
    onMutate: async (event) => {
      await queryClient.cancelQueries({ queryKey: runningKey });
      const previous = queryClient.getQueryData<BabyEvent[]>(runningKey);
      queryClient.setQueryData<BabyEvent[]>(runningKey, (current) =>
        (current ?? []).filter((item) => item.id !== event.id),
      );
      return { previous };
    },
    onSuccess: (_, event) => {
      const noun = sessionNoun(event.type);
      toast({
        message: `${noun[0]!.toUpperCase()}${noun.slice(1)} discarded`,
        action: {
          label: 'Undo',
          onClick: () => void restoreEvent(client, event.id).then(() => refreshEvents(queryClient, babyId)),
        },
      });
    },
    onError: (error, _, context) => {
      if (context?.previous) queryClient.setQueryData(runningKey, context.previous);
      toast({ message: toBabbleError(error).message });
    },
    onSettled: () => refreshEvents(queryClient, babyId),
  });
}
