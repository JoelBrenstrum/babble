import {
  isEventType,
  type BottleDetails,
  type CustomDetails,
  type DraftOfType,
  type EventDraft,
  type EventType,
  type GrowthDetails,
  type NappyDetails,
  type PumpDetails,
  type SleepDetails,
  type SolidsDetails,
  type Stretch,
  type TimedSegment,
} from '@babble/domain';
import { Constants } from './database.types';

const ENUMS = Constants.public.Enums;

type Reader<T> = (value: unknown) => T | undefined;
type Fields<T> = { [K in keyof T]-?: Reader<T[K]> };

const string: Reader<string> = (value) => (typeof value === 'string' ? value : undefined);
const boolean: Reader<boolean> = (value) => (typeof value === 'boolean' ? value : undefined);
const number: Reader<number> = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
const literal =
  <T extends string>(expected: T): Reader<T> =>
  (value) =>
    value === expected ? expected : undefined;
const oneOf =
  <T extends string>(values: readonly T[]): Reader<T> =>
  (value) =>
    typeof value === 'string' && (values as readonly string[]).includes(value) ? (value as T) : undefined;
const nullable =
  <T>(read: Reader<T>): Reader<T | null> =>
  (value) =>
    value === null ? null : read(value);
const listOf =
  <T>(read: Reader<T>): Reader<T[]> =>
  (value) => {
    if (!Array.isArray(value)) return undefined;
    const items: T[] = [];
    for (const item of value) {
      const read_ = read(item);
      if (read_ === undefined) return undefined;
      items.push(read_);
    }
    return items;
  };
const objectOf =
  <T extends object>(fields: Fields<T>): Reader<T> =>
  (value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
    const result: Partial<T> = {};
    for (const key of Object.keys(fields) as (keyof T & string)[]) {
      const item = fields[key]((value as Record<string, unknown>)[key]);
      if (item === undefined) return undefined;
      result[key] = item;
    }
    return result as T;
  };

const stretch = objectOf<Stretch>({ startedAt: string, endedAt: nullable(string) });
const segment = objectOf<TimedSegment>({ side: oneOf(ENUMS.side), startedAt: string, endedAt: nullable(string) });
const base = { startedAt: string, endedAt: nullable(string), notes: nullable(string) };

const READERS: { [T in EventType]: Reader<DraftOfType<T>> } = {
  sleep: objectOf({
    ...base,
    type: literal('sleep'),
    details: objectOf<SleepDetails>({
      locations: listOf(oneOf(ENUMS.sleep_location)),
      fallAsleep: nullable(oneOf(ENUMS.fall_asleep)),
      startMoods: listOf(oneOf(ENUMS.mood)),
      endMoods: listOf(oneOf(ENUMS.mood)),
      wokenByCarer: boolean,
    }),
    segments: listOf(stretch),
  }),
  breast_feed: objectOf({ ...base, type: literal('breast_feed'), segments: listOf(segment) }),
  bottle: objectOf({
    ...base,
    type: literal('bottle'),
    details: objectOf<BottleDetails>({
      content: oneOf(ENUMS.bottle_content),
      amountMl: nullable(number),
      amountLeftMl: nullable(number),
    }),
  }),
  solids: objectOf({
    ...base,
    type: literal('solids'),
    details: objectOf<SolidsDetails>({
      foods: listOf(string),
      amount: nullable(oneOf(ENUMS.solids_amount)),
      reaction: nullable(oneOf(ENUMS.solids_reaction)),
    }),
  }),
  nappy: objectOf({
    ...base,
    type: literal('nappy'),
    details: objectOf<Omit<NappyDetails, 'typePending'>>({
      wet: boolean,
      dirty: boolean,
      wetSize: nullable(oneOf(ENUMS.size)),
      pooSize: nullable(oneOf(ENUMS.size)),
      pooColours: listOf(oneOf(ENUMS.poo_colour)),
      pooTextures: listOf(oneOf(ENUMS.poo_texture)),
      rash: boolean,
    }),
  }),
  pump: objectOf({
    ...base,
    type: literal('pump'),
    segments: listOf(segment),
    details: objectOf<PumpDetails>({ leftMl: nullable(number), rightMl: nullable(number), totalMl: nullable(number) }),
  }),
  growth: objectOf({
    ...base,
    type: literal('growth'),
    details: objectOf<GrowthDetails>({
      weightG: nullable(number),
      lengthMm: nullable(number),
      headCircumferenceMm: nullable(number),
    }),
  }),
  custom: objectOf({
    ...base,
    type: literal('custom'),
    details: objectOf<CustomDetails>({ title: string, description: string }),
  }),
};

export function readExportedDraft(raw: Record<string, unknown>): EventDraft | undefined {
  const type = raw.type;
  return typeof type === 'string' && isEventType(type) ? READERS[type](raw) : undefined;
}
