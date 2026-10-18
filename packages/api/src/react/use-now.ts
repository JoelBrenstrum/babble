import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { clock } from '../clock';

export type WakeSubscribe = (listener: () => void) => () => void;

const WakeContext = createContext<WakeSubscribe>(() => () => undefined);

export function WakeProvider({ onWake, children }: { onWake: WakeSubscribe; children?: ReactNode }) {
  return createElement(WakeContext.Provider, { value: onWake }, children);
}

export function useNow(intervalMs = 1000, enabled = true): Date {
  const onWake = useContext(WakeContext);
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(clock.now());
    const id = setInterval(() => setNow(clock.now()), intervalMs);
    const stop = onWake(() => setNow(clock.now()));
    return () => {
      clearInterval(id);
      stop();
    };
  }, [intervalMs, enabled, onWake]);
  return now;
}
