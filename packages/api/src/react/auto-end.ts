import { staleSessions, type BabyEvent } from '@babble/domain';
import type { QueryClient } from '@tanstack/react-query';
import type { BabbleClient } from '../client';
import { endSession } from '../events';
import { refreshEvents } from './refresh';

export function sessionsToAutoEnd(
  running: readonly BabyEvent[],
  now: Date,
  autoEndMinutes: number,
  inFlight: ReadonlySet<string>,
): BabyEvent[] {
  return staleSessions(running, now, autoEndMinutes).filter((event) => !inFlight.has(event.id));
}

export async function autoEndStaleSessions(options: {
  client: BabbleClient;
  queryClient: QueryClient;
  babyId: string;
  running: readonly BabyEvent[];
  now: Date;
  autoEndMinutes: number;
  inFlight: Set<string>;
}): Promise<void> {
  const stale = sessionsToAutoEnd(options.running, options.now, options.autoEndMinutes, options.inFlight);
  if (stale.length === 0) return;
  for (const event of stale) options.inFlight.add(event.id);
  try {
    await Promise.allSettled(stale.map((event) => endSession(options.client, event.id)));
  } finally {
    for (const event of stale) options.inFlight.delete(event.id);
    await refreshEvents(options.queryClient, options.babyId);
  }
}
