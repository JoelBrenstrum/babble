import { QueryClient } from '@tanstack/react-query';
import type { BabyEvent } from '@babble/domain';
import { describe, expect, it } from 'vitest';
import { sampleBaby, sampleEvents, sampleRunningFeed, sampleRunningSleep } from '../fixtures';
import { queryKeys } from '../queries';
import {
  applyRunningUpdate,
  findCachedEvent,
  mergePumpAmounts,
  mergeSleepDetails,
  optimisticRunning,
  patchEventCaches,
  replaceInRunning,
  restoreEventCaches,
  snapshotEventCaches,
} from './optimistic';

const NOW = new Date('2026-10-06T10:00:00Z');
const babyId = sampleBaby.id;

describe('applyRunningUpdate', () => {
  const feed = sampleRunningFeed(NOW);
  const sleep = sampleRunningSleep(NOW);

  it('replaces the updated session and leaves others alone', () => {
    const next = applyRunningUpdate([feed, sleep], feed, { kind: 'pause' }, NOW);
    expect(next).toHaveLength(2);
    expect(next[1]).toBe(sleep);
    expect(next[0]).toMatchObject({ id: feed.id, sessionState: 'paused' });
  });

  it('drops a session that ends', () => {
    expect(applyRunningUpdate([feed, sleep], sleep, { kind: 'end' }, NOW)).toEqual([feed]);
  });

  it('keeps the list when the event is not running', () => {
    expect(applyRunningUpdate([feed], sleep, { kind: 'pause' }, NOW)).toEqual([feed]);
  });
});

describe('replaceInRunning', () => {
  it('drops deleted events', () => {
    const feed = sampleRunningFeed(NOW);
    expect(replaceInRunning([feed], { ...feed, deletedAt: NOW.toISOString() })).toEqual([]);
  });
});

describe('mergeSleepDetails', () => {
  const sleep = sampleRunningSleep(NOW);

  it('merges details and notes', () => {
    const merged = mergeSleepDetails(sleep, { locations: ['cot'], notes: 'Settled fast' });
    expect(merged).toMatchObject({ details: { locations: ['cot'], wokenByCarer: false }, notes: 'Settled fast' });
  });

  it('clears notes only when asked', () => {
    expect(mergeSleepDetails({ ...sleep, notes: 'a' }, { wokenByCarer: true }).notes).toBe('a');
    expect(mergeSleepDetails({ ...sleep, notes: 'a' }, { notes: null }).notes).toBeNull();
  });

  it('ignores non-sleep events', () => {
    const feed = sampleRunningFeed(NOW);
    expect(mergeSleepDetails(feed, { notes: 'x' })).toBe(feed);
  });
});

describe('mergePumpAmounts', () => {
  const pump = sampleEvents(NOW).find((event) => event.type === 'pump')!;

  it('sets one side, keeps the other and drops a recorded total', () => {
    const recorded = { ...pump, details: { leftMl: 30, rightMl: null, totalMl: 90 } } as BabyEvent;
    expect(mergePumpAmounts(recorded, { rightMl: 45 })).toMatchObject({
      details: { leftMl: 30, rightMl: 45, totalMl: null },
    });
  });

  it('ignores non-pump events', () => {
    const feed = sampleRunningFeed(NOW);
    expect(mergePumpAmounts(feed, { leftMl: 10 })).toBe(feed);
  });
});

describe('event caches', () => {
  function seeded() {
    const queryClient = new QueryClient();
    const sleep = sampleRunningSleep(NOW);
    queryClient.setQueryData<BabyEvent[]>(queryKeys.runningEvents(babyId), [sleep]);
    queryClient.setQueryData(queryKeys.event(babyId, sleep.id), sleep);
    return { queryClient, sleep };
  }

  it('patches the running list and the single-event cache together', () => {
    const { queryClient, sleep } = seeded();
    patchEventCaches(queryClient, babyId, { ...sleep, notes: 'hi' });
    expect(queryClient.getQueryData<BabyEvent[]>(queryKeys.runningEvents(babyId))![0]!.notes).toBe('hi');
    expect(queryClient.getQueryData<BabyEvent>(queryKeys.event(babyId, sleep.id))!.notes).toBe('hi');
  });

  it('does not create a single-event cache entry that was never loaded', () => {
    const { queryClient, sleep } = seeded();
    queryClient.removeQueries({ queryKey: queryKeys.event(babyId, sleep.id) });
    patchEventCaches(queryClient, babyId, { ...sleep, notes: 'hi' });
    expect(queryClient.getQueryData(queryKeys.event(babyId, sleep.id))).toBeUndefined();
  });

  it('restores both caches from a snapshot', () => {
    const { queryClient, sleep } = seeded();
    const snapshot = snapshotEventCaches(queryClient, babyId, sleep.id);
    patchEventCaches(queryClient, babyId, { ...sleep, deletedAt: NOW.toISOString() });
    expect(queryClient.getQueryData<BabyEvent[]>(queryKeys.runningEvents(babyId))).toEqual([]);
    restoreEventCaches(queryClient, babyId, sleep.id, snapshot);
    expect(queryClient.getQueryData(queryKeys.runningEvents(babyId))).toEqual([sleep]);
    expect(queryClient.getQueryData(queryKeys.event(babyId, sleep.id))).toEqual(sleep);
  });

  it('finds an event in either cache', () => {
    const { queryClient, sleep } = seeded();
    expect(findCachedEvent(queryClient, babyId, sleep.id)).toEqual(sleep);
    queryClient.setQueryData(queryKeys.runningEvents(babyId), []);
    expect(findCachedEvent(queryClient, babyId, sleep.id)).toEqual(sleep);
    expect(findCachedEvent(queryClient, babyId, 'nope')).toBeUndefined();
  });

  it('applies an optimistic change and returns the snapshot to roll back to', async () => {
    const { queryClient, sleep } = seeded();
    const snapshot = await optimisticRunning(queryClient, babyId, sleep.id, (current) => ({ ...current, notes: 'n' }));
    expect(queryClient.getQueryData<BabyEvent>(queryKeys.event(babyId, sleep.id))!.notes).toBe('n');
    expect(snapshot.running).toEqual([sleep]);
    expect(snapshot.single).toEqual(sleep);
  });

  it('uses the fallback when nothing is cached', async () => {
    const queryClient = new QueryClient();
    const sleep = sampleRunningSleep(NOW);
    queryClient.setQueryData<BabyEvent[]>(queryKeys.runningEvents(babyId), [sleep]);
    await optimisticRunning(queryClient, babyId, 'other', (current) => current, sleep);
    expect(queryClient.getQueryData(queryKeys.runningEvents(babyId))).toEqual([sleep]);
  });
});
