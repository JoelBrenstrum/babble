import type { BabyEvent } from '@babble/domain';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { eventChangeFrom } from '../events';
import { sampleBaby, sampleEvents, sampleRunningFeed, sampleRunningSleep } from '../fixtures';
import { EVENT_LIST_LIMIT, queryKeys } from '../queries';
import { fakeClient } from '../test-utils';
import {
  alreadyCached,
  applyEventChange,
  eventQueryShape,
  findAnyCachedEvent,
  mergeEvent,
  patchEventQueries,
} from './event-cache';

const NOW = new Date('2026-10-06T10:00:00Z');
const babyId = sampleBaby.id;
const events = sampleEvents(NOW);
const at = (minutesAgo: number) => new Date(NOW.getTime() - minutesAgo * 60_000).toISOString();

function nappy(id: string, minutesAgo: number, extra: Partial<BabyEvent> = {}): BabyEvent {
  const base = events.find((event) => event.type === 'nappy')!;
  return { ...base, id, startedAt: at(minutesAgo), endedAt: at(minutesAgo), ...extra } as BabyEvent;
}

describe('eventQueryShape', () => {
  it('recognises every event query for the baby and nothing else', () => {
    expect(eventQueryShape(queryKeys.event(babyId, 'e1'), babyId)).toEqual({ kind: 'single', id: 'e1' });
    expect(eventQueryShape(queryKeys.runningEvents(babyId), babyId)).toEqual({ kind: 'running' });
    expect(eventQueryShape(queryKeys.latestEvents(babyId), babyId)).toEqual({ kind: 'latest' });
    expect(eventQueryShape(queryKeys.eventList(babyId, ['nappy', 'sleep']), babyId)).toEqual({
      kind: 'list',
      types: ['nappy', 'sleep'],
    });
    expect(eventQueryShape(queryKeys.eventsSince(babyId, at(60)), babyId)).toEqual({ kind: 'since', since: at(60) });
    expect(eventQueryShape(queryKeys.eventsBetween(babyId, at(120), at(0)), babyId)).toEqual({
      kind: 'between',
      from: at(120),
      to: at(0),
    });
    expect(eventQueryShape(queryKeys.events(babyId), babyId)).toBeNull();
    expect(eventQueryShape(queryKeys.runningEvents('other'), babyId)).toBeNull();
    expect(eventQueryShape(['families'], babyId)).toBeNull();
  });
});

