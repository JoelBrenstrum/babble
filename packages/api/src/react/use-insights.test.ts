// @vitest-environment jsdom
import { DEFAULT_NIGHT_START_MINUTES, insightsSince, predictAhead } from '@babble/domain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { sampleBaby, sampleEvents, sampleFamily } from '../fixtures';
import { fakeClient } from '../test-utils';
import type { BabySettings } from '../types';
import { useInsights, usePrediction } from './use-insights';

const NOW = new Date('2026-10-13T02:00:00Z');
const settingsRow = { baby_id: sampleBaby.id, night_start_minutes: 1200, night_end_minutes: 400 } as BabySettings;
const { fetchSettings, fetchBetween, fetchSince } = vi.hoisted(() => ({
  fetchSettings: vi.fn(async () => settingsRow),
  fetchBetween: vi.fn(async (_from: string, _to: string) => sampleEvents(NOW)),
  fetchSince: vi.fn(async () => sampleEvents(NOW)),
}));
vi.mock('../families', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../families')>()),
  getBabySettings: () => fetchSettings(),
}));
vi.mock('../events', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../events')>()),
  listEventsBetween: (_client: unknown, _babyId: string, from: string, to: string) => fetchBetween(from, to),
  listEvents: () => fetchSince(),
}));

function setup() {
  const { client } = fakeClient(() => ({ body: null }));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { client, wrapper };
}

const plus = { ...sampleFamily, plan: 'plus' };

describe('useInsights', () => {
  it('is locked on the free plan when billing is on and fetches nothing', () => {
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useInsights(client, true, sampleBaby, sampleFamily, NOW), { wrapper });
    expect(result.current).toEqual({ locked: true });
    expect(fetchBetween).not.toHaveBeenCalled();
  });

  it('asks for events from the default night start before settings load, then reports', async () => {
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useInsights(client, true, sampleBaby, plus, NOW), { wrapper });
    expect(result.current).toEqual({ locked: false, report: null });
    await waitFor(() => expect(result.current).toMatchObject({ locked: false, report: expect.anything() }));
    const scope = { timeZone: sampleBaby.timezone, dayStartMinutes: sampleBaby.day_start_minutes };
    const [firstFrom] = fetchBetween.mock.calls[0]!;
    expect(firstFrom).toBe(
      insightsSince('2026-10-13', { ...scope, nightStartMinutes: DEFAULT_NIGHT_START_MINUTES, nightEndMinutes: 420 }),
    );
  });
});

describe('usePrediction', () => {
  it('is null without the predictions feature', () => {
    const { client, wrapper } = setup();
    const { result } = renderHook(() => usePrediction(client, true, sampleBaby, sampleFamily, NOW), { wrapper });
    expect(result.current).toBeNull();
  });

  it('predicts from recent events once they load', async () => {
    const { client, wrapper } = setup();
    fetchSince.mockClear();
    const { result } = renderHook(() => usePrediction(client, false, sampleBaby, sampleFamily, NOW), { wrapper });
    await waitFor(() => expect(fetchSince).toHaveBeenCalledTimes(1));
    const expected = predictAhead(sampleEvents(NOW), NOW, {
      timeZone: sampleBaby.timezone,
      birthDate: sampleBaby.birth_date,
    });
    await waitFor(() => expect(result.current).toEqual(expected));
  });
});
