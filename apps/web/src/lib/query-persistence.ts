import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { replaceEqualDeep, type Query, type QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';

export const PERSIST_MAX_AGE_MS = 24 * 60 * 60_000;
const STORAGE_KEY = 'babble.queryCache';
declare const __BABBLE_CACHE_VERSION__: string | undefined;

export const CACHE_VERSION = typeof __BABBLE_CACHE_VERSION__ === 'string' ? __BABBLE_CACHE_VERSION__ : 'dev';
const NEVER_PERSISTED = new Set(['release', 'invite', 'device-link']);

export interface PersistedStorage {
  getItem(key: string): Promise<string | null | undefined>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<void>;
}

// A query keeps its last good data through a failed refetch, and that data is still worth restoring.
export function shouldPersistQuery(query: Query): boolean {
  return query.state.data !== undefined && !NEVER_PERSISTED.has(String(query.queryKey[0]));
}

export const idbStorage: PersistedStorage = {
  getItem: (key: string) => get<string>(key),
  setItem: (key: string, value: string) => set(key, value),
  removeItem: (key: string) => del(key),
};

export interface QueryPersistence {
  restored: Promise<void>;
  clear: () => Promise<void>;
}

const noPersistence: QueryPersistence = { restored: Promise.resolve(), clear: () => Promise.resolve() };
let current: QueryPersistence = noPersistence;

export function setupQueryPersistence(
  queryClient: QueryClient,
  options: { storage?: PersistedStorage; buster?: string; throttleTime?: number } = {},
): QueryPersistence {
  const persister = createAsyncStoragePersister({
    storage: options.storage ?? idbStorage,
    key: STORAGE_KEY,
    throttleTime: options.throttleTime ?? 1000,
  });
  const [, restored] = persistQueryClient({
    queryClient,
    persister,
    maxAge: PERSIST_MAX_AGE_MS,
    buster: options.buster ?? CACHE_VERSION,
    dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
  });
  // Restored data is shown straight away but always refetched: it may be seconds or hours old.
  const restoredStale = restored
    .then(() => queryClient.invalidateQueries({ refetchType: 'none' }))
    .catch(() => undefined);
  current = {
    restored: restoredStale,
    clear: async () => {
      await persister.removeClient();
    },
  };
  return current;
}

export function queryCacheRestored(): Promise<void> {
  return current.restored;
}

export function clearPersistedQueries(): Promise<void> {
  return current.clear();
}

const revalidated = new Set<string>();

export function resetRevalidation(): void {
  revalidated.clear();
}

// Restored data may be hours old, so the first read of a query in a page load goes to the network,
// falling back to the cache only when that fails. Later reads behave like ensureQueryData.
export async function ensureCurrentData<T>(
  queryClient: QueryClient,
  options: { queryKey: readonly unknown[]; queryFn: () => Promise<T>; staleTime?: number; retry?: boolean | number },
): Promise<T> {
  const key = JSON.stringify(options.queryKey);
  if (revalidated.has(key)) return queryClient.ensureQueryData(options);
  try {
    // networkMode 'always' lets the request fail outright while offline instead of pausing forever.
    const data = await queryClient.fetchQuery({ ...options, staleTime: 0, networkMode: 'always' });
    revalidated.add(key);
    return data;
  } catch (error) {
    const cached = queryClient.getQueryData<T>(options.queryKey);
    if (cached !== undefined) return cached;
    throw error;
  }
}

// Answers from usable cached data straight away, refreshing in the background, so a start-up with saved data
// never waits on the network.
export async function cachedThenCurrent<T>(
  queryClient: QueryClient,
  {
    usable = () => true,
    ...options
  }: {
    queryKey: readonly unknown[];
    queryFn: () => Promise<T>;
    staleTime?: number;
    retry?: boolean | number;
    usable?: (data: T) => boolean;
  },
): Promise<T> {
  const key = JSON.stringify(options.queryKey);
  const cached = queryClient.getQueryData<T>(options.queryKey);
  if (cached === undefined || revalidated.has(key) || !usable(cached)) return ensureCurrentData(queryClient, options);
  void queryClient.fetchQuery({ ...options, staleTime: 0, networkMode: 'always' }).then(
    () => void revalidated.add(key),
    () => undefined,
  );
  return cached;
}

export function sameData<T>(a: T, b: T): boolean {
  return replaceEqualDeep(a, b) === a;
}
