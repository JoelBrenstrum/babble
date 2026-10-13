import { sampleBaby } from '@babble/api/fixtures';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fixtureClient } from '#/fixtures/client';
import { mostlyOverlaps, useTimelineModel } from './use-timeline';

const fetchEvents = vi.fn(async () => []);
vi.mock('@babble/api', async (importOriginal) => {
  const api = await importOriginal<typeof import('@babble/api')>();
  return {
    ...api,
    babySettingsQuery: (_client: unknown, babyId: string) => ({
      queryKey: api.queryKeys.babySettings(babyId),
      queryFn: async () => null,
    }),
    eventsBetweenQuery: (_client: unknown, babyId: string, from: string, to: string) => ({
      queryKey: api.queryKeys.eventsBetween(babyId, from, to),
      queryFn: () => fetchEvents(),
    }),
  };
});

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const props = (now: Date, view: '24h' | 'day' = '24h') => ({
  client: fixtureClient,
  babyId: sampleBaby.id,
  baby: sampleBaby,
  view,
  date: undefined,
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

  it('does not reuse another day while the next one loads', async () => {
    const { result, rerender } = renderHook((now: Date) => useTimelineModel(props(now, 'day')), {
      wrapper,
      initialProps: new Date('2026-10-12T10:00:30Z'),
    });
    await waitFor(() => expect(result.current.model).not.toBeNull());
    fetchEvents.mockImplementationOnce(() => new Promise(() => undefined));
    rerender(new Date('2026-10-14T10:00:30Z'));
    expect(result.current.model).toBeNull();
  });
});

describe('mostlyOverlaps', () => {
  const key = ['events', 'b', 'between', '2026-10-12T00:00:00Z', '2026-10-13T00:00:00Z'];

  it('accepts a window shifted by a minute', () => {
    expect(mostlyOverlaps(key, { from: '2026-10-12T00:01:00Z', to: '2026-10-13T00:01:00Z' })).toBe(true);
  });

  it('rejects the next day', () => {
    expect(mostlyOverlaps(key, { from: '2026-10-13T00:00:00Z', to: '2026-10-14T00:00:00Z' })).toBe(false);
  });

  it('rejects keys without a range', () => {
    expect(
      mostlyOverlaps(['events', 'b', 'running'], { from: '2026-10-12T00:00:00Z', to: '2026-10-13T00:00:00Z' }),
    ).toBe(false);
  });
});
