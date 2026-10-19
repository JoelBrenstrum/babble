import { eventsWithin, rangeChunks, type BabyEvent, type RangeChunk } from '@babble/domain';
import { useQueries } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';
import type { BabbleClient } from '../client';
import { clock } from '../clock';
import { eventsBetweenQuery } from '../queries';

export const SETTLED_CHUNK_GC_MS = 24 * 60 * 60_000;

export function chunkQuery(client: BabbleClient, babyId: string, chunk: RangeChunk, now: Date) {
  const settled = Date.parse(chunk.to) <= now.getTime();
  return {
    ...eventsBetweenQuery(client, babyId, chunk.from, chunk.to),
    ...(settled ? { staleTime: Number.POSITIVE_INFINITY, gcTime: SETTLED_CHUNK_GC_MS } : {}),
  };
}

export interface EventsInRangeOptions {
  from: string;
  to: string;
  timeZone: string;
  dayStartMinutes: number;
  enabled?: boolean;
  keepPrevious?: boolean;
}

export interface EventsInRange {
  data: BabyEvent[] | undefined;
  isPending: boolean;
  isPlaceholderData: boolean;
}

function sameChunks(a: readonly (BabyEvent[] | undefined)[], b: readonly (BabyEvent[] | undefined)[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

export function useEventsInRange(client: BabbleClient, babyId: string, options: EventsInRangeOptions): EventsInRange {
  const { from, to, timeZone, dayStartMinutes, enabled = true, keepPrevious = false } = options;
  const chunks = useMemo(() => rangeChunks(from, to, timeZone, dayStartMinutes), [from, to, timeZone, dayStartMinutes]);
  const now = clock.now();
  const parts = useQueries({
    queries: chunks.map((chunk) => ({ ...chunkQuery(client, babyId, chunk, now), enabled })),
    combine: (results) => results.map((result) => result.data as BabyEvent[] | undefined),
  });

  const last = useRef<{ parts: (BabyEvent[] | undefined)[]; from: string; to: string; data: BabyEvent[] } | null>(null);
  const loaded = enabled && chunks.length > 0 && parts.every((part) => part !== undefined);
  let data: BabyEvent[] | undefined;
  if (loaded) {
    const cached = last.current;
    data =
      cached && cached.from === from && cached.to === to && sameChunks(cached.parts, parts)
        ? cached.data
        : eventsWithin(
            parts.flatMap((part) => part ?? []),
            from,
            to,
          );
    last.current = { parts, from, to, data };
  }

  const previous = useRef<BabyEvent[] | undefined>(undefined);
  if (data !== undefined) previous.current = data;
  const shown = data ?? (keepPrevious && enabled ? previous.current : undefined);
  return { data: shown, isPending: data === undefined, isPlaceholderData: data === undefined && shown !== undefined };
}
