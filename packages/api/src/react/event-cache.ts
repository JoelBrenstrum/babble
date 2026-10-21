import { isEventType, isSessionType, type BabyEvent, type EventType } from '@babble/domain';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { BabbleClient } from '../client';
import { getEvent, type EventChange } from '../events';
import { EVENT_LIST_LIMIT, EVENTS_SINCE_LIMIT, queryKeys } from '../queries';

export type EventQueryShape =
  | { kind: 'single'; id: string }
  | { kind: 'running' }
  | { kind: 'latest' }
  | { kind: 'list'; types: EventType[] }
  | { kind: 'since'; since: string }
  | { kind: 'between'; from: string; to: string };

export function eventQueryShape(queryKey: QueryKey, babyId: string): EventQueryShape | null {
  if (queryKey[0] !== 'events' || queryKey[1] !== babyId) return null;
  const [, , kind, ...rest] = queryKey;
  const text = (value: unknown): value is string => typeof value === 'string';
  switch (kind) {
    case 'event':
      return text(rest[0]) ? { kind: 'single', id: rest[0] } : null;
    case 'running':
      return { kind: 'running' };
    case 'latest':
      return { kind: 'latest' };
    case 'list':
      return rest.every((type) => text(type) && isEventType(type))
        ? { kind: 'list', types: rest as EventType[] }
        : null;
    case 'since':
      return text(rest[0]) ? { kind: 'since', since: rest[0] } : null;
    case 'between':
      return text(rest[0]) && text(rest[1]) ? { kind: 'between', from: rest[0], to: rest[1] } : null;
    default:
      return null;
  }
}

export type MergeOutcome = { kind: 'set'; data: BabyEvent | BabyEvent[] } | { kind: 'keep' } | { kind: 'invalidate' };

const ms = (iso: string) => Date.parse(iso);

function belongs(shape: Exclude<EventQueryShape, { kind: 'single' | 'latest' }>, event: BabyEvent): boolean {
  if (event.deletedAt) return false;
  switch (shape.kind) {
    case 'running':
      return event.endedAt === null && isSessionType(event.type);
    case 'list':
      return shape.types.length === 0 || shape.types.includes(event.type);
    case 'since':
      return ms(event.startedAt) >= ms(shape.since);
    case 'between': {
      const started = ms(event.startedAt);
      if (started >= ms(shape.to)) return false;
      if (started >= ms(shape.from)) return true;
      if (event.endedAt === null) return isSessionType(event.type);
      return ms(event.endedAt) >= ms(shape.from);
    }
  }
}

const newestFirst = (a: BabyEvent, b: BabyEvent) =>
  ms(b.startedAt) - ms(a.startedAt) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
const oldestFirst = (a: BabyEvent, b: BabyEvent) => ms(a.startedAt) - ms(b.startedAt);

function withEvent(
  list: readonly BabyEvent[],
  event: BabyEvent,
  include: boolean,
  order: (a: BabyEvent, b: BabyEvent) => number,
  limit?: number,
): MergeOutcome {
  const had = list.some((item) => item.id === event.id);
  if (!had && !include) return { kind: 'keep' };
  const others = list.filter((item) => item.id !== event.id);
  const next = include ? [...others, event].sort(order) : others;
  return { kind: 'set', data: limit !== undefined && list.length >= limit ? next.slice(0, limit) : next };
}

function mergeLatest(list: readonly BabyEvent[], event: BabyEvent): MergeOutcome {
  const index = list.findIndex((item) => item.type === event.type);
  const current = list[index];
  if (event.deletedAt) return current?.id === event.id ? { kind: 'invalidate' } : { kind: 'keep' };
  if (!current) return { kind: 'set', data: [...list, event] };
  if (current.id === event.id && ms(event.startedAt) < ms(current.startedAt)) return { kind: 'invalidate' };
  if (current.id === event.id || ms(event.startedAt) >= ms(current.startedAt)) {
    return { kind: 'set', data: list.map((item, i) => (i === index ? event : item)) };
  }
  return { kind: 'keep' };
}

export function mergeEvent(shape: EventQueryShape, data: unknown, event: BabyEvent): MergeOutcome {
  if (shape.kind === 'single') {
    return shape.id === event.id && data !== undefined ? { kind: 'set', data: event } : { kind: 'keep' };
  }
  if (!Array.isArray(data)) return { kind: 'keep' };
  const list = data as BabyEvent[];
  switch (shape.kind) {
    case 'latest':
      return mergeLatest(list, event);
    case 'running':
      return withEvent(list, event, belongs(shape, event), oldestFirst);
    case 'list':
      return withEvent(list, event, belongs(shape, event), newestFirst, EVENT_LIST_LIMIT);
    case 'since':
      return withEvent(list, event, belongs(shape, event), newestFirst, EVENTS_SINCE_LIMIT);
    case 'between':
      return withEvent(list, event, belongs(shape, event), newestFirst);
  }
}

export function findAnyCachedEvent(queryClient: QueryClient, babyId: string, eventId: string): BabyEvent | undefined {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: queryKeys.events(babyId) })) {
    const data = query.state.data;
    if (Array.isArray(data)) {
      const found = (data as BabyEvent[]).find((item) => item?.id === eventId);
      if (found) return found;
    } else if ((data as BabyEvent | undefined)?.id === eventId) {
      return data as BabyEvent;
    }
  }
  return undefined;
}

export function patchEventQueries(queryClient: QueryClient, babyId: string, event: BabyEvent): void {
  const stale: QueryKey[] = [];
  for (const query of queryClient.getQueryCache().findAll({ queryKey: queryKeys.events(babyId) })) {
    const shape = eventQueryShape(query.queryKey, babyId);
    if (!shape) continue;
    const outcome = mergeEvent(shape, query.state.data, event);
    if (outcome.kind === 'set') queryClient.setQueryData(query.queryKey, outcome.data);
    else if (outcome.kind === 'invalidate') stale.push(query.queryKey);
  }
  for (const queryKey of stale) void queryClient.invalidateQueries({ queryKey, exact: true });
}

export function alreadyCached(cached: BabyEvent | undefined, change: EventChange): boolean {
  return (
    cached !== undefined &&
    change.updatedAt !== null &&
    cached.updatedAt === change.updatedAt &&
    (cached.deletedAt ?? null) === (change.deletedAt ?? null)
  );
}

export async function applyEventChange(
  queryClient: QueryClient,
  client: BabbleClient,
  babyId: string,
  change: EventChange,
): Promise<void> {
  const invalidateAll = () => queryClient.invalidateQueries({ queryKey: queryKeys.events(babyId) });
  if (!change.id) return invalidateAll();
  if (alreadyCached(findAnyCachedEvent(queryClient, babyId, change.id), change)) return;
  let event: BabyEvent;
  try {
    event = await getEvent(client, change.id);
  } catch {
    return invalidateAll();
  }
  if (event.babyId !== babyId) return;
  patchEventQueries(queryClient, babyId, event);
}
