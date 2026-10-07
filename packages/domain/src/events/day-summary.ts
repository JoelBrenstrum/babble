import type { BabyEvent } from './types';

export interface DaySummary {
  sleepMs: number;
  feeds: number;
  nappies: number;
}

export function summariseDay(events: readonly BabyEvent[], window: { start: Date; end: Date }): DaySummary {
  const start = window.start.getTime();
  const end = window.end.getTime();
  let sleepMs = 0;
  let feeds = 0;
  let nappies = 0;

  for (const event of events) {
    if (event.deletedAt) continue;
    const eventStart = Date.parse(event.startedAt);
    const eventEnd = event.endedAt ? Date.parse(event.endedAt) : end;
    const startsInDay = eventStart >= start && eventStart < end;

    if (event.type === 'sleep') sleepMs += Math.max(0, Math.min(eventEnd, end) - Math.max(eventStart, start));
    if ((event.type === 'breast_feed' || event.type === 'bottle') && startsInDay) feeds += 1;
    if (event.type === 'nappy' && startsInDay) nappies += 1;
  }

  return { sleepMs, feeds, nappies };
}
