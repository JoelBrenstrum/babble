import { createBabbleClient } from '@babble/api';
import { sampleBaby } from '@babble/api/fixtures';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useTimelineModel } from './use-timeline';

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
const fetchEvents = vi.fn(async (input: string | URL | Request) => {
  const url = input instanceof Request ? input.url : input.toString();
  return url.includes('/rest/v1/events') ? json([]) : json(null);
});
const eventFetches = () => fetchEvents.mock.calls.filter(([input]) => String(input).includes('/rest/v1/events'));

const client = createBabbleClient(
  { supabaseUrl: 'https://babble.test', supabaseAnonKey: 'anon' },
  { global: { fetch: fetchEvents }, auth: { persistSession: false, autoRefreshToken: false } },
);

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const props = (now: Date, view: '24h' | 'day' = '24h', date?: string) => ({
  client,
  babyId: sampleBaby.id,
  baby: sampleBaby,
  view,
  date,
  now,
  enabled: true,
});

describe('useTimelineModel', () => {
  it('keeps the rolling 24h model on screen when the minute ticks over', async () => {
    const { result, rerender } = renderHook((now: Date) => useTimelineModel(props(now)), {
      wrapper,
      initialProps: new Date('2026-10-12T10:00:30Z'),
    });
    expect(result.current.model).toBeNull();
    await waitFor(() => expect(result.current.model).not.toBeNull());

    fetchEvents.mockImplementationOnce(() => new Promise(() => undefined));
    rerender(new Date('2026-10-12T10:01:30Z'));
    expect(result.current.model?.view).toBe('24h');
  });

  it('shows another day in the same week at once, from the cached chunk', async () => {
    const now = new Date('2026-10-14T10:00:30Z');
    const { result, rerender } = renderHook((date: string) => useTimelineModel(props(now, 'day', date)), {
      wrapper,
      initialProps: '2026-10-14',
    });
    await waitFor(() => expect(result.current.model).not.toBeNull());
    const fetched = eventFetches().length;
    rerender('2026-10-13');
    expect(result.current.model).not.toBeNull();
    expect(eventFetches().length).toBe(fetched);
  });

  it('does not reuse another week while the next one loads', async () => {
    const now = new Date('2026-10-14T10:00:30Z');
    const { result, rerender } = renderHook((date: string) => useTimelineModel(props(now, 'day', date)), {
      wrapper,
      initialProps: '2026-10-14',
    });
    await waitFor(() => expect(result.current.model).not.toBeNull());
    fetchEvents.mockImplementationOnce(() => new Promise(() => undefined));
    rerender('2026-10-07');
    expect(result.current.model).toBeNull();
  });
});
