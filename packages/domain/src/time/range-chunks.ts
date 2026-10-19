import { isSessionType } from '../trackers';
import type { BabyEvent } from '../events/types';
import { DAY_MS } from './constants';
import { dayKeyFor, dayWindow, parseDayKey, shiftDay } from './local-time';

export const CHUNK_DAYS = 7;
const EPOCH_KEY = '2024-01-01';

export interface RangeChunk {
  from: string;
  to: string;
}

function dayNumber(dayKey: string): number {
  const { year, month, day } = parseDayKey(dayKey);
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function chunkStartKey(dayKey: string): string {
  const offset = dayNumber(dayKey) - dayNumber(EPOCH_KEY);
  return shiftDay(EPOCH_KEY, Math.floor(offset / CHUNK_DAYS) * CHUNK_DAYS);
}

export function rangeChunks(from: string, to: string, timeZone: string, dayStartMinutes: number): RangeChunk[] {
  if (!(Date.parse(to) > Date.parse(from))) return [];
  const lastInstant = new Date(Date.parse(to) - 1).toISOString();
  const lastStart = chunkStartKey(dayKeyFor(lastInstant, timeZone, dayStartMinutes));
  const chunks: RangeChunk[] = [];
  let startKey = chunkStartKey(dayKeyFor(from, timeZone, dayStartMinutes));
  for (;;) {
    chunks.push({
      from: dayWindow(startKey, timeZone, dayStartMinutes).start.toISOString(),
      to: dayWindow(shiftDay(startKey, CHUNK_DAYS - 1), timeZone, dayStartMinutes).end.toISOString(),
    });
    if (startKey === lastStart) return chunks;
    startKey = shiftDay(startKey, CHUNK_DAYS);
  }
}

export function overlapsRange(event: BabyEvent, from: string, to: string): boolean {
  if (event.deletedAt) return false;
  const started = Date.parse(event.startedAt);
  if (started >= Date.parse(to)) return false;
  if (started >= Date.parse(from)) return true;
  if (event.endedAt === null) return isSessionType(event.type);
  return Date.parse(event.endedAt) >= Date.parse(from);
}

export function eventsWithin(events: readonly BabyEvent[], from: string, to: string): BabyEvent[] {
  const seen = new Set<string>();
  const within: BabyEvent[] = [];
  for (const event of events) {
    if (seen.has(event.id) || !overlapsRange(event, from, to)) continue;
    seen.add(event.id);
    within.push(event);
  }
  return within.sort(
    (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
  );
}
