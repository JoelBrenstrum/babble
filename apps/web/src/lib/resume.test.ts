import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RESUME_REFRESH_AFTER_MS, refreshAfterResume, shouldRefreshOnResume, watchResume } from './resume';

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
    expect(await refreshAfterResume(queryClient, 1000)).toBe('fresh');
    expect(queryClient.getQueryData(['thing'])).toBe('fresh');
    stop();
  });

  it('reports a stall when the refetch also hangs', async () => {
    const queryClient = new QueryClient();
    const stop = watch(queryClient, () => new Promise<string>(() => undefined));
    expect(await refreshAfterResume(queryClient, 20)).toBe('stalled');
    stop();
  });
});
