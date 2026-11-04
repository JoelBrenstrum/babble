import type { QueryClient } from '@tanstack/react-query';
import { useEffect, useState, useSyncExternalStore } from 'react';

export const RESUME_REFRESH_AFTER_MS = 60_000;
export const RESUME_STALL_MS = 15_000;

export function shouldRefreshOnResume(hiddenAt: number | null, now: number, threshold = RESUME_REFRESH_AFTER_MS) {
  return hiddenAt !== null && now - hiddenAt >= threshold;
}

export function watchResume(onResume: () => void, threshold = RESUME_REFRESH_AFTER_MS): () => void {
  let hiddenAt: number | null = document.visibilityState === 'hidden' ? Date.now() : null;
  const onChange = () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt ??= Date.now();
      return;
    }
    const resumed = shouldRefreshOnResume(hiddenAt, Date.now(), threshold);
    hiddenAt = null;
    if (resumed) onResume();
  };
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

// iOS can freeze a backgrounded PWA mid-request; refetching cancels whatever was in flight so nothing waits on it.
export async function refreshAfterResume(
  queryClient: QueryClient,
  stallMs = RESUME_STALL_MS,
): Promise<'fresh' | 'stalled'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stalled = new Promise<'stalled'>((resolve) => (timer = setTimeout(() => resolve('stalled'), stallMs)));
  const refreshed = queryClient
    .cancelQueries()
    .then(() => queryClient.invalidateQueries(undefined, { throwOnError: false }))
    .then(() => 'fresh' as const);
  try {
    return await Promise.race([refreshed, stalled]);
  } finally {
    clearTimeout(timer);
  }
}

let resumeCount = 0;
const resumeListeners = new Set<() => void>();

function noteResume() {
  resumeCount += 1;
  for (const listener of resumeListeners) listener();
}

export function useResumeCount(): number {
  return useSyncExternalStore(
    (listener) => {
      resumeListeners.add(listener);
      return () => resumeListeners.delete(listener);
    },
    () => resumeCount,
    () => 0,
  );
}

export function useResumeRefresh(queryClient: QueryClient, onResume: () => void) {
  const [stalled, setStalled] = useState(false);
  useEffect(
    () =>
      watchResume(() => {
        noteResume();
        onResume();
        void refreshAfterResume(queryClient).then((outcome) => setStalled(outcome === 'stalled'));
      }),
    [queryClient, onResume],
  );
  return { stalled, dismiss: () => setStalled(false) };
}
