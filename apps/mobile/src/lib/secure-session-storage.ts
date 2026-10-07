export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// SecureStore warns above 2048 bytes and a session can be larger, so values are split into chunks.
export const CHUNK_SIZE = 1000;

const countKey = (key: string) => `${key}.n`;
const chunkKey = (key: string, index: number) => `${key}.${index}`;

export function chunkedStore(secure: KeyValueStore, legacy?: KeyValueStore): KeyValueStore {
  const removeChunks = async (key: string, from = 0) => {
    const count = Number((await secure.getItem(countKey(key))) ?? 0);
    for (let index = from; index < count; index += 1) await secure.removeItem(chunkKey(key, index));
  };

  const store: KeyValueStore = {
    async getItem(key) {
      const count = await secure.getItem(countKey(key));
      if (count === null) {
        const old = (await legacy?.getItem(key)) ?? null;
        if (old !== null) {
          await store.setItem(key, old);
          await legacy!.removeItem(key);
        }
        return old;
      }
      const chunks: string[] = [];
      for (let index = 0; index < Number(count); index += 1) {
        const chunk = await secure.getItem(chunkKey(key, index));
        if (chunk === null) return null;
        chunks.push(chunk);
      }
      return chunks.join('');
    },
    async setItem(key, value) {
      const chunks: string[] = [];
      for (let start = 0; start < value.length; start += CHUNK_SIZE)
        chunks.push(value.slice(start, start + CHUNK_SIZE));
      await removeChunks(key, chunks.length);
      for (const [index, chunk] of chunks.entries()) await secure.setItem(chunkKey(key, index), chunk);
      await secure.setItem(countKey(key), String(chunks.length));
    },
    async removeItem(key) {
      await removeChunks(key);
      await secure.removeItem(countKey(key));
      await legacy?.removeItem(key);
    },
  };
  return store;
}
