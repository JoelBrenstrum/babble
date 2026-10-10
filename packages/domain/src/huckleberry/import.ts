import { parseCsv } from '../csv/parse-csv';
import type {
  BottleContent,
  EventDraft,
  FallAsleep,
  Mood,
  PooColour,
  PooTexture,
  Side,
  Size,
  SleepLocation,
  SolidsReaction,
  TimedSegment,
} from '../events/types';
import { addFood } from '../events/foods';
import { zonedToUtc } from '../time/zoned';

export const HUCKLEBERRY_HEADER = [
  'Type',
  'Start',
  'End',
  'Duration',
  'Start Condition',
  'Start Location',
  'End Condition',
  'Notes',
  'Logged By',
] as const;

export type ImportedEvent = EventDraft & { sourceRef: string; line: number };

export interface SkippedRow {
  line: number;
  type: string;
  reason: string;
}

export interface ImportWarning {
  line: number;
  message: string;
}

export interface HuckleberryImport {
  events: ImportedEvent[];
  skipped: SkippedRow[];
  warnings: ImportWarning[];
}

export class HuckleberryCsvError extends Error {}

interface Row {
  line: number;
  type: string;
  start: string;
  end: string;
  duration: string;
  startCondition: string;
  startLocation: string;
  endCondition: string;
  notes: string;
}

interface RowContext {
  row: Row;
  startedAt: Date;
  endedAt: Date | null;
  notes: string | null;
  warn: (message: string) => void;
}

type MapResult = EventDraft | { skip: string };

const ACTIVITY_TYPES = new Set(['Tummy time', 'Bath']);

function lookup<T>(table: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}

export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

const UNSUPPORTED_TYPES: Record<string, string> = {
  Potty: 'Potty tracking is not supported',
  Temp: 'Temperature tracking is not supported',
  Medicine: 'Medicine tracking is not supported',
  Medication: 'Medicine tracking is not supported',
};

const QUANTITY_SIZES: Record<string, Size> = {
  small: 'little',
  medium: 'medium',
  large: 'large',
};

const POO_COLOURS: Record<string, PooColour> = {
  yellow: 'yellow',
  brown: 'brown',
  black: 'black',
  green: 'green',
  red: 'red',
  gray: 'white_grey',
  grey: 'white_grey',
  white: 'white_grey',
};

const POO_TEXTURES: Record<string, PooTexture> = {
  runny: 'runny',
  loose: 'loose',
  seedy: 'seedy',
  pasty: 'pasty',
  solid: 'formed',
  formed: 'formed',
  mucousy: 'mucousy',
  hard: 'solid',
  pebbles: 'pebbles',
  diarrhea: 'diarrhea',
};

const BOTTLE_CONTENTS: Record<string, BottleContent> = {
  'breast milk': 'breast_milk',
  formula: 'formula',
};

const SLEEP_LOCATIONS: Record<string, SleepLocation> = {
  swing: 'swing',
  car: 'car',
  'worn or held': 'held',
  nursing: 'nursing',
  stroller: 'pram',
  'on own in bed': 'cot',
  bottle: 'bottle',
  'co sleep': 'co_sleep',
  'next to carer': 'next_to_carer',
};

const FALL_ASLEEP: Record<string, FallAsleep> = {
  under_10_minutes: 'under_10_min',
  '10-20_minutes': '10_to_20_min',
  'long time to fall asleep': 'long_time',
};

const MOODS = new Set<Mood>(['happy', 'upset']);

export function parseHuckleberryCsv(text: string, options: { timeZone: string }): HuckleberryImport {
  const [header, ...records] = parseCsv(text);
  if (!header || HUCKLEBERRY_HEADER.some((name, i) => header[i]?.trim() !== name)) {
    throw new HuckleberryCsvError('This does not look like a Huckleberry CSV export');
  }

  const result: HuckleberryImport = { events: [], skipped: [], warnings: [] };
  const seenKeys = new Map<string, number>();

  records.forEach((record, index) => {
    if (record.every((field) => field.trim() === '')) return;
    const row = toRow(record, index + 2);

    const key = record.join('\u0001');
    const occurrence = seenKeys.get(key) ?? 0;
    seenKeys.set(key, occurrence + 1);

    const mapped = mapRow(row, options.timeZone, (message) => result.warnings.push({ line: row.line, message }));
    if ('skip' in mapped) {
      result.skipped.push({ line: row.line, type: row.type, reason: mapped.skip });
    } else {
      result.events.push({ ...mapped, sourceRef: `${hash(key)}-${occurrence}`, line: row.line });
    }
  });

  return result;
}

