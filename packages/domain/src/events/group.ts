import { dayKeyFor } from '../time/local-time';
import type { BabyEvent } from './types';

export interface DayGroup<T> {
  dayKey: string;
  items: T[];
}

export function groupByDay<T extends Pick<BabyEvent, 'startedAt'>>(
  events: readonly T[],
  timeZone: string,
  dayStartMinutes: number,
): DayGroup<T>[] {
  const groups = new Map<string, T[]>();
  const sorted = [...events].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  for (const event of sorted) {
    const key = dayKeyFor(event.startedAt, timeZone, dayStartMinutes);
    const items = groups.get(key);
    if (items) items.push(event);
    else groups.set(key, [event]);
  }
  return [...groups].map(([dayKey, items]) => ({ dayKey, items }));
}
