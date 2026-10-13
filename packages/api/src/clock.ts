import type { BabbleClient } from './client';

let offsetMs = 0;

export function computeClockOffset(sentAt: number, serverIso: string, receivedAt: number): number {
  return Date.parse(serverIso) - (sentAt + receivedAt) / 2;
}

export const clock = {
  now(): Date {
    return new Date(Date.now() + offsetMs);
  },
  offsetMs(): number {
    return offsetMs;
  },
  setOffset(value: number): void {
    offsetMs = value;
  },
};

export function resetClock(): void {
  offsetMs = 0;
}

export type ClockSync = { ok: true; offsetMs: number } | { ok: false; offsetMs: number };

export const MAX_SYNC_ROUND_TRIP_MS = 5000;

// Device clocks can be minutes out; live timers subtract a server start time, so they need the server's "now".
export async function syncClock(client: BabbleClient): Promise<number> {
  return (await trySyncClock(client)).offsetMs;
}

export async function trySyncClock(client: BabbleClient): Promise<ClockSync> {
  const sentAt = Date.now();
  const { data, error } = await client.rpc('server_time');
  const receivedAt = Date.now();
  if (error || typeof data !== 'string' || receivedAt - sentAt > MAX_SYNC_ROUND_TRIP_MS) {
    return { ok: false, offsetMs };
  }
  offsetMs = computeClockOffset(sentAt, data, receivedAt);
  return { ok: true, offsetMs };
}
