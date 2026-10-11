import { queryOptions, useQuery } from '@tanstack/react-query';

declare const __BABBLE_RELEASE__: string | undefined;

export const RELEASE_ID = typeof __BABBLE_RELEASE__ === 'string' ? __BABBLE_RELEASE__ : 'dev';
export const RELEASE_CHECK_MS = 5 * 60_000;

export function parseReleaseId(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const release = (body as { release?: unknown }).release;
  return typeof release === 'string' && release.length > 0 ? release : null;
}

export function isNewRelease(current: string, latest: string | null): boolean {
  return latest !== null && latest !== current;
}

export async function fetchReleaseId(fetcher: typeof fetch = fetch): Promise<string | null> {
  try {
    const response = await fetcher('/api/version', { cache: 'no-store' });
    return response.ok ? parseReleaseId(await response.json()) : null;
  } catch {
    return null;
  }
}

export const releaseQuery = queryOptions({
  queryKey: ['release'],
  queryFn: () => fetchReleaseId(),
  refetchInterval: RELEASE_CHECK_MS,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: 'always',
  staleTime: RELEASE_CHECK_MS,
  retry: false,
});

export function useNewRelease(): boolean {
  const latest = useQuery(releaseQuery).data ?? null;
  return isNewRelease(RELEASE_ID, latest);
}

export function reloadForRelease(): void {
  window.location.reload();
}
