import { useEffect, useState } from 'react';

export const STALL_MS = 10_000;

export function useStalled(afterMs = STALL_MS): boolean {
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setStalled(true), afterMs);
    return () => clearTimeout(id);
  }, [afterMs]);
  return stalled;
}
