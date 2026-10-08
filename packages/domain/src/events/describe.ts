import { formatDuration } from '../format/duration';
import { formatLength, formatVolume, formatWeight } from '../format/units';
import { segmentTotals } from './segments';
import { summariseSleep } from './sleep-stretches';
import {
  CAUTION_COLOURS,
  joinLabels,
  MOOD_LABELS,
  POO_COLOUR_LABELS,
  POO_TEXTURE_LABELS,
  SIZE_LABELS,
  SLEEP_LOCATION_LABELS,
} from './labels';
import type { NappyType } from './nappy';
import type { BabyEvent, Mood, PooColour, Side, TimedSegment, Units } from './types';

export type PartTone =
  | 'feed-left'
  | 'feed-right'
  | 'downtime'
  | 'sleep'
  | 'bottle'
  | 'nappy'
  | 'pump'
  | 'growth'
  | 'custom'
  | 'neutral'
  | 'caution'
  | 'active';

export type PartIcon =
  | 'play'
  | 'pause'
  | 'droplet'
  | 'layers'
  | 'circle-dot'
  | 'circle'
  | 'stethoscope'
  | 'weight'
  | 'ruler'
  | 'circle-dashed';

export interface DescriptionPart {
  text: string;
  tone: PartTone;
  icon?: PartIcon;
  pooColours?: PooColour[];
}

export interface EventDescription {
  title: string;
  parts: DescriptionPart[];
  duration: string | null;
  trailing: string | null;
  running: boolean;
}

function short(ms: number): string {
  return formatDuration(ms, { seconds: ms < 60_000 });
}

const BOTTLE_LABELS = { breast_milk: 'breast milk', formula: 'formula', mixed: 'mixed', other: 'other' } as const;

const NAPPY_PILLS: Record<NappyType, { text: string; icon: PartIcon }> = {
  wet: { text: 'Wet', icon: 'droplet' },
  dirty: { text: 'Dirty', icon: 'circle-dot' },
  both: { text: 'Both', icon: 'layers' },
  dry: { text: 'Dry', icon: 'circle' },
};

const IDLE_MIN_MS = 60_000;

function idlePart(ms: number): DescriptionPart {
  return { text: formatDuration(ms, { seconds: false }), tone: 'downtime', icon: 'pause' };
}

function sidesInOrder(
  segments: readonly TimedSegment[],
  idleMs: number,
  sidePart: (side: Side) => DescriptionPart | null,
): DescriptionPart[] {
  const sorted = [...segments].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  const order: Side[] = [];
  let idleAt: number | null = null;
  sorted.forEach((segment, index) => {
    const previous = sorted[index - 1];
    if (idleAt === null && previous?.endedAt) {
      const gap = Date.parse(segment.startedAt) - Date.parse(previous.endedAt);
      if (gap >= IDLE_MIN_MS) idleAt = order.length;
    }
    if (!order.includes(segment.side)) order.push(segment.side);
  });
  const parts = order.map(sidePart).filter((part): part is DescriptionPart => part !== null);
  if (idleMs >= IDLE_MIN_MS) parts.splice(Math.min(idleAt ?? parts.length, parts.length), 0, idlePart(idleMs));
  return parts;
}

function sleepMood(start: readonly Mood[], end: readonly Mood[]): string | null {
  const label = (moods: readonly Mood[]) =>
    joinLabels(
      moods.map((mood) => MOOD_LABELS[mood]),
      '/',
    );
  if (start.length > 0 && end.length > 0) return joinLabels([label(start), label(end)], ' → ');
  if (start.length > 0) return label(start);
  return end.length > 0 ? label(end) : null;
}

function withRunning(parts: DescriptionPart[], running: boolean): DescriptionPart[] {
  return running ? [{ text: 'In progress', tone: 'active', icon: 'play' }, ...parts] : parts;
}

