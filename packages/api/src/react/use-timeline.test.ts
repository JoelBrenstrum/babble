// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { sampleBaby } from '../fixtures';
import { queryKeys } from '../queries';
import { fakeClient } from '../test-utils';
import {
  mostlyOverlaps,
  useDayRhythm,
  useRollingComparison,
  useTimelineModel,
  type TimelinePlaceholder,
} from './use-timeline';

const { fetchEvents, fetchSettings } = vi.hoisted(() => ({
  fetchEvents: vi.fn(async () => []),
  fetchSettings: vi.fn(async (): Promise<object | null> => null),
}));
vi.mock('../families', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../families')>()),
  getBabySettings: () => fetchSettings(),
}));
vi.mock('../events', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../events')>()),
  listEventsBetween: () => fetchEvents(),
}));

function setup() {
  const { client } = fakeClient(() => ({ body: null }));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { client, wrapper };
}

const hang = () => fetchEvents.mockImplementationOnce(() => new Promise(() => undefined));

describe('useTimelineModel', () => {
  const props = (
    client: ReturnType<typeof setup>['client'],
    view: 'day' | '24h',
    placeholder?: TimelinePlaceholder,
  ) => ({
    client,
    babyId: sampleBaby.id,
    baby: sampleBaby,
    view,
    date: undefined,
    enabled: true,
    placeholder,
  });

  it('keeps the rolling 24h model on screen when the minute ticks over', async () => {
    const { client, wrapper } = setup();
    const { result, rerender } = renderHook((now: Date) => useTimelineModel({ ...props(client, '24h'), now }), {
      wrapper,
      initialProps: new Date('2026-10-12T10:00:30Z'),
    });
    expect(result.current.model).toBeNull();
    expect(result.current.pending).toBe(true);
    await waitFor(() => expect(result.current.model).not.toBeNull());
    hang();
    rerender(new Date('2026-10-12T10:01:30Z'));
    expect(result.current.model?.view).toBe('24h');
    expect(result.current.pending).toBe(false);
  });

  it('does not reuse another day while the next one loads', async () => {
    const { client, wrapper } = setup();
    const { result, rerender } = renderHook((now: Date) => useTimelineModel({ ...props(client, 'day'), now }), {
      wrapper,
      initialProps: new Date('2026-10-12T10:00:30Z'),
    });
    await waitFor(() => expect(result.current.model).not.toBeNull());
    hang();
    rerender(new Date('2026-10-14T10:00:30Z'));
    expect(result.current.model).toBeNull();
    expect(result.current.pending).toBe(true);
  });

  it("reuses whatever loaded last with the 'previous' placeholder, and nothing with 'none'", async () => {
    const { client, wrapper } = setup();
    const previous = renderHook((now: Date) => useTimelineModel({ ...props(client, 'day', 'previous'), now }), {
      wrapper,
      initialProps: new Date('2026-10-12T10:00:30Z'),
    });
    await waitFor(() => expect(previous.result.current.model).not.toBeNull());
    hang();
    previous.rerender(new Date('2026-10-14T10:00:30Z'));
    expect(previous.result.current.model?.view).toBe('day');

    const none = renderHook((now: Date) => useTimelineModel({ ...props(client, '24h', 'none'), now }), {
      wrapper,
      initialProps: new Date('2026-10-12T10:00:30Z'),
    });
    await waitFor(() => expect(none.result.current.model).not.toBeNull());
    hang();
    none.rerender(new Date('2026-10-12T10:01:30Z'));
    expect(none.result.current.model).toBeNull();
  });
});

describe('useRollingComparison', () => {
  it('fetches nothing without a window and never builds a query for a made-up range', () => {
    const { client, wrapper } = setup();
    fetchEvents.mockClear();
    const { result } = renderHook(
      () =>
        useRollingComparison({
          client,
          babyId: sampleBaby.id,
          baby: sampleBaby,
          window: null,
          current: null,
          enabled: true,
        }),
      { wrapper },
    );
    expect(result.current).toBeNull();
    expect(fetchEvents).not.toHaveBeenCalled();
  });
});

describe('useDayRhythm', () => {
  const props = (client: ReturnType<typeof setup>['client'], enabled: boolean) => ({
    client,
    babyId: sampleBaby.id,
    baby: sampleBaby,
    dayKey: '2026-10-12',
    now: new Date('2026-10-12T10:00:00Z'),
    enabled,
  });

  it('fetches nothing while locked', () => {
    const { client, wrapper } = setup();
    fetchEvents.mockClear();
    const { result } = renderHook(() => useDayRhythm(props(client, false)), { wrapper });
    expect(result.current).toBeNull();
    expect(fetchEvents).not.toHaveBeenCalled();
  });

  it('waits for the night settings, then works out the day', async () => {
    const { client, wrapper } = setup();
    fetchEvents.mockClear();
    fetchSettings.mockResolvedValueOnce({ night_start_minutes: 19 * 60, night_end_minutes: 7 * 60 });
    const { result } = renderHook(() => useDayRhythm(props(client, true)), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(fetchEvents).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({ feedSpacing: null, wakeWindows: null, night: null, nightFeedGapMs: null });
  });
});

describe('mostlyOverlaps', () => {
  const previous = { from: '2026-10-12T00:00:00Z', to: '2026-10-13T00:00:00Z' };

  it('accepts a window shifted by a minute', () => {
    expect(mostlyOverlaps(previous, { from: '2026-10-12T00:01:00Z', to: '2026-10-13T00:01:00Z' })).toBe(true);
  });

  it('rejects the next day', () => {
    expect(mostlyOverlaps(previous, { from: '2026-10-13T00:00:00Z', to: '2026-10-14T00:00:00Z' })).toBe(false);
  });

  it('rejects a query without a range', () => {
    expect(mostlyOverlaps(null, previous)).toBe(false);
  });
});

describe('queryKeys.eventsBetweenRange', () => {
  it('reads the range back from an events-between key only', () => {
    expect(queryKeys.eventsBetweenRange(queryKeys.eventsBetween('b', 'a', 'z'))).toEqual({ from: 'a', to: 'z' });
    expect(queryKeys.eventsBetweenRange(queryKeys.eventsBetweenAny('b'))).toBeNull();
    expect(queryKeys.eventsBetweenRange(queryKeys.runningEvents('b'))).toBeNull();
  });
});