function toRow(record: string[], line: number): Row {
  const field = (i: number) => (record[i] ?? '').trim();
  return {
    line,
    type: field(0),
    start: field(1),
    end: field(2),
    duration: field(3),
    startCondition: field(4),
    startLocation: field(5),
    endCondition: field(6),
    notes: record[7] ?? '',
  };
}

function mapRow(row: Row, timeZone: string, warn: (message: string) => void): MapResult {
  const unsupported = lookup(UNSUPPORTED_TYPES, row.type);
  if (unsupported) return { skip: unsupported };

  const startedAt = parseLocalTime(row.start, timeZone);
  if (!startedAt) return { skip: `Invalid start time "${row.start}"` };

  const durationMs = parseHoursMinutes(row.duration);
  const endedAt =
    parseLocalTime(row.end, timeZone) ?? (durationMs !== null ? new Date(startedAt.getTime() + durationMs) : null);

  const context: RowContext = { row, startedAt, endedAt, notes: parseNotes(row.notes), warn };

  switch (row.type) {
    case 'Feed':
      return mapFeed(context);
    case 'Diaper':
      return mapDiaper(context);
    case 'Sleep':
      return mapSleep(context);
    case 'Pump':
      return mapPump(context);
    case 'Growth':
      return mapGrowth(context);
    case 'Solids':
      return mapSolids(context);
    default:
      if (ACTIVITY_TYPES.has(row.type)) return mapActivity(context);
      return { skip: `Unsupported type "${row.type}"` };
  }
}

function mapFeed(context: RowContext): MapResult {
  const { row } = context;
  if (row.startLocation === 'Breast') return mapBreastFeed(context);
  if (row.startLocation === 'Bottle') return mapBottle(context);
  return { skip: `Unknown feed kind "${row.startLocation}"` };
}

function mapBreastFeed({ row, startedAt, notes, warn }: RowContext): MapResult {
  const sides = [row.startCondition, row.endCondition]
    .filter((value) => value !== '')
    .map((value) => {
      const side = parseSideDuration(value);
      if (!side) warn(`Unrecognised breast side duration "${value}"`);
      return side;
    })
    .filter((side) => side !== null);

  if (sides.length === 0) return { skip: 'Breast feed has no side durations' };

  const segments: TimedSegment[] = [];
  let cursor = startedAt.getTime();
  for (const { side, durationMs } of sides) {
    if (durationMs === 0) continue;
    segments.push({
      side,
      startedAt: new Date(cursor).toISOString(),
      endedAt: new Date(cursor + durationMs).toISOString(),
    });
    cursor += durationMs;
  }

  return {
    type: 'breast_feed',
    startedAt: startedAt.toISOString(),
    endedAt: new Date(cursor).toISOString(),
    notes,
    segments,
  };
}

function mapBottle({ row, startedAt, endedAt, notes, warn }: RowContext): MapResult {
  const content = lookup(BOTTLE_CONTENTS, row.startCondition.toLowerCase()) ?? 'other';
  if (content === 'other' && row.startCondition !== '') {
    warn(`Bottle type "${row.startCondition}" imported as other`);
  }

  const amountMl = parseVolumeMl(row.endCondition);
  if (amountMl === null && row.endCondition !== '') warn(`Unrecognised bottle amount "${row.endCondition}"`);

  return {
    type: 'bottle',
    ...instantOrInterval(startedAt, endedAt),
    notes,
    details: { content, amountMl, amountLeftMl: null },
  };
}

