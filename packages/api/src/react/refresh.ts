import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { clock } from '../clock';
import { LONGEST_SESSION_MS } from '../events';
import { queryKeys } from '../queries';
import { eventQueryShape } from './event-cache';

export type TouchedInstants = readonly (string | null | undefined)[];

// A settled range chunk only needs refetching when the change touched a moment near it; the current
// chunk and every other event query always refetch.
export function shouldRefresh(queryKey: QueryKey, babyId: string, touched: number[], now: number): boolean {
  const shape = eventQueryShape(queryKey, babyId);
  if (!shape || shape.kind !== 'between') return true;
  const from = Date.parse(shape.from);
  const to = Date.parse(shape.to);
  if (to > now) return true;
  return touched.some((instant) => instant + LONGEST_SESSION_MS >= from && instant - LONGEST_SESSION_MS < to);
}

export function refreshEvents(queryClient: QueryClient, babyId: string, touched?: TouchedInstants): Promise<void> {
  if (!touched) return queryClient.invalidateQueries({ queryKey: queryKeys.events(babyId) });
  const instants = touched.flatMap((value) => (typeof value === 'string' ? [Date.parse(value)] : []));
  const now = clock.now().getTime();
  return queryClient.invalidateQueries({
    queryKey: queryKeys.events(babyId),
    predicate: (query) => shouldRefresh(query.queryKey, babyId, instants, now),
  });
}

export function refreshFamilies(queryClient: QueryClient): Promise<void> {
  // Route guards read families with ensureQueryData, which returns stale cache unless it was refetched.
  return queryClient.invalidateQueries({ queryKey: queryKeys.families, refetchType: 'all' });
}
