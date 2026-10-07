import { formatDuration } from '../format/duration';
import { formatLength, formatVolume, formatWeight } from '../format/units';
import { segmentTotals } from './segments';
import type { BabyEvent, PooColour, Size, Units } from './types';

export type PartTone =
  'feed-left' | 'feed-right' | 'downtime' | 'sleep' | 'bottle' | 'nappy' | 'pump' | 'growth' | 'custom';

export interface DescriptionPart {
  text: string;
  tone: PartTone;
  pooColours?: PooColour[];
}

export interface EventDescription {
  title: string;
  parts: DescriptionPart[];
  duration: string | null;
  running: boolean;
}

const SIZE_LABELS: Record<Size, string> = {
  tiny: 'Tiny',
  little: 'Little',
  medium: 'Medium',
  large: 'Large',
  massive: 'Massive',
};

const BOTTLE_LABELS = { breast_milk: 'breast milk', formula: 'formula', mixed: 'mixed', other: 'other' } as const;

export function describeEvent(event: BabyEvent, now: Date, units: Units): EventDescription {
  const running = event.endedAt === null;
  const spanMs = (event.endedAt ? Date.parse(event.endedAt) : now.getTime()) - Date.parse(event.startedAt);

  switch (event.type) {
    case 'breast_feed': {
      const totals = segmentTotals(event.segments, now);
      const parts: DescriptionPart[] = [];
      if (totals.leftMs > 0)
        parts.push({ text: `L ${formatDuration(totals.leftMs, { seconds: false })}`, tone: 'feed-left' });
      if (totals.rightMs > 0)
        parts.push({ text: `R ${formatDuration(totals.rightMs, { seconds: false })}`, tone: 'feed-right' });
      const idleMs = Math.max(0, spanMs - totals.activeMs);
      if (!running && idleMs >= 60_000 && event.source === 'manual') {
        parts.push({ text: formatDuration(idleMs, { seconds: false }), tone: 'downtime' });
      }
      return { title: 'Breastfeed', parts, duration: formatDuration(totals.activeMs, { seconds: false }), running };
    }
    case 'pump': {
      const { leftMl, rightMl, totalMl } = event.details;
      const parts: DescriptionPart[] = [];
      if (leftMl !== null) parts.push({ text: `L ${formatVolume(leftMl, units)}`, tone: 'pump' });
      if (rightMl !== null) parts.push({ text: `R ${formatVolume(rightMl, units)}`, tone: 'pump' });
      if (parts.length === 0 && totalMl !== null) parts.push({ text: formatVolume(totalMl, units), tone: 'pump' });
      const activeMs = event.segments.length > 0 ? segmentTotals(event.segments, now).activeMs : spanMs;
      return {
        title: 'Pump',
        parts,
        duration: activeMs > 0 ? formatDuration(activeMs, { seconds: false }) : null,
        running,
      };
    }
    case 'sleep':
      return { title: 'Sleep', parts: [], duration: formatDuration(spanMs, { seconds: false }), running };
    case 'bottle': {
      const { amountMl, amountLeftMl, content } = event.details;
      const drank = amountMl !== null ? amountMl - (amountLeftMl ?? 0) : null;
      const text = drank !== null ? `${formatVolume(drank, units)} ${BOTTLE_LABELS[content]}` : BOTTLE_LABELS[content];
      return {
        title: 'Bottle',
        parts: [{ text, tone: 'bottle' }],
        duration: spanMs >= 60_000 ? formatDuration(spanMs, { seconds: false }) : null,
        running,
      };
    }
    case 'nappy': {
      const { wet, dirty, wetSize, pooSize, pooColours } = event.details;
      const parts: DescriptionPart[] = [];
      if (!wet && !dirty) parts.push({ text: 'Dry', tone: 'nappy' });
      if (wet) parts.push({ text: wetSize ? `Wet · ${SIZE_LABELS[wetSize]}` : 'Wet', tone: 'nappy' });
      if (dirty) {
        parts.push({
          text: pooSize ? `Dirty · ${SIZE_LABELS[pooSize]}` : 'Dirty',
          tone: 'nappy',
          ...(pooColours.length > 0 ? { pooColours } : {}),
        });
      }
      return { title: 'Nappy', parts, duration: null, running: false };
    }
    case 'growth': {
      const { weightG, lengthMm, headCircumferenceMm } = event.details;
      const parts: DescriptionPart[] = [];
      if (weightG !== null) parts.push({ text: formatWeight(weightG, units), tone: 'growth' });
      if (lengthMm !== null) parts.push({ text: formatLength(lengthMm, units), tone: 'growth' });
      if (headCircumferenceMm !== null)
        parts.push({ text: `Head ${formatLength(headCircumferenceMm, units)}`, tone: 'growth' });
      return { title: 'Growth', parts, duration: null, running: false };
    }
    case 'custom':
      return {
        title: event.details.title,
        parts: event.details.description ? [{ text: event.details.description, tone: 'custom' }] : [],
        duration: spanMs >= 60_000 ? formatDuration(spanMs, { seconds: false }) : null,
        running,
      };
  }
}

export function summariseLatest(event: BabyEvent, now: Date, units: Units): string {
  const description = describeEvent(event, now, units);
  if (description.running) return 'In progress';
  const detail = description.parts.map((part) => part.text).join(' · ') || description.duration;
  return detail ?? '';
}