function mapDiaper({ row, startedAt, notes, warn }: RowContext): MapResult {
  const match = /^(pee|poo|both|dry)\b[\s,:]*(.*)$/is.exec(row.endCondition);
  if (!match) return { skip: `Unrecognised diaper contents "${row.endCondition}"` };

  const mode = match[1]!.toLowerCase();
  const rest = match[2]!.toLowerCase();
  const wet = mode === 'pee' || mode === 'both';
  const dirty = mode === 'poo' || mode === 'both';

  const quantities: { pee?: string; poo?: string } = {};
  if (mode === 'pee' && rest) quantities.pee = rest;
  if (mode === 'poo' && rest) quantities.poo = rest;
  if (mode === 'both') {
    for (const [, kind, size] of rest.matchAll(/(pee|poo):\s*(\w+)/g)) {
      quantities[kind as 'pee' | 'poo'] = size;
    }
  }

  const toSize = (value: string | undefined) => {
    if (value === undefined) return null;
    const size = lookup(QUANTITY_SIZES, value);
    if (!size) warn(`Unrecognised diaper quantity "${value}"`);
    return size ?? null;
  };

  const pooColours: PooColour[] = [];
  if (row.duration !== '') {
    const colour = lookup(POO_COLOURS, row.duration.toLowerCase());
    if (colour) pooColours.push(colour);
    else warn(`Unrecognised poo colour "${row.duration}"`);
  }

  const pooTextures: PooTexture[] = [];
  for (const token of splitList(row.startCondition)) {
    const texture = lookup(POO_TEXTURES, token);
    if (texture) pooTextures.push(texture);
    else warn(`Unrecognised poo texture "${token}"`);
  }

  return {
    type: 'nappy',
    startedAt: startedAt.toISOString(),
    endedAt: startedAt.toISOString(),
    notes,
    details: {
      wet,
      dirty,
      wetSize: toSize(quantities.pee),
      pooSize: toSize(quantities.poo),
      pooColours,
      pooTextures,
      rash: row.startLocation.toLowerCase() === 'diaper rash',
    },
  };
}

function mapSleep({ row, startedAt, endedAt, notes, warn }: RowContext): MapResult {
  if (!endedAt) return { skip: 'Sleep has no end time' };

  const fallAsleepValues: FallAsleep[] = [];
  const startMoods: Mood[] = [];
  for (const token of splitList(row.startCondition)) {
    const fallAsleep = lookup(FALL_ASLEEP, token);
    if (fallAsleep) fallAsleepValues.push(fallAsleep);
    else if (MOODS.has(token as Mood)) startMoods.push(token as Mood);
    else warn(`Unrecognised sleep start condition "${token}"`);
  }
  if (fallAsleepValues.length > 1) {
    warn(`Multiple fall-asleep times recorded; kept "${fallAsleepValues[0]}"`);
  }

  const locations: SleepLocation[] = [];
  for (const token of splitList(row.startLocation)) {
    const location = lookup(SLEEP_LOCATIONS, token);
    if (location) locations.push(location);
    else warn(`Unrecognised sleep location "${token}"`);
  }

  const endMoods: Mood[] = [];
  let wokenByCarer = false;
  for (const token of splitList(row.endCondition)) {
    if (token === 'woke up child') wokenByCarer = true;
    else if (MOODS.has(token as Mood)) endMoods.push(token as Mood);
    else warn(`Unrecognised sleep end condition "${token}"`);
  }

  return {
    type: 'sleep',
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    notes,
    details: {
      locations,
      fallAsleep: fallAsleepValues[0] ?? null,
      startMoods,
      endMoods,
      wokenByCarer,
    },
    segments: [],
  };
}

function mapPump({ row, startedAt, endedAt, notes, warn }: RowContext): MapResult {
  const leftMl = parseOptional(row.startCondition, parseVolumeMl, 'left pump amount', warn);
  const rightMl = parseOptional(row.endCondition, parseVolumeMl, 'right pump amount', warn);

  return {
    type: 'pump',
    ...instantOrInterval(startedAt, endedAt),
    notes,
    segments: [],
    details: { leftMl, rightMl, totalMl: null },
  };
}

function mapGrowth({ row, startedAt, notes, warn }: RowContext): MapResult {
  const weightG = parseOptional(row.startCondition, parseWeightG, 'weight', warn);
  const lengthMm = parseOptional(row.startLocation, parseLengthMm, 'length', warn);
  const headCircumferenceMm = parseOptional(row.endCondition, parseLengthMm, 'head circumference', warn);

  if (weightG === null && lengthMm === null && headCircumferenceMm === null) {
    return { skip: 'Growth entry has no measurements' };
  }

  return {
    type: 'growth',
    startedAt: startedAt.toISOString(),
    endedAt: startedAt.toISOString(),
    notes,
    details: { weightG, lengthMm, headCircumferenceMm },
  };
}

