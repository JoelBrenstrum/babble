import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queries';

export function refreshEvents(queryClient: QueryClient, babyId: string): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.events(babyId) });
}

export function refreshFamilies(queryClient: QueryClient): Promise<void> {
  // Route guards read families with ensureQueryData, which returns stale cache unless it was refetched.
  return queryClient.invalidateQueries({ queryKey: queryKeys.families, refetchType: 'all' });
}