describe('mergeEvent', () => {
  it('replaces a single cached event with the same id', () => {
    const event = nappy('n1', 5);
    expect(mergeEvent({ kind: 'single', id: 'n1' }, nappy('n1', 9), event)).toEqual({ kind: 'set', data: event });
    expect(mergeEvent({ kind: 'single', id: 'n2' }, nappy('n2', 9), event)).toEqual({ kind: 'keep' });
    expect(mergeEvent({ kind: 'single', id: 'n1' }, undefined, event)).toEqual({ kind: 'keep' });
  });

  it('keeps the running list in start order and drops sessions that end', () => {
    const feed = sampleRunningFeed(NOW);
    const sleep = sampleRunningSleep(NOW);
    const paused = { ...feed, sessionState: 'paused' as const };
    expect(mergeEvent({ kind: 'running' }, [sleep, feed], paused)).toEqual({ kind: 'set', data: [sleep, paused] });
    expect(mergeEvent({ kind: 'running' }, [sleep, feed], { ...feed, endedAt: at(0) })).toEqual({
      kind: 'set',
      data: [sleep],
    });
    expect(mergeEvent({ kind: 'running' }, [sleep], feed)).toEqual({ kind: 'set', data: [sleep, feed] });
    expect(mergeEvent({ kind: 'running' }, [sleep], nappy('n1', 1))).toEqual({ kind: 'keep' });
  });

  it('inserts into a typed list newest first, ignores other types and removes deletions', () => {
    const shape = { kind: 'list' as const, types: ['nappy' as const] };
    const older = nappy('n-old', 60);
    const newer = nappy('n-new', 10);
    expect(mergeEvent(shape, [older], newer)).toEqual({ kind: 'set', data: [newer, older] });
    expect(mergeEvent(shape, [older], sampleRunningFeed(NOW))).toEqual({ kind: 'keep' });
    expect(mergeEvent(shape, [newer, older], { ...older, deletedAt: at(0) })).toEqual({ kind: 'set', data: [newer] });
    expect(mergeEvent({ kind: 'list', types: [] }, [older], sampleRunningFeed(NOW)).kind).toBe('set');
  });

  it('keeps a full list at its limit when inserting', () => {
    const full = Array.from({ length: EVENT_LIST_LIMIT }, (_, i) => nappy(`n${i}`, 100 + i));
    const outcome = mergeEvent({ kind: 'list', types: ['nappy'] }, full, nappy('fresh', 1));
    expect(outcome.kind).toBe('set');
    const data = (outcome as { data: BabyEvent[] }).data;
    expect(data).toHaveLength(EVENT_LIST_LIMIT);
    expect(data[0]!.id).toBe('fresh');
    expect(data.some((event) => event.id === `n${EVENT_LIST_LIMIT - 1}`)).toBe(false);
  });

  it('only admits events inside a since range or overlapping a between range', () => {
    const since = { kind: 'since' as const, since: at(60) };
    expect(mergeEvent(since, [], nappy('in', 30)).kind).toBe('set');
    expect(mergeEvent(since, [], nappy('out', 90)).kind).toBe('keep');

    const between = { kind: 'between' as const, from: at(120), to: at(30) };
    expect(mergeEvent(between, [], nappy('inside', 60)).kind).toBe('set');
    expect(mergeEvent(between, [], nappy('too-new', 10)).kind).toBe('keep');
    expect(mergeEvent(between, [], nappy('too-old', 200)).kind).toBe('keep');
    const longNap = { ...sampleRunningSleep(NOW), startedAt: at(200), endedAt: at(100) };
    expect(mergeEvent(between, [], longNap).kind).toBe('set');
    expect(mergeEvent(between, [], { ...sampleRunningSleep(NOW), startedAt: at(200) }).kind).toBe('set');
  });

  it('updates the latest entry per type and refetches when it cannot tell', () => {
    const latestNappy = nappy('n1', 30);
    const feed = sampleRunningFeed(NOW);
    const newer = nappy('n2', 5);
    expect(mergeEvent({ kind: 'latest' }, [latestNappy, feed], newer)).toEqual({ kind: 'set', data: [newer, feed] });
    expect(mergeEvent({ kind: 'latest' }, [latestNappy, feed], nappy('n0', 90))).toEqual({ kind: 'keep' });
    expect(mergeEvent({ kind: 'latest' }, [feed], newer)).toEqual({ kind: 'set', data: [feed, newer] });
    expect(mergeEvent({ kind: 'latest' }, [latestNappy], { ...latestNappy, deletedAt: at(0) })).toEqual({
      kind: 'invalidate',
    });
    expect(mergeEvent({ kind: 'latest' }, [latestNappy], { ...newer, deletedAt: at(0) })).toEqual({ kind: 'keep' });
    expect(mergeEvent({ kind: 'latest' }, [latestNappy], { ...latestNappy, startedAt: at(500) })).toEqual({
      kind: 'invalidate',
    });
  });
});

describe('patchEventQueries', () => {
  it('updates every cached event query the event belongs to', () => {
    const queryClient = new QueryClient();
    const older = nappy('n-old', 60);
    queryClient.setQueryData(queryKeys.eventList(babyId, ['nappy']), [older]);
    queryClient.setQueryData(queryKeys.eventList(babyId, ['sleep']), []);
    queryClient.setQueryData(queryKeys.latestEvents(babyId), [older]);
    queryClient.setQueryData(queryKeys.event(babyId, 'n-old'), older);
    const edited = { ...older, notes: 'changed' };
    patchEventQueries(queryClient, babyId, edited);
    expect(queryClient.getQueryData(queryKeys.eventList(babyId, ['nappy']))).toEqual([edited]);
    expect(queryClient.getQueryData(queryKeys.eventList(babyId, ['sleep']))).toEqual([]);
    expect(queryClient.getQueryData(queryKeys.latestEvents(babyId))).toEqual([edited]);
    expect(queryClient.getQueryData(queryKeys.event(babyId, 'n-old'))).toEqual(edited);
    expect(findAnyCachedEvent(queryClient, babyId, 'n-old')).toEqual(edited);
  });
});

