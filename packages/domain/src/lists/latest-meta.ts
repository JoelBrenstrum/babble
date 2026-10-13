import { summariseLatest } from '../events/describe';
import type { BabyEvent, Units } from '../events/types';
import { formatAgo } from '../format/duration';
import { ms } from '../time/instants';
import { formatShortDate } from '../time/local-time';
import { sinceReference } from './list-strip';

export function latestMeta(event: BabyEvent | undefined, now: Date, units: Units, timeZone: string): string {
  if (!event) return 'Nothing logged yet';
  if (event.endedAt === null && event.type !== 'bottle') return summariseLatest(event, now, units);
  if (event.type === 'growth') {
    const [first] = summariseLatest(event, now, units).split(' · ');
    return `${first} · ${formatShortDate(event.startedAt, timeZone)}`;
  }
  const detail = summariseLatest(event, now, units);
  return `Last ${formatAgo(now.getTime() - ms(sinceReference(event)))}${detail ? ` · ${detail}` : ''}`;
}