const SOLIDS_REACTIONS: Record<string, SolidsReaction> = {
  loved: 'loved',
  liked: 'liked',
  meh: 'unsure',
  neutral: 'unsure',
  disliked: 'disliked',
  hated: 'disliked',
};

function mapSolids({ row, startedAt, notes, warn }: RowContext): MapResult {
  const items = row.startCondition
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const foods = items.reduce<string[]>((list, item) => {
    const name = item.replace(/^\d+(\.\d+)?\s+of\s+/i, '');
    return addFood(list, name.charAt(0).toUpperCase() + name.slice(1));
  }, []);
  if (foods.length === 0) return { skip: 'Solids entry has no foods' };

  const reactionText = row.endCondition.trim();
  const reaction = reactionText ? (lookup(SOLIDS_REACTIONS, reactionText.toLowerCase()) ?? null) : null;
  if (reactionText && !reaction) warn(`Unrecognised solids reaction "${reactionText}"; kept in notes`);
  const amounts = items.some((item) => /^\d/.test(item)) ? row.startCondition.trim() : null;
  const extra = [amounts, reactionText && !reaction ? `Reaction: ${reactionText}` : null, notes];

  return {
    type: 'solids',
    startedAt: startedAt.toISOString(),
    endedAt: startedAt.toISOString(),
    notes: extra.filter((part): part is string => !!part).join('\n') || null,
    details: { foods, amount: null, reaction },
  };
}

function mapActivity({ row, startedAt, endedAt, notes }: RowContext): MapResult {
  return {
    type: 'custom',
    ...instantOrInterval(startedAt, endedAt),
    notes,
    details: { title: row.type, description: '' },
  };
}

function instantOrInterval(startedAt: Date, endedAt: Date | null) {
  return { startedAt: startedAt.toISOString(), endedAt: (endedAt ?? startedAt).toISOString() };
}

function parseOptional(
  value: string,
  parse: (value: string) => number | null,
  label: string,
  warn: (message: string) => void,
): number | null {
  if (value === '') return null;
  const parsed = parse(value);
  if (parsed === null) warn(`Unrecognised ${label} "${value}"`);
  return parsed;
}

export function parseLocalTime(value: string, timeZone: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [number, number, number, number, number];
  return zonedToUtc({ year, month, day, hour, minute }, timeZone);
}

export function parseHoursMinutes(value: string): number | null {
  const match = /^(\d+):(\d{2})$/.exec(value);
  if (!match) return null;
  return (Number(match[1]) * 60 + Number(match[2])) * 60_000;
}

export function parseSideDuration(value: string): { side: Side; durationMs: number } | null {
  const match = /^(\d+:\d{2})([LR])$/i.exec(value);
  if (!match) return null;
  return {
    side: match[2]!.toUpperCase() === 'L' ? 'left' : 'right',
    durationMs: parseHoursMinutes(match[1]!)!,
  };
}

export function parseVolumeMl(value: string): number | null {
  const match = /^(\d+(?:\.\d+)?)\s*(ml|oz)$/i.exec(value);
  if (!match) return null;
  const amount = Number(match[1]);
  return match[2]!.toLowerCase() === 'oz' ? Math.round(amount * 29.5735) : amount;
}

export function parseWeightG(value: string): number | null {
  const match = /^(\d+(?:\.\d+)?)\s*(kg|g|lbs?)$/i.exec(value);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  if (unit === 'kg') return Math.round(amount * 1000);
  if (unit === 'g') return Math.round(amount);
  return Math.round(amount * 453.592);
}

export function parseLengthMm(value: string): number | null {
  const match = /^(\d+(?:\.\d+)?)\s*(cm|mm|in)$/i.exec(value);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  if (unit === 'cm') return Math.round(amount * 10);
  if (unit === 'mm') return Math.round(amount);
  return Math.round(amount * 25.4);
}

// Huckleberry writes newlines in notes as a literal backslash-n.
function parseNotes(value: string): string | null {
  const notes = value.replace(/\\n/g, '\n').trim();
  return notes === '' ? null : notes;
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token !== '');
}

function hash(value: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}
