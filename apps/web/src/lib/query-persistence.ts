import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Query, QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';
import { RELEASE_ID } from './release';

export const PERSIST_MAX_AGE_MS = 24 * 60 * 60_000;
const STORAGE_KEY = 'babble.queryCache';
const NEVER_PERSISTED = new Set(['release', 'invite']);

export interface PersistedStorage {
  getItem(key: string): Promise<string | null | undefined>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<void>;
}

export function shouldPersistQuery(query: Query): boolean {
  return query.state.status === 'success' && !NEVER_PERSISTED.has(String(query.queryKey[0]));
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
    buster: options.buster ?? RELEASE_ID,
    dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
  });
  current = {
    restored: restored.catch(() => undefined),
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
