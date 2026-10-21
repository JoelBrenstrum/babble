export const FETCH_TIMEOUT_MS = 20_000;

export function timeoutSignal(timeoutMs: number, outer?: AbortSignal | null): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs);
  const forward = () => controller.abort(outer?.reason);
  controller.signal.addEventListener(
    'abort',
    () => {
      clearTimeout(timer);
      outer?.removeEventListener('abort', forward);
    },
    { once: true },
  );
  if (outer?.aborted) forward();
  else outer?.addEventListener('abort', forward, { once: true });
  return controller.signal;
}

export function fetchWithTimeout(baseFetch: typeof fetch = fetch, timeoutMs = FETCH_TIMEOUT_MS): typeof fetch {
  return (input, init) => {
    const outer = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    return baseFetch(input, { ...init, signal: timeoutSignal(timeoutMs, outer) });
  };
}
