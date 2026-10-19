import {
  isEventType,
  SLEEP_QUALITIES,
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

const readString: Reader<string> = (value) => (typeof value === 'string' ? value : undefined);
const readBoolean: Reader<boolean> = (value) => (typeof value === 'boolean' ? value : undefined);
const readNumber: Reader<number> = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
const literal =
  <T extends string>(expected: T): Reader<T> =>
  (value) =>
    value === expected ? expected : undefined;
const oneOf =
  <T extends string | number>(values: readonly T[]): Reader<T> =>
  (value) =>
    (values as readonly unknown[]).includes(value) ? (value as T) : undefined;
const absentAs =
  <T, D extends T>(read: Reader<T>, fallback: D): Reader<T> =>
  (value) =>
    value === undefined ? fallback : read(value);
const nullable = <T>(read: Reader<T>): Reader<T | null> =>
  absentAs((value) => (value === null ? null : read(value)), null);
const flag = absentAs(readBoolean, false);
const listOf =
  <T>(read: Reader<T>): Reader<T[]> =>
  (value) => {
    if (value === undefined) return [];
    if (!Array.isArray(value)) return undefined;
    const items: T[] = [];
    for (const item of value) {
      const readItem = read(item);
      if (readItem === undefined) return undefined;
      items.push(readItem);
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
const detailsOf = <T extends object>(fields: Fields<T>): Reader<T> => absentAs(objectOf(fields), {} as T);

const stretch = objectOf<Stretch>({ startedAt: readString, endedAt: nullable(readString) });
const segment = objectOf<TimedSegment>({
  side: oneOf(ENUMS.side),
  startedAt: readString,
  endedAt: nullable(readString),
});
const base = { startedAt: readString, endedAt: nullable(readString), notes: nullable(readString) };

const READERS: { [T in EventType]: Reader<DraftOfType<T>> } = {
  sleep: objectOf({
    ...base,
    type: literal('sleep'),
    details: detailsOf<SleepDetails>({
      locations: listOf(oneOf(ENUMS.sleep_location)),
      fallAsleep: nullable(oneOf(ENUMS.fall_asleep)),
      startMoods: listOf(oneOf(ENUMS.mood)),
      endMoods: listOf(oneOf(ENUMS.mood)),
      wokenByCarer: flag,
      quality: nullable(oneOf(SLEEP_QUALITIES)),
    }),
    segments: listOf(stretch),
  }),
  breast_feed: objectOf({ ...base, type: literal('breast_feed'), segments: listOf(segment) }),
  bottle: objectOf({
    ...base,
    type: literal('bottle'),
    details: detailsOf<BottleDetails>({
      content: absentAs(oneOf(ENUMS.bottle_content), 'breast_milk'),
      amountMl: nullable(readNumber),
      amountLeftMl: nullable(readNumber),
    }),
  }),
  solids: objectOf({
    ...base,
    type: literal('solids'),
    details: detailsOf<SolidsDetails>({
      foods: listOf(readString),
      amount: nullable(oneOf(ENUMS.solids_amount)),
      reaction: nullable(oneOf(ENUMS.solids_reaction)),
    }),
  }),
  nappy: objectOf({
    ...base,
    type: literal('nappy'),
    details: detailsOf<Omit<NappyDetails, 'typePending'>>({
      wet: flag,
      dirty: flag,
      wetSize: nullable(oneOf(ENUMS.size)),
      pooSize: nullable(oneOf(ENUMS.size)),
      pooColours: listOf(oneOf(ENUMS.poo_colour)),
      pooTextures: listOf(oneOf(ENUMS.poo_texture)),
      rash: flag,
    }),
  }),
  pump: objectOf({
    ...base,
    type: literal('pump'),
    segments: listOf(segment),
    details: detailsOf<PumpDetails>({
      leftMl: nullable(readNumber),
      rightMl: nullable(readNumber),
      totalMl: nullable(readNumber),
    }),
  }),
  growth: objectOf({
    ...base,
    type: literal('growth'),
    details: detailsOf<GrowthDetails>({
      weightG: nullable(readNumber),
      lengthMm: nullable(readNumber),
      headCircumferenceMm: nullable(readNumber),
    }),
  }),
  custom: objectOf({
    ...base,
    type: literal('custom'),
    details: objectOf<CustomDetails>({ title: readString, description: absentAs(readString, '') }),
  }),
};

export function readExportedDraft(raw: Record<string, unknown>): EventDraft | undefined {
  const type = raw.type;
  return typeof type === 'string' && isEventType(type) ? READERS[type](raw) : undefined;
}