export function describeEvent(event: BabyEvent, now: Date, units: Units): EventDescription {
  const running = event.endedAt === null;
  const spanMs = (event.endedAt ? Date.parse(event.endedAt) : now.getTime()) - Date.parse(event.startedAt);
  const describe = (description: Omit<EventDescription, 'running' | 'trailing'> & { trailing?: string | null }) => ({
    ...description,
    parts: withRunning(description.parts, running),
    trailing: description.trailing === undefined ? description.duration : description.trailing,
    running,
  });

  switch (event.type) {
    case 'breast_feed': {
      const totals = segmentTotals(event.segments, now);
      const idleMs = !running && event.source === 'manual' ? Math.max(0, spanMs - totals.activeMs) : 0;
      const parts = sidesInOrder(event.segments, idleMs, (side) => {
        const ms = side === 'left' ? totals.leftMs : totals.rightMs;
        if (ms <= 0) return null;
        return side === 'left'
          ? { text: `L ${short(ms)}`, tone: 'feed-left' }
          : { text: `R ${short(ms)}`, tone: 'feed-right' };
      });
      return describe({ title: 'Breastfeed', parts, duration: short(totals.activeMs) });
    }
    case 'pump': {
      const { leftMl, rightMl, totalMl } = event.details;
      const totals = segmentTotals(event.segments, now);
      const hasSegments = event.segments.length > 0;
      const idleMs = hasSegments && !running && event.source === 'manual' ? Math.max(0, spanMs - totals.activeMs) : 0;
      const sidePart = (side: Side): DescriptionPart | null => {
        const ms = side === 'left' ? totals.leftMs : totals.rightMs;
        const ml = side === 'left' ? leftMl : rightMl;
        const bits = [
          ms > 0 ? formatDuration(ms, { seconds: false }) : null,
          ml !== null ? formatVolume(ml, units) : null,
        ];
        const text = bits.filter((bit) => bit !== null).join(' · ');
        return text ? { text: `${side === 'left' ? 'L' : 'R'} ${text}`, tone: 'pump' } : null;
      };
      const segmentsForOrder: TimedSegment[] = hasSegments
        ? event.segments
        : (['left', 'right'] as const).map((side) => ({ side, startedAt: event.startedAt, endedAt: event.startedAt }));
      const activeMs = hasSegments ? totals.activeMs : spanMs;
      const duration = activeMs > 0 ? formatDuration(activeMs, { seconds: false }) : null;
      const ml = totalMl ?? (leftMl !== null || rightMl !== null ? (leftMl ?? 0) + (rightMl ?? 0) : null);
      return describe({
        title: 'Pump',
        parts: sidesInOrder(segmentsForOrder, idleMs, sidePart),
        duration,
        trailing: ml !== null ? formatVolume(ml, units) : duration,
      });
    }
    case 'sleep': {
      const sleep = summariseSleep(event, now);
      const { locations, startMoods, endMoods } = event.details;
      const parts: DescriptionPart[] = [];
      if (sleep.wakeUps > 0) {
        parts.push(
          { text: sleep.wakeUps === 1 ? '1 wake-up' : `${sleep.wakeUps} wake-ups`, tone: 'sleep' },
          { text: `awake ${formatDuration(sleep.awakeMs, { seconds: false })}`, tone: 'downtime', icon: 'pause' },
        );
      }
      for (const location of locations) parts.push({ text: SLEEP_LOCATION_LABELS[location], tone: 'sleep' });
      const mood = sleepMood(startMoods, endMoods);
      if (mood) parts.push({ text: mood, tone: 'neutral' });
      return describe({ title: 'Sleep', parts, duration: formatDuration(sleep.asleepMs, { seconds: false }) });
    }
    case 'bottle': {
      const { amountMl, amountLeftMl, content } = event.details;
      const drank = amountMl !== null ? amountMl - (amountLeftMl ?? 0) : null;
      const text = drank !== null ? `${formatVolume(drank, units)} ${BOTTLE_LABELS[content]}` : BOTTLE_LABELS[content];
      return describe({
        title: 'Bottle',
        parts: [{ text, tone: 'bottle' }],
        duration: spanMs >= 60_000 ? formatDuration(spanMs, { seconds: false }) : null,
      });
    }
    case 'nappy': {
      const { wet, dirty, wetSize, pooSize, pooColours, pooTextures } = event.details;
      const type: NappyType = wet && dirty ? 'both' : wet ? 'wet' : dirty ? 'dirty' : 'dry';
      const parts: DescriptionPart[] = [{ ...NAPPY_PILLS[type], tone: 'nappy' }];
      if (dirty && pooTextures.length > 0) {
        parts.push({
          text: joinLabels(
            pooTextures.map((texture) => POO_TEXTURE_LABELS[texture]),
            ', ',
          ),
          tone: 'neutral',
        });
      }
      if (dirty && pooColours.length > 0) {
        parts.push({
          text: joinLabels(
            pooColours.map((colour) => POO_COLOUR_LABELS[colour]),
            ' + ',
          ),
          tone: 'neutral',
          pooColours,
        });
        if (pooColours.some((colour) => CAUTION_COLOURS.includes(colour))) {
          parts.push({ text: 'Check', tone: 'caution', icon: 'stethoscope' });
        }
      }
      const size = dirty ? (pooSize ?? wetSize) : wet ? wetSize : null;
      return {
        title: 'Nappy',
        parts,
        duration: null,
        trailing: size ? SIZE_LABELS[size] : null,
        running: false,
      };
    }
    case 'growth': {
      const { weightG, lengthMm, headCircumferenceMm } = event.details;
      const parts: DescriptionPart[] = [];
      if (weightG !== null) parts.push({ text: formatWeight(weightG, units), tone: 'growth', icon: 'weight' });
      if (lengthMm !== null) parts.push({ text: formatLength(lengthMm, units), tone: 'growth', icon: 'ruler' });
      if (headCircumferenceMm !== null) {
        parts.push({ text: `Head ${formatLength(headCircumferenceMm, units)}`, tone: 'growth', icon: 'circle-dashed' });
      }
      return { title: 'Growth', parts, duration: null, trailing: null, running: false };
    }
    case 'custom':
      return describe({
        title: event.details.title,
        parts: event.details.description ? [{ text: event.details.description, tone: 'custom' }] : [],
        duration: spanMs >= 60_000 ? formatDuration(spanMs, { seconds: false }) : null,
      });
  }
}

const SUMMARY_TONES: readonly PartTone[] = ['downtime', 'neutral', 'caution', 'active'];

export function summariseLatest(event: BabyEvent, now: Date, units: Units): string {
  const description = describeEvent(event, now, units);
  if (description.running) return description.duration ? `In progress · ${description.duration}` : 'In progress';
  if (event.type === 'pump') return description.trailing ?? '';
  if (event.type === 'sleep') return description.duration ?? '';
  const parts = description.parts.filter((part) => !SUMMARY_TONES.includes(part.tone)).map((part) => part.text);
  if (event.type === 'nappy' && description.trailing) parts.push(description.trailing);
  return parts.join(' · ') || description.duration || '';
}
