import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithTimeout, timeoutSignal } from './fetch-timeout';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('timeoutSignal', () => {
  it('aborts with a timeout error once the time is up', () => {
    const signal = timeoutSignal(1000);
    vi.advanceTimersByTime(999);
    expect(signal.aborted).toBe(false);
    vi.advanceTimersByTime(1);
    expect(signal.aborted).toBe(true);
    expect((signal.reason as DOMException).name).toBe('TimeoutError');
  });

  it('follows an outer signal and drops its timer', () => {
    const outer = new AbortController();
    const signal = timeoutSignal(1000, outer.signal);
    outer.abort(new Error('cancelled'));
    expect(signal.aborted).toBe(true);
    expect((signal.reason as Error).message).toBe('cancelled');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('is already aborted when the outer signal is', () => {
    const outer = AbortSignal.abort(new Error('gone'));
    const signal = timeoutSignal(1000, outer);
    expect(signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('fetchWithTimeout', () => {
  it('passes a timing-out signal to the underlying fetch', async () => {
    const base = vi.fn(async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      await new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)));
      return new Response();
    });
    const pending = fetchWithTimeout(base, 500)('https://example.test', { headers: { apikey: 'key' } });
    const settled = pending.catch((error: unknown) => error);
    vi.advanceTimersByTime(500);
    expect(((await settled) as DOMException).name).toBe('TimeoutError');
    const init = base.mock.calls[0]![1]!;
    expect(init.headers).toEqual({ apikey: 'key' });
  });

  it('keeps a caller abort working', async () => {
    const base = vi.fn(async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      expect(init?.signal?.aborted).toBe(true);
      return new Response();
    });
    const outer = new AbortController();
    outer.abort();
    await fetchWithTimeout(base, 500)('https://example.test', { signal: outer.signal });
    expect(base).toHaveBeenCalledTimes(1);
  });
});
