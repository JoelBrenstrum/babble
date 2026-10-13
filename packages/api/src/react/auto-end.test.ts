import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { sampleBaby, sampleRunningFeed } from '../fixtures';
import { fakeClient } from '../test-utils';
import { autoEndStaleSessions, sessionsToAutoEnd } from './auto-end';

const NOW = new Date('2026-10-06T10:00:00Z');
const stale = () => ({
  ...sampleRunningFeed(NOW),
  startedAt: '2026-10-06T08:00:00Z',
  segments: [{ side: 'left' as const, startedAt: '2026-10-06T08:00:00Z', endedAt: '2026-10-06T08:10:00Z' }],
});

describe('sessionsToAutoEnd', () => {
  it('picks stale sessions that are not already being ended', () => {
    const feed = stale();
    expect(sessionsToAutoEnd([feed], NOW, 30, new Set())).toEqual([feed]);
    expect(sessionsToAutoEnd([feed], NOW, 30, new Set([feed.id]))).toEqual([]);
    expect(sessionsToAutoEnd([sampleRunningFeed(NOW)], NOW, 30, new Set())).toEqual([]);
  });
});

describe('autoEndStaleSessions', () => {
  it('ends stale sessions once while a request is in flight, then refreshes', async () => {
    const feed = stale();
    const { client, requests } = fakeClient(() => ({ status: 204, body: null }));
    const queryClient = new QueryClient();
    const inFlight = new Set<string>();
    const options = {
      client,
      queryClient,
      babyId: sampleBaby.id,
      running: [feed],
      now: NOW,
      autoEndMinutes: 30,
      inFlight,
    };
    await Promise.all([autoEndStaleSessions(options), autoEndStaleSessions(options)]);
    expect(requests.filter((request) => request.url.pathname.endsWith('end_session'))).toHaveLength(1);
    expect(inFlight.size).toBe(0);
  });

  it('refreshes and releases the session even when ending fails', async () => {
    const feed = stale();
    const { client } = fakeClient(() => ({ status: 500, body: { message: 'down' } }));
    const queryClient = new QueryClient();
    const invalidated: unknown[] = [];
    queryClient.invalidateQueries = (async (filters: unknown) => void invalidated.push(filters)) as never;
    const inFlight = new Set<string>();
    await autoEndStaleSessions({
      client,
      queryClient,
      babyId: sampleBaby.id,
      running: [feed],
      now: NOW,
      autoEndMinutes: 30,
      inFlight,
    });
    expect(invalidated).toEqual([{ queryKey: ['events', sampleBaby.id] }]);
    expect(inFlight.size).toBe(0);
  });
});
