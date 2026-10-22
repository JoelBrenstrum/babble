// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { sampleBaby } from '../fixtures';
import { fakeClient, type RecordedRequest } from '../test-utils';
import { chunkQuery, useEventsInRange } from './use-events-in-range';

const babyId = sampleBaby.id;
const NOW = new Date('2026-10-19T10:00:00Z');

function row(id: string, startedAt: string, endedAt: string | null) {
  return {
    id,
    baby_id: babyId,
    type: 'breast_feed',
    started_at: startedAt,
    ended_at: endedAt,
    notes: null,
    created_by: 'user-jane',
    created_device: null,
    created_at: startedAt,
    updated_at: startedAt,
    deleted_at: null,
    source: 'manual',
    ended_by: null,
    end_recorded_at: null,
    sleep: null,
    bottle: null,
    solids: null,
    nappy: null,
    pump: null,
    growth: null,
    custom: null,
    session: null,
    segments: [],
  };
}

const feedBefore = row('old', '2026-10-10T08:00:00Z', '2026-10-10T08:20:00Z');
const feedSpanning = row('spanning', '2026-10-11T23:50:00Z', '2026-10-12T00:10:00Z');
const feedNow = row('new', '2026-10-19T08:00:00Z', '2026-10-19T08:20:00Z');

function respond(request: RecordedRequest) {
  const before = request.url.searchParams.get('started_at') ?? '';
  const inChunkTwo = before.includes('2026-10-26');
  return { body: inChunkTwo ? [feedNow, feedSpanning] : [feedBefore, feedSpanning] };
}

function setup() {
  const { client, requests } = fakeClient(respond);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { client, requests, queryClient, wrapper };
}

const base = { timeZone: 'UTC', dayStartMinutes: 0 };

describe('chunkQuery', () => {
  it('keeps settled chunks for good and lets the current one go stale normally', () => {
    const { client } = setup();
    const settled = chunkQuery(client, babyId, { from: '2026-10-05T00:00:00Z', to: '2026-10-12T00:00:00Z' }, NOW);
    const current = chunkQuery(client, babyId, { from: '2026-10-19T00:00:00Z', to: '2026-10-26T00:00:00Z' }, NOW);
    expect(settled.staleTime).toBe(Number.POSITIVE_INFINITY);
    expect(current.staleTime).toBeUndefined();
    expect(settled.queryKey).toEqual(['events', babyId, 'between', '2026-10-05T00:00:00Z', '2026-10-12T00:00:00Z']);
  });
});

describe('useEventsInRange', () => {
  it('fetches one request per chunk, dedupes across chunks and trims to the range', async () => {
    const { client, requests, wrapper } = setup();
    const { result } = renderHook(
      () => useEventsInRange(client, babyId, { ...base, from: '2026-10-11T00:00:00Z', to: '2026-10-19T10:00:00Z' }),
      { wrapper },
    );
    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(requests).toHaveLength(3);
    expect(result.current.data!.map((event) => event.id)).toEqual(['new', 'spanning']);
  });

  it('reuses cached chunks when another range inside them is asked for', async () => {
    const { client, requests, wrapper, queryClient } = setup();
    const first = renderHook(
      () => useEventsInRange(client, babyId, { ...base, from: '2026-10-12T00:00:00Z', to: '2026-10-13T00:00:00Z' }),
      { wrapper },
    );
    await waitFor(() => expect(first.result.current.data).toBeDefined());
    const fetched = requests.length;
    const second = renderHook(
      () => useEventsInRange(client, babyId, { ...base, from: '2026-10-14T00:00:00Z', to: '2026-10-15T00:00:00Z' }),
      { wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children) },
    );
    expect(second.result.current.data).toEqual([]);
    expect(requests).toHaveLength(fetched);
  });

  it('keeps the previous answer on screen while a new chunk loads when asked to', async () => {
    const { client, wrapper } = setup();
    const { result, rerender } = renderHook(
      (range: { from: string; to: string }) =>
        useEventsInRange(client, babyId, { ...base, ...range, keepPrevious: true }),
      { wrapper, initialProps: { from: '2026-10-19T00:00:00Z', to: '2026-10-19T10:00:00Z' } },
    );
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ from: '2026-10-05T00:00:00Z', to: '2026-10-19T10:00:00Z' });
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data!.map((event) => event.id)).toEqual(['new']);
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
    expect(result.current.data!.map((event) => event.id)).toEqual(['new', 'spanning', 'old']);
  });

  it('stays pending without data when disabled', () => {
    const { client, requests, wrapper } = setup();
    const { result } = renderHook(
      () =>
        useEventsInRange(client, babyId, {
          ...base,
          from: '2026-10-12T00:00:00Z',
          to: '2026-10-13T00:00:00Z',
          enabled: false,
        }),
      { wrapper },
    );
    expect(result.current).toEqual({ data: undefined, isPending: true, isPlaceholderData: false });
    expect(requests).toHaveLength(0);
  });
});
