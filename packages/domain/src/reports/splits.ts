import { nappyKind } from '../timeline/totals';
import {
  MOOD_LABELS,
  POO_COLOUR_LABELS,
  POO_TEXTURE_LABELS,
  SIDE_LABEL,
  SIZE_LABELS,
  SLEEP_LOCATION_LABELS,
  SLEEP_QUALITY_LABELS,
  SOLIDS_AMOUNT_LABELS,
  SOLIDS_REACTION_LABELS,
  WET_SIZE_LABELS,
} from '../events/labels';
import type { BabyEvent, EventSource, SleepQuality } from '../events/types';
import { isWithinNight } from '../time/night';
import { dayKeyFor } from '../time/local-time';
import { WEEKDAY_LABELS, weekdayIndex } from './buckets';
import type { ReportSettings, Sample } from './samples';
import type { ReportFilter, SplitKey } from './spec';

const BOTTLE_CONTENT_LABELS = { breast_milk: 'Breast milk', formula: 'Formula', mixed: 'Mixed', other: 'Other' };
const FALL_ASLEEP_LABELS = { under_10_min: 'Under 10 min', '10_to_20_min': '10 to 20 min', long_time: 'A long time' };
const SOURCE_LABELS: Record<EventSource, string> = {
  manual: 'Logged in babble',
  huckleberry_csv: 'Huckleberry import',
  babble_export: 'babble import',
};
const UNKNOWN = 'unknown';

export function splitValues(sample: Sample, key: SplitKey, settings: ReportSettings): string[] {
  const tagged = sample.tags?.[key];
  if (tagged) return tagged;
  const { event } = sample;
  switch (key) {
    case 'location':
      return event.type === 'sleep' ? orUnknown(event.details.locations) : [];
    case 'fallAsleep':
      return event.type === 'sleep' ? [event.details.fallAsleep ?? UNKNOWN] : [];
    case 'startMood':
      return event.type === 'sleep' ? orUnknown(event.details.startMoods) : [];
    case 'endMood':
      return event.type === 'sleep' ? orUnknown(event.details.endMoods) : [];
    case 'quality':
      return event.type === 'sleep' ? [event.details.quality === null ? UNKNOWN : String(event.details.quality)] : [];
    case 'side':
      return [];
    case 'bottleContent':
      return event.type === 'bottle' ? [event.details.content] : [];
    case 'nappyKind':
      return event.type === 'nappy' ? [nappyKind(event.details).toLowerCase()] : [];
    case 'wetSize':
      return event.type === 'nappy' && event.details.wet ? [event.details.wetSize ?? UNKNOWN] : [];
    case 'pooSize':
      return event.type === 'nappy' && event.details.dirty ? [event.details.pooSize ?? UNKNOWN] : [];
    case 'pooColour':
      return event.type === 'nappy' && event.details.dirty ? orUnknown(event.details.pooColours) : [];
    case 'pooTexture':
      return event.type === 'nappy' && event.details.dirty ? orUnknown(event.details.pooTextures) : [];
    case 'solidsAmount':
      return event.type === 'solids' ? [event.details.amount ?? UNKNOWN] : [];
    case 'solidsReaction':
      return event.type === 'solids' ? [event.details.reaction ?? UNKNOWN] : [];
    case 'carer':
      return [event.createdBy ?? UNKNOWN];
    case 'device':
      return [event.createdDevice ?? UNKNOWN];
    case 'source':
      return [event.source];
    case 'weekday':
      return [
        WEEKDAY_LABELS[
          weekdayIndex(dayKeyFor(new Date(sample.at).toISOString(), settings.timeZone, settings.dayStartMinutes))
        ]!,
      ];
    case 'dayNight':
      return [isWithinNight(new Date(sample.at), settings) ? 'night' : 'day'];
  }
}

const orUnknown = (values: readonly string[]): string[] => (values.length ? [...values] : [UNKNOWN]);

