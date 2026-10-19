// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { emptyDraft, type BabyEvent } from '@babble/domain';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { BabbleClient } from '../client';
import { sampleBaby, sampleRunningSleep } from '../fixtures';
import { queryKeys } from '../queries';
import { fakeClient } from '../test-utils';
import { NotifyProvider, type Toast } from './notify';
import {
  useDeleteEvent,
  useDiscardSession,
  useMergeSessions,
  useRemoveEntry,
  useReopenSession,
  useRestoreEntry,
  useSaveEvent,
  useSaveSleepDetails,
  useSessionAction,
  useStartSession,
} from './use-events';

const NOW = new Date();
const babyId = sampleBaby.id;

function setup(respond: Parameters<typeof fakeClient>[0]) {
  const { client, requests } = fakeClient(respond);
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const sleep = sampleRunningSleep(NOW);
  queryClient.setQueryData<BabyEvent[]>(queryKeys.runningEvents(babyId), [sleep]);
  queryClient.setQueryData(queryKeys.event(babyId, sleep.id), sleep);
  vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
  const toasts: Toast[] = [];
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(NotifyProvider, { notify: (toast: Toast) => void toasts.push(toast) }, children),
    );
  return { client, requests, queryClient, sleep, toasts, wrapper };
}

describe('optimistic session hooks', () => {
  it('rolls back both caches and shows the error when a discard fails', async () => {
    const { client, queryClient, sleep, toasts, wrapper } = setup(() => ({ status: 500, body: { message: 'down' } }));
    const { result } = renderHook(() => useDiscardSession(client, babyId), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(sleep).catch(() => undefined);
    });
    expect(queryClient.getQueryData(queryKeys.runningEvents(babyId))).toEqual([sleep]);
    expect(queryClient.getQueryData(queryKeys.event(babyId, sleep.id))).toEqual(sleep);
    expect(toasts).toHaveLength(1);
    expect(toasts[0]!.action).toBeUndefined();
  });

  it('offers undo after a discard succeeds', async () => {
    const { client, queryClient, sleep, toasts, wrapper } = setup(() => ({ status: 204, body: null }));
    const { result } = renderHook(() => useDiscardSession(client, babyId), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(sleep);
    });
    expect(queryClient.getQueryData(queryKeys.runningEvents(babyId))).toEqual([]);
    expect(toasts[0]).toMatchObject({ message: 'Nap discarded', action: { label: 'Undo' } });
  });

  it('restores the single-event cache when saving sleep details fails', async () => {
    const { client, queryClient, sleep, wrapper } = setup(() => ({ status: 500, body: { message: 'down' } }));
    const { result } = renderHook(() => useSaveSleepDetails(client, babyId), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ eventId: sleep.id, changes: { notes: 'x' } }).catch(() => undefined);
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<BabyEvent>(queryKeys.event(babyId, sleep.id))!.notes).toBeNull();
    expect(queryClient.getQueryData<BabyEvent[]>(queryKeys.runningEvents(babyId))![0]!.notes).toBeNull();
  });

  it('removes a session from the running list when it ends', async () => {
    const { client, queryClient, sleep, wrapper } = setup(() => ({ status: 204, body: null }));
    const { result } = renderHook(() => useSessionAction(client, babyId), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ event: sleep, action: { kind: 'end' } });
    });
    expect(queryClient.getQueryData(queryKeys.runningEvents(babyId))).toEqual([]);
  });
});

describe('plain event hooks', () => {
  const failing = () => ({ status: 500, body: { message: 'down' } });
  const cases: [
    string,
    (client: BabbleClient, babyId: string) => { mutateAsync: (variables: never) => Promise<unknown> },
    unknown,
  ][] = [
    ['useSaveEvent', useSaveEvent, { draft: emptyDraft('nappy', NOW) }],
    ['useRemoveEntry', useRemoveEntry, 'event-1'],
    ['useRestoreEntry', useRestoreEntry, 'event-1'],
    ['useReopenSession', useReopenSession, { type: 'sleep', eventId: 'event-1' }],
    ['useMergeSessions', useMergeSessions, { type: 'sleep', earlierId: 'a', laterId: 'b' }],
    ['useStartSession', useStartSession, { type: 'sleep' }],
  ];

  it.each(cases)('%s leaves a failure to the caller and still refreshes', async (_, useHook, variables) => {
    const { client, queryClient, toasts, wrapper } = setup(failing);
    const { result } = renderHook(() => useHook(client, babyId), { wrapper });
    let failed = false;
    await act(async () => {
      await result.current.mutateAsync(variables as never).catch(() => void (failed = true));
    });
    expect(failed).toBe(true);
    expect(toasts).toEqual([]);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.events(babyId) });
  });

  it('useDeleteEvent reports a failure as a toast because its callers fire and forget', async () => {
    const { client, sleep, toasts, wrapper } = setup(failing);
    const { result } = renderHook(() => useDeleteEvent(client, babyId), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(sleep).catch(() => undefined);
    });
    expect(toasts).toEqual([{ message: 'Something went wrong. Please try again.' }]);
  });

  it('returns the new session id and stays quiet on success', async () => {
    const { client, toasts, wrapper } = setup(() => ({ body: 'event-9' }));
    const { result } = renderHook(() => useStartSession(client, babyId), { wrapper });
    let id: string | undefined;
    await act(async () => {
      id = await result.current.mutateAsync({ type: 'sleep' });
    });
    expect(id).toBe('event-9');
    expect(toasts).toEqual([]);
  });
});
