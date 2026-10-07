import {
  babySettingsQuery,
  deleteEvent,
  endSession,
  pauseSession,
  queryKeys,
  restoreEvent,
  resumeSession,
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

export function useUnits(client: BabbleClient, babyId: string): Units {
  return useQuery(babySettingsQuery(client, babyId)).data?.units ?? 'metric';
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
      const next = applySessionAction(event, action, new Date());
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
