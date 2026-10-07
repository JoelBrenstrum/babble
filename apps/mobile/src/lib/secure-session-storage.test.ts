import { CHUNK_SIZE, chunkedStore, type KeyValueStore } from './secure-session-storage';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => void data.set(key, value),
    removeItem: async (key) => void data.delete(key),
  };
}

describe('chunkedStore', () => {
  it('round-trips a value larger than one chunk', async () => {
    const secure = memoryStore();
    const store = chunkedStore(secure);
    const session = 'x'.repeat(CHUNK_SIZE * 2 + 5);
    await store.setItem('sb-auth-token', session);
    expect(secure.data.get('sb-auth-token.n')).toBe('3');
    expect(await store.getItem('sb-auth-token')).toBe(session);
  });

  it('drops chunks left over from a longer value', async () => {
    const secure = memoryStore();
    const store = chunkedStore(secure);
    await store.setItem('k', 'y'.repeat(CHUNK_SIZE * 3));
    await store.setItem('k', 'short');
    expect(await store.getItem('k')).toBe('short');
    expect([...secure.data.keys()].sort()).toEqual(['k.0', 'k.n']);
  });

  it('moves a session saved by an older version out of plain storage', async () => {
    const secure = memoryStore();
    const legacy = memoryStore({ k: 'old session' });
    const store = chunkedStore(secure, legacy);
    expect(await store.getItem('k')).toBe('old session');
    expect(legacy.data.has('k')).toBe(false);
    expect(secure.data.get('k.0')).toBe('old session');
  });

  it('removes every chunk', async () => {
    const secure = memoryStore();
    const store = chunkedStore(secure);
    await store.setItem('k', 'z'.repeat(CHUNK_SIZE + 1));
    await store.removeItem('k');
    expect(secure.data.size).toBe(0);
    expect(await store.getItem('k')).toBeNull();
  });
});
