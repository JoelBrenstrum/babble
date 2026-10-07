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

// Device clocks can be minutes out; live timers subtract a server start time, so they need the server's "now".
export async function syncClock(client: BabbleClient): Promise<number> {
  const sentAt = Date.now();
  const { data, error } = await client.rpc('server_time');
  const receivedAt = Date.now();
  if (error || typeof data !== 'string') return offsetMs;
  if (receivedAt - sentAt > 5000) return offsetMs;
  offsetMs = computeClockOffset(sentAt, data, receivedAt);
  return offsetMs;
}
