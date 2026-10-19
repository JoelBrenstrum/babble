import { QueryClient, type Query } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import {
  ensureCurrentData,
  PERSIST_MAX_AGE_MS,
  resetRevalidation,
  setupQueryPersistence,
  shouldPersistQuery,
  type PersistedStorage,
} from './query-persistence';

function memoryStorage(): PersistedStorage & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: async (key: string) => items.get(key),
    setItem: async (key: string, value: string) => void items.set(key, value),
    removeItem: async (key: string) => void items.delete(key),
  };
}

function client() {
  return new QueryClient({ defaultOptions: { queries: { gcTime: PERSIST_MAX_AGE_MS } } });
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 5));

describe('shouldPersistQuery', () => {
  const query = (key: unknown[], status: string) => ({ queryKey: key, state: { status } }) as unknown as Query;

  it('keeps successful data and skips errors, pending fetches and the release check', () => {
    expect(shouldPersistQuery(query(['events', 'b1', 'latest'], 'success'))).toBe(true);
    expect(shouldPersistQuery(query(['events', 'b1', 'latest'], 'error'))).toBe(false);
    expect(shouldPersistQuery(query(['events', 'b1', 'latest'], 'pending'))).toBe(false);
    expect(shouldPersistQuery(query(['release'], 'success'))).toBe(false);
    expect(shouldPersistQuery(query(['invite', 'ABC'], 'success'))).toBe(false);
    expect(shouldPersistQuery(query(['device-link', 'ABC'], 'success'))).toBe(false);
  });
});

describe('ensureCurrentData', () => {
  it('fetches fresh data the first time even when the cache has some, then reuses the cache', async () => {
    resetRevalidation();
    const queryClient = client();
    queryClient.setQueryData(['families'], [{ id: 'stale' }]);
    let calls = 0;
    const options = {
      queryKey: ['families'],
      queryFn: async () => {
        calls += 1;
        return [{ id: 'fresh' }];
      },
    };
    expect(await ensureCurrentData(queryClient, options)).toEqual([{ id: 'fresh' }]);
    expect(await ensureCurrentData(queryClient, options)).toEqual([{ id: 'fresh' }]);
    expect(calls).toBe(1);
  });

  it('falls back to the cached data when the fresh fetch fails', async () => {
    resetRevalidation();
    const queryClient = client();
    queryClient.setQueryData(['families'], [{ id: 'cached' }]);
    const options = {
      queryKey: ['families'],
      queryFn: async () => {
        throw new Error('offline');
      },
      retry: false,
    };
    expect(await ensureCurrentData(queryClient, options)).toEqual([{ id: 'cached' }]);
  });

  it('throws when the fetch fails and nothing is cached', async () => {
    resetRevalidation();
    const queryClient = client();
    const options = {
      queryKey: ['families'],
      queryFn: async (): Promise<string[]> => {
        throw new Error('offline');
      },
      retry: false,
    };
    await expect(ensureCurrentData(queryClient, options)).rejects.toThrow('offline');
  });
});

describe('setupQueryPersistence', () => {
  it('restores what an earlier session cached', async () => {
    const storage = memoryStorage();
    const first = client();
    await setupQueryPersistence(first, { storage, throttleTime: 0, buster: 'r1' }).restored;
    first.setQueryData(['events', 'b1', 'latest'], [{ id: 'e1' }]);
    first.setQueryData(['release'], 'r1');
    await flush();
    expect(storage.items.size).toBe(1);

    const second = client();
    await setupQueryPersistence(second, { storage, throttleTime: 0, buster: 'r1' }).restored;
    expect(second.getQueryData(['events', 'b1', 'latest'])).toEqual([{ id: 'e1' }]);
    expect(second.getQueryData(['release'])).toBeUndefined();
  });

  it('marks restored data stale so it is refetched on first use', async () => {
    const storage = memoryStorage();
    const first = client();
    await setupQueryPersistence(first, { storage, throttleTime: 0, buster: 'r1' }).restored;
    first.setQueryData(['events', 'b1', 'latest'], [{ id: 'e1' }]);
    await flush();

    const second = client();
    await setupQueryPersistence(second, { storage, throttleTime: 0, buster: 'r1' }).restored;
    expect(second.getQueryState(['events', 'b1', 'latest'])?.isInvalidated).toBe(true);
  });

  it('drops the cache when the release changes', async () => {
    const storage = memoryStorage();
    const first = client();
    await setupQueryPersistence(first, { storage, throttleTime: 0, buster: 'r1' }).restored;
    first.setQueryData(['families'], [{ id: 'f1' }]);
    await flush();

    const second = client();
    await setupQueryPersistence(second, { storage, throttleTime: 0, buster: 'r2' }).restored;
    expect(second.getQueryData(['families'])).toBeUndefined();
  });

  it('clears the stored cache on request', async () => {
    const storage = memoryStorage();
    const first = client();
    const persistence = setupQueryPersistence(first, { storage, throttleTime: 0, buster: 'r1' });
    await persistence.restored;
    first.setQueryData(['families'], [{ id: 'f1' }]);
    await flush();
    expect(storage.items.size).toBe(1);
    await persistence.clear();
    expect(storage.items.size).toBe(0);
  });
});
