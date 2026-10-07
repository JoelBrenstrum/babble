import { clock } from '@babble/api';
import { useEffect, useState } from 'react';

export function useNow(intervalMs = 1000, enabled = true): Date {
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(clock.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
}
