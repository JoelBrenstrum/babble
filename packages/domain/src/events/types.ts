export type Side = 'left' | 'right';

export type Size = 'tiny' | 'little' | 'medium' | 'large' | 'massive';

export type PooColour =
  | 'yellow'
  | 'mustard'
  | 'green'
  | 'dark_green'
  | 'brown'
  | 'orange'
  | 'black'
  | 'red'
  | 'white_grey';

export type PooTexture =
  | 'runny'
  | 'loose'
  | 'seedy'
  | 'pasty'
  | 'formed'
  | 'mucousy'
  | 'hard'
  | 'pebbles'
  | 'diarrhea';

export type BottleContent = 'breast_milk' | 'formula' | 'mixed' | 'other';

export type SleepLocation =
  | 'cot'
  | 'bassinet'
  | 'pram'
  | 'car'
  | 'swing'
  | 'held'
  | 'nursing'
  | 'bottle'
  | 'co_sleep'
  | 'next_to_carer'
  | 'other';

export type FallAsleep = 'under_10_min' | '10_to_20_min' | 'long_time';

export type Mood = 'happy' | 'upset';

export interface TimedSegment {
  side: Side;
  startedAt: string;
  endedAt: string;
}

export interface SleepDetails {
  locations: SleepLocation[];
  fallAsleep: FallAsleep | null;
  startMoods: Mood[];
  endMoods: Mood[];
  wokenByCarer: boolean;
}

export interface BottleDetails {
  content: BottleContent;
  amountMl: number | null;
  amountLeftMl: number | null;
}

export interface NappyDetails {
  wet: boolean;
  dirty: boolean;
  wetSize: Size | null;
  pooSize: Size | null;
  pooColours: PooColour[];
  pooTextures: PooTexture[];
  rash: boolean;
}

export interface PumpDetails {
  leftMl: number | null;
  rightMl: number | null;
  totalMl: number | null;
}

export interface GrowthDetails {
  weightG: number | null;
  lengthMm: number | null;
  headCircumferenceMm: number | null;
}

export interface CustomDetails {
  title: string;
  description: string;
}

interface EventBase {
  startedAt: string;
  endedAt: string | null;
  notes: string | null;
}

export type EventDraft =
  | (EventBase & { type: 'sleep'; details: SleepDetails })
  | (EventBase & { type: 'breast_feed'; segments: TimedSegment[] })
  | (EventBase & { type: 'bottle'; details: BottleDetails })
  | (EventBase & { type: 'nappy'; details: NappyDetails })
  | (EventBase & { type: 'pump'; details: PumpDetails; segments: TimedSegment[] })
  | (EventBase & { type: 'growth'; details: GrowthDetails })
  | (EventBase & { type: 'custom'; details: CustomDetails });

export type EventType = EventDraft['type'];
