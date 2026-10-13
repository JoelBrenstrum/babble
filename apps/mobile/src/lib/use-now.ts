import { clock } from '@babble/api';
import { useEffect, useState } from 'react';
import { onForeground } from './foreground';

export function useNow(intervalMs = 1000, enabled = true): Date {
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(clock.now());
    const id = setInterval(() => setNow(clock.now()), intervalMs);
    const stop = onForeground(() => setNow(clock.now()));
    return () => {
      clearInterval(id);
      stop();
    };
  }, [intervalMs, enabled]);
  return now;
}
