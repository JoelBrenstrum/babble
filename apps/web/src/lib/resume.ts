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
  { onStall = () => undefined, stallMs = RESUME_STALL_MS }: { onStall?: () => void; stallMs?: number } = {},
): Promise<'fresh' | 'failed'> {
  const startedAt = Date.now();
  const timer = setTimeout(onStall, stallMs);
  try {
    await queryClient.cancelQueries();
    await queryClient.invalidateQueries(undefined, { throwOnError: false });
  } finally {
    clearTimeout(timer);
  }
  const failed = queryClient
    .getQueryCache()
    .findAll({ type: 'active' })
    .some((query) => query.state.errorUpdatedAt >= startedAt);
  return failed ? 'failed' : 'fresh';
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
        // Offline failures recover on reconnect, and reloading offline would leave a blank page.
        void refreshAfterResume(queryClient, { onStall: () => setStalled(true) }).then((outcome) =>
          setStalled(outcome === 'failed' && navigator.onLine),
        );
      }),
    [queryClient, onResume],
  );
  return { stalled, dismiss: () => setStalled(false) };
}
