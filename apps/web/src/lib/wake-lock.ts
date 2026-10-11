import { useEffect, useState } from 'react';

type BatteryManager = EventTarget & { charging: boolean };
type BatteryNavigator = Navigator & { getBattery?: () => Promise<BatteryManager> };

export function wakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

export function useScreenWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !wakeLockSupported()) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (cancelled) void next.release();
        else sentinel = next;
      } catch {
        // Browsers refuse the lock on low battery or in background tabs; the next visibility change retries.
      }
    }

    const onVisibility = () => void acquire();
    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release();
    };
  }, [enabled]);
}

export function useCharging(): boolean | null {
  const [charging, setCharging] = useState<boolean | null>(null);
  useEffect(() => {
    const getBattery = (navigator as BatteryNavigator).getBattery;
    if (!getBattery) return;
    let battery: BatteryManager | null = null;
    const update = () => battery && setCharging(battery.charging);
    getBattery
      .call(navigator)
      .then((result) => {
        battery = result;
        update();
        result.addEventListener('chargingchange', update);
      })
      .catch(() => undefined);
    return () => battery?.removeEventListener('chargingchange', update);
  }, []);
  return charging;
}