export function splitLabel(key: SplitKey, value: string, settings: ReportSettings): string {
  if (value === UNKNOWN) return key === 'carer' ? 'Unknown carer' : key === 'device' ? 'Unknown device' : 'Not set';
  switch (key) {
    case 'location':
      return SLEEP_LOCATION_LABELS[value as keyof typeof SLEEP_LOCATION_LABELS] ?? value;
    case 'fallAsleep':
      return FALL_ASLEEP_LABELS[value as keyof typeof FALL_ASLEEP_LABELS] ?? value;
    case 'startMood':
    case 'endMood':
      return MOOD_LABELS[value as keyof typeof MOOD_LABELS] ?? value;
    case 'quality':
      return SLEEP_QUALITY_LABELS[Number(value) as SleepQuality] ?? value;
    case 'side':
      return SIDE_LABEL[value as keyof typeof SIDE_LABEL] ?? value;
    case 'bottleContent':
      return BOTTLE_CONTENT_LABELS[value as keyof typeof BOTTLE_CONTENT_LABELS] ?? value;
    case 'nappyKind':
      return value.charAt(0).toUpperCase() + value.slice(1);
    case 'wetSize':
      return WET_SIZE_LABELS[value as keyof typeof WET_SIZE_LABELS] ?? value;
    case 'pooSize':
      return SIZE_LABELS[value as keyof typeof SIZE_LABELS] ?? value;
    case 'pooColour':
      return POO_COLOUR_LABELS[value as keyof typeof POO_COLOUR_LABELS] ?? value;
    case 'pooTexture':
      return POO_TEXTURE_LABELS[value as keyof typeof POO_TEXTURE_LABELS] ?? value;
    case 'solidsAmount':
      return SOLIDS_AMOUNT_LABELS[value as keyof typeof SOLIDS_AMOUNT_LABELS] ?? value;
    case 'solidsReaction':
      return SOLIDS_REACTION_LABELS[value as keyof typeof SOLIDS_REACTION_LABELS] ?? value;
    case 'carer':
      return settings.carers?.[value] ?? 'Former carer';
    case 'device':
      return value;
    case 'source':
      return SOURCE_LABELS[value as EventSource] ?? value;
    case 'weekday':
      return value;
    case 'dayNight':
      return value === 'night' ? 'Night' : 'Day';
  }
}

export const SPLIT_ORDER: Partial<Record<SplitKey, readonly string[]>> = {
  location: Object.keys(SLEEP_LOCATION_LABELS),
  fallAsleep: Object.keys(FALL_ASLEEP_LABELS),
  startMood: Object.keys(MOOD_LABELS),
  endMood: Object.keys(MOOD_LABELS),
  quality: ['1', '2', '3', '4', '5'],
  side: ['left', 'right'],
  bottleContent: Object.keys(BOTTLE_CONTENT_LABELS),
  nappyKind: ['wet', 'dirty', 'both'],
  wetSize: Object.keys(SIZE_LABELS),
  pooSize: Object.keys(SIZE_LABELS),
  pooColour: Object.keys(POO_COLOUR_LABELS),
  pooTexture: Object.keys(POO_TEXTURE_LABELS),
  solidsAmount: Object.keys(SOLIDS_AMOUNT_LABELS),
  solidsReaction: Object.keys(SOLIDS_REACTION_LABELS),
  source: Object.keys(SOURCE_LABELS),
  weekday: WEEKDAY_LABELS,
  dayNight: ['day', 'night'],
};

export function splitChoices(key: SplitKey, settings: ReportSettings): { value: string; label: string }[] {
  if (key === 'carer') {
    return Object.entries(settings.carers ?? {}).map(([value, label]) => ({ value, label }));
  }
  return (SPLIT_ORDER[key] ?? []).map((value) => ({ value, label: splitLabel(key, value, settings) }));
}

function eventText(event: BabyEvent): string {
  const parts = [event.notes ?? ''];
  if (event.type === 'custom') parts.push(event.details.title, event.details.description);
  if (event.type === 'solids') parts.push(...event.details.foods);
  return parts.join(' ').toLowerCase();
}

export function passesFilters(sample: Sample, filters: readonly ReportFilter[], settings: ReportSettings): boolean {
  return filters.every((filter) => {
    if (filter.key === 'text') return eventText(sample.event).includes(filter.text.toLowerCase());
    const values = splitValues(sample, filter.key, settings);
    return values.some((value) => filter.values.includes(value));
  });
}
