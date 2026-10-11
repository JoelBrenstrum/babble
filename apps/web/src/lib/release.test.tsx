import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchReleaseId, isNewRelease, parseReleaseId, RELEASE_ID, useNewRelease } from './release';

describe('release checks', () => {
  it('reads the release id from the version endpoint body', () => {
    expect(parseReleaseId({ release: 'abc' })).toBe('abc');
    expect(parseReleaseId({ release: '' })).toBeNull();
    expect(parseReleaseId({ ok: true })).toBeNull();
    expect(parseReleaseId(null)).toBeNull();
  });

  it('only reports a new release when the server has a different one', () => {
    expect(isNewRelease('a', 'b')).toBe(true);
    expect(isNewRelease('a', 'a')).toBe(false);
    expect(isNewRelease('a', null)).toBe(false);
  });

  it('asks the server without caching and treats failures as unknown', async () => {
    const ok = vi.fn(async () => Response.json({ release: 'next' }));
    expect(await fetchReleaseId(ok)).toBe('next');
    expect(ok).toHaveBeenCalledWith('/api/version', { cache: 'no-store' });
    expect(await fetchReleaseId(async () => new Response('nope', { status: 502 }))).toBeNull();
    expect(
      await fetchReleaseId(async () => {
        throw new TypeError('offline');
      }),
    ).toBeNull();
  });
});

describe('useNewRelease', () => {
  afterEach(() => vi.unstubAllGlobals());

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
  }

  it('turns true once the server reports a different release', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ release: `${RELEASE_ID}-next` }));
    const { result } = renderHook(() => useNewRelease(), { wrapper });
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('stays false while the release matches', async () => {
    const fetcher = vi.fn(async () => Response.json({ release: RELEASE_ID }));
    vi.stubGlobal('fetch', fetcher);
    const { result } = renderHook(() => useNewRelease(), { wrapper });
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });
});