describe('alreadyCached', () => {
  it('matches on updated_at and deleted_at', () => {
    const event = nappy('n1', 5);
    const change = { id: 'n1', updatedAt: event.updatedAt, deletedAt: null };
    expect(alreadyCached(event, change)).toBe(true);
    expect(alreadyCached(event, { ...change, updatedAt: '2026-10-06T01:00:00Z' })).toBe(false);
    expect(alreadyCached(event, { ...change, deletedAt: '2026-10-06T01:00:00Z' })).toBe(false);
    expect(alreadyCached(undefined, change)).toBe(false);
    expect(alreadyCached(event, { ...change, updatedAt: null })).toBe(false);
  });
});

describe('eventChangeFrom', () => {
  it('reads the row from new, then old, and tolerates empty payloads', () => {
    const row = { id: 'e1', updated_at: 'u', deleted_at: null };
    expect(eventChangeFrom({ new: row, old: {} })).toEqual({ id: 'e1', updatedAt: 'u', deletedAt: null });
    expect(eventChangeFrom({ new: {}, old: { id: 'e2' } })).toEqual({ id: 'e2', updatedAt: null, deletedAt: null });
    expect(eventChangeFrom({})).toEqual({ id: null, updatedAt: null, deletedAt: null });
  });
});

describe('applyEventChange', () => {
  const row = {
    id: 'feed-9',
    baby_id: babyId,
    type: 'breast_feed',
    started_at: at(20),
    ended_at: at(5),
    notes: null,
    created_by: 'user-jane',
    created_device: null,
    created_at: at(20),
    updated_at: at(5),
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

  function setup(status = 200) {
    const { client, requests } = fakeClient(() => ({ status, body: status === 200 ? row : { message: 'nope' } }));
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.eventList(babyId, ['breast_feed']), [] as BabyEvent[]);
    queryClient.setQueryData(queryKeys.runningEvents(babyId), [] as BabyEvent[]);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    return { client, requests, queryClient, invalidate };
  }

  it('fetches the one event and patches the lists without invalidating', async () => {
    const { client, requests, queryClient, invalidate } = setup();
    await applyEventChange(queryClient, client, babyId, { id: 'feed-9', updatedAt: at(5), deletedAt: null });
    expect(requests).toHaveLength(1);
    expect(requests[0]!.url.pathname).toBe('/rest/v1/events');
    const list = queryClient.getQueryData<BabyEvent[]>(queryKeys.eventList(babyId, ['breast_feed']))!;
    expect(list.map((event) => event.id)).toEqual(['feed-9']);
    expect(queryClient.getQueryData(queryKeys.runningEvents(babyId))).toEqual([]);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('does nothing when the cache already holds that version', async () => {
    const { client, requests, queryClient, invalidate } = setup();
    const cached = { ...sampleRunningFeed(NOW), id: 'feed-9', updatedAt: at(5) };
    queryClient.setQueryData(queryKeys.runningEvents(babyId), [cached]);
    await applyEventChange(queryClient, client, babyId, { id: 'feed-9', updatedAt: at(5), deletedAt: null });
    expect(requests).toHaveLength(0);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('falls back to invalidating everything without an id or when the fetch fails', async () => {
    const missing = setup();
    await applyEventChange(missing.queryClient, missing.client, babyId, { id: null, updatedAt: null, deletedAt: null });
    expect(missing.invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.events(babyId) });

    const failing = setup(500);
    await applyEventChange(failing.queryClient, failing.client, babyId, {
      id: 'feed-9',
      updatedAt: 'x',
      deletedAt: null,
    });
    expect(failing.invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.events(babyId) });
  });
});
