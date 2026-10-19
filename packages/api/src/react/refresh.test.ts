import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { queryKeys } from '../queries';
import { refreshEvents, refreshFamilies, shouldRefresh } from './refresh';

const babyId = 'baby-1';
const now = Date.parse('2026-10-19T10:00:00Z');
const chunk = (from: string, to: string) => queryKeys.eventsBetween(babyId, from, to);

describe('shouldRefresh', () => {
  const past = chunk('2026-10-05T00:00:00Z', '2026-10-12T00:00:00Z');
  const current = chunk('2026-10-12T00:00:00Z', '2026-10-19T12:00:00Z');

  it('always refreshes lists, running, latest and the current chunk', () => {
    expect(shouldRefresh(queryKeys.runningEvents(babyId), babyId, [], now)).toBe(true);
    expect(shouldRefresh(queryKeys.eventList(babyId, ['nappy']), babyId, [], now)).toBe(true);
    expect(shouldRefresh(queryKeys.latestEvents(babyId), babyId, [], now)).toBe(true);
    expect(shouldRefresh(current, babyId, [], now)).toBe(true);
  });

  it('skips a settled chunk unless the change touched a moment near it', () => {
    expect(shouldRefresh(past, babyId, [Date.parse('2026-10-18T09:00:00Z')], now)).toBe(false);
    expect(shouldRefresh(past, babyId, [Date.parse('2026-10-08T09:00:00Z')], now)).toBe(true);
    expect(shouldRefresh(past, babyId, [Date.parse('2026-10-12T20:00:00Z')], now)).toBe(true);
    expect(shouldRefresh(past, babyId, [Date.parse('2026-10-04T03:00:00Z')], now)).toBe(true);
    expect(shouldRefresh(past, babyId, [], now)).toBe(false);
  });
});

describe('refresh', () => {
  it('invalidates every event query when nothing is known about the change', async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    await refreshEvents(queryClient, babyId);
    expect(spy).toHaveBeenCalledWith({ queryKey: ['events', babyId] });
  });

  it('leaves untouched settled chunks alone when the change is known', async () => {
    const queryClient = new QueryClient();
    const past = chunk('2020-01-06T00:00:00Z', '2020-01-13T00:00:00Z');
    const list = queryKeys.eventList(babyId, ['nappy']);
    queryClient.setQueryData(past, []);
    queryClient.setQueryData(list, []);
    await refreshEvents(queryClient, babyId, ['2026-10-19T09:00:00Z', null]);
    expect(queryClient.getQueryState(past)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(list)?.isInvalidated).toBe(true);
  });

  it('refetches families even when no screen is showing them', async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    await refreshFamilies(queryClient);
    expect(spy).toHaveBeenCalledWith({ queryKey: ['families'], refetchType: 'all' });
  });
});
