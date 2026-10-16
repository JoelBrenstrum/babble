import { describeEvent } from '../events/describe';
import { formatDuration } from '../format/duration';
import { formatVolume } from '../format/units';
import type { BabyEvent, Units } from '../events/types';
import { MINUTE_MS } from '../time/constants';
import { ms } from '../time/instants';
import { formatTimeOfDay } from '../time/local-time';
import type { TimelineItem } from './day-layout';
import { nappyKind } from './totals';

export const LABEL_MIN_FRAC = 0.03;

const MIN_SPAN_FRAC = 1e-6;

export const formatFraction = (frac: number): string => `${(frac * 100).toFixed(3)}%`;

export function timelineItemLabel(item: TimelineItem, timeZone: string, units: Units): string {
  const { event } = item;
  const at = formatTimeOfDay(event.startedAt, timeZone);
  const length = event.endedAt
    ? formatDuration(ms(event.endedAt) - ms(event.startedAt), { seconds: false })
    : 'running';
  switch (event.type) {
    case 'sleep':
      return `Sleep ${at}, ${length}`;
    case 'breast_feed':
      return `Breastfeed ${at}, ${length}`;
    case 'pump':
      return `Pump ${at}, ${length}`;
    case 'bottle':
      return `Bottle ${at}${event.details.amountMl ? `, ${formatVolume(event.details.amountMl, units)}` : ''}`;
    case 'solids':
      return `Solids ${at}, ${event.details.foods.join(', ')}`;
    case 'nappy':
      return `Nappy ${at}, ${nappyKind(event.details).toLowerCase()}`;
    case 'custom': {
      const spanMs = event.endedAt ? ms(event.endedAt) - ms(event.startedAt) : null;
      const custom = spanMs === null ? 'running' : spanMs >= MINUTE_MS ? length : null;
      return `${event.details.title} ${at}${custom ? `, ${custom}` : ''}`;
    }
    default:
      return at;
  }
}

export function itemSpanFrac(item: Pick<TimelineItem, 'startFrac' | 'endFrac'>): number {
  return item.endFrac - item.startFrac;
}

export function showsItemLabel(item: Pick<TimelineItem, 'startFrac' | 'endFrac'>): boolean {
  return itemSpanFrac(item) > LABEL_MIN_FRAC;
}

export function partSpan(
  item: Pick<TimelineItem, 'startFrac' | 'endFrac'>,
  part: Pick<TimelineItem['parts'][number], 'startFrac' | 'endFrac'>,
): { top: number; height: number } {
  const span = Math.max(itemSpanFrac(item), MIN_SPAN_FRAC);
  return { top: (part.startFrac - item.startFrac) / span, height: (part.endFrac - part.startFrac) / span };
}

export interface TimelineTip {
  title: string;
  lines: string[];
}

const NOTE_MAX = 80;

export function timelineItemTip(event: BabyEvent, now: Date, timeZone: string, units: Units): TimelineTip {
  const description = describeEvent(event, now, units);
  const from = formatTimeOfDay(event.startedAt, timeZone);
  const endMs = event.endedAt ? ms(event.endedAt) : now.getTime();
  const spanMs = endMs - ms(event.startedAt);
  const span = formatDuration(spanMs, { seconds: false });
  const when = !event.endedAt
    ? `${from} – now · ${span} so far`
    : spanMs < MINUTE_MS
      ? from
      : `${from} – ${formatTimeOfDay(event.endedAt, timeZone)} · ${span}`;
  const details = description.parts
    .filter((part) => part.tone !== 'active')
    .map((part) => (part.tone === 'downtime' && !part.text.startsWith('awake') ? `idle ${part.text}` : part.text));
  if (event.type === 'sleep' && description.duration && description.duration !== span && event.endedAt) {
    details.unshift(`asleep ${description.duration}`);
  }
  if (description.trailing && description.trailing !== description.duration) details.push(description.trailing);
  const note = event.notes?.trim();
  const lines = [when, details.join(' · '), note && note.length > NOTE_MAX ? `${note.slice(0, NOTE_MAX - 1)}…` : note];
  return { title: description.title, lines: lines.filter((line): line is string => Boolean(line)) };
}
