export function oncePerKey<T>(create: (key: string) => Promise<T>): (key: string) => Promise<T> {
  const pending = new Map<string, Promise<T>>();
  return (key) => {
    const existing = pending.get(key);
    if (existing) return existing;
    const promise = create(key);
    pending.set(key, promise);
    promise.catch(() => pending.delete(key));
    return promise;
  };
}
