import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  RESUME_REFRESH_AFTER_MS,
  RESUME_STALL_MS,
  refreshAfterResume,
  shouldRefreshOnResume,
  useResumeRefresh,
  watchResume,
} from './resume';

describe('shouldRefreshOnResume', () => {
  it('refreshes once the app has been hidden long enough', () => {
    expect(shouldRefreshOnResume(0, RESUME_REFRESH_AFTER_MS)).toBe(true);
    expect(shouldRefreshOnResume(0, RESUME_REFRESH_AFTER_MS - 1)).toBe(false);
    expect(shouldRefreshOnResume(null, RESUME_REFRESH_AFTER_MS)).toBe(false);
  });
});

describe('watchResume', () => {
  let visibility: DocumentVisibilityState = 'visible';

  function setVisibility(value: DocumentVisibilityState) {
    visibility = value;
    document.dispatchEvent(new Event('visibilitychange'));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', { get: () => visibility, configurable: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    visibility = 'visible';
  });

  it('fires after a long time hidden and then starts counting afresh', () => {
    const onResume = vi.fn();
    const stop = watchResume(onResume, 1000);
    setVisibility('hidden');
    vi.advanceTimersByTime(500);
    setVisibility('visible');
    expect(onResume).not.toHaveBeenCalled();
    setVisibility('hidden');
    vi.advanceTimersByTime(1000);
    setVisibility('visible');
    expect(onResume).toHaveBeenCalledTimes(1);
    stop();
    setVisibility('hidden');
    vi.advanceTimersByTime(1000);
    setVisibility('visible');
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('counts from mount when the page is already hidden', () => {
    const onResume = vi.fn();
    visibility = 'hidden';
    const stop = watchResume(onResume, 1000);
    vi.advanceTimersByTime(1000);
    setVisibility('visible');
    expect(onResume).toHaveBeenCalledTimes(1);
    stop();
  });

  it('keeps the first hidden time across repeated hidden events', () => {
    const onResume = vi.fn();
    const stop = watchResume(onResume, 1000);
    setVisibility('hidden');
    vi.advanceTimersByTime(600);
    setVisibility('hidden');
    vi.advanceTimersByTime(600);
    setVisibility('visible');
    expect(onResume).toHaveBeenCalledTimes(1);
    stop();
  });
});

describe('refreshAfterResume', () => {
  function watch(queryClient: QueryClient, queryFn: () => Promise<string>) {
    return new QueryObserver(queryClient, { queryKey: ['thing'], queryFn, retry: false }).subscribe(() => undefined);
  }

  it('abandons a request frozen in flight and fetches again', async () => {
    const queryClient = new QueryClient();
    let calls = 0;
    const stop = watch(queryClient, () => {
      calls += 1;
      return calls === 1 ? new Promise<string>(() => undefined) : Promise.resolve('fresh');
    });
    expect(await refreshAfterResume(queryClient, { stallMs: 1000 })).toBe('fresh');
    expect(queryClient.getQueryData(['thing'])).toBe('fresh');
    stop();
  });

  it('reports a stall while the refetch hangs, then the outcome once it lands', async () => {
    const queryClient = new QueryClient();
    let land: (value: string) => void = () => undefined;
    const stop = watch(queryClient, () => new Promise<string>((resolve) => (land = resolve)));
    const onStall = vi.fn();
    const outcome = refreshAfterResume(queryClient, { onStall, stallMs: 20 });
    await vi.waitFor(() => expect(onStall).toHaveBeenCalled());
    land('late');
    expect(await outcome).toBe('fresh');
    stop();
  });

  it('reports a refetch that fails', async () => {
    const queryClient = new QueryClient();
    const stop = watch(queryClient, () => Promise.reject(new Error('down')));
    await vi.waitFor(() => expect(queryClient.getQueryState(['thing'])?.status).toBe('error'));
    expect(await refreshAfterResume(queryClient, { stallMs: 1000 })).toBe('failed');
    stop();
  });
});

describe('useResumeRefresh', () => {
  let visibility: DocumentVisibilityState = 'visible';
  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', { get: () => visibility, configurable: true });
  });

  it('clears the stalled banner when a slow refresh finally succeeds', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    try {
      const queryClient = new QueryClient();
      let land: (value: string) => void = () => undefined;
      const stop = new QueryObserver(queryClient, {
        queryKey: ['thing'],
        queryFn: () => new Promise<string>((resolve) => (land = resolve)),
        retry: false,
      }).subscribe(() => undefined);
      const { result } = renderHook(() => useResumeRefresh(queryClient, noop));
      visibility = 'hidden';
      act(() => void document.dispatchEvent(new Event('visibilitychange')));
      vi.advanceTimersByTime(RESUME_REFRESH_AFTER_MS);
      visibility = 'visible';
      act(() => void document.dispatchEvent(new Event('visibilitychange')));
      await act(async () => void (await vi.advanceTimersByTimeAsync(RESUME_STALL_MS)));
      expect(result.current.stalled).toBe(true);
      await act(async () => land('late'));
      await vi.waitFor(() => expect(result.current.stalled).toBe(false));
      stop();
    } finally {
      vi.useRealTimers();
      visibility = 'visible';
    }
  });
});

const noop = () => undefined;
