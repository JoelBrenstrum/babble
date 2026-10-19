import type { TimeWindow } from '../time/windows';
import type { BabyEvent } from './types';

const INSTANT_TYPES = new Set<BabyEvent['type']>(['bottle', 'solids', 'nappy']);

export const isInstantType = (type: BabyEvent['type']): boolean => INSTANT_TYPES.has(type);

export function eventSpan(event: BabyEvent, now: Date): TimeWindow {
  const start = new Date(event.startedAt);
  if (isInstantType(event.type)) return { start, end: start };
  const end = event.endedAt ? new Date(event.endedAt) : now;
  return { start, end: end < start ? start : end };
}
