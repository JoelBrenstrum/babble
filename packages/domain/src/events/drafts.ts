import { MINUTE_MS } from '../time/constants';
import { ms } from '../time/instants';
import type { BabyEvent, DraftOfType, EventDraft, EventType, Stretch } from './types';

export function emptyDraft<T extends EventType>(type: T, now: Date): DraftOfType<T> {
  const at = now.toISOString();
  const base = { startedAt: at, endedAt: at, notes: null };
  const drafts: { [K in EventType]: DraftOfType<K> } = {
    sleep: {
      ...base,
      type: 'sleep',
      details: { locations: [], fallAsleep: null, startMoods: [], endMoods: [], wokenByCarer: false },
      segments: [],
    },
    breast_feed: { ...base, type: 'breast_feed', segments: [] },
    bottle: { ...base, type: 'bottle', details: { content: 'breast_milk', amountMl: null, amountLeftMl: null } },
    solids: { ...base, type: 'solids', details: { foods: [], amount: null, reaction: null } },
    nappy: {
      ...base,
      type: 'nappy',
      details: {
        wet: false,
        dirty: false,
        wetSize: null,
        pooSize: null,
        pooColours: [],
        pooTextures: [],
        rash: false,
        typePending: true,
      },
    },
    pump: { ...base, type: 'pump', segments: [], details: { leftMl: null, rightMl: null, totalMl: null } },
    growth: { ...base, type: 'growth', details: { weightG: null, lengthMm: null, headCircumferenceMm: null } },
    custom: { ...base, type: 'custom', details: { title: '', description: '' } },
  };
  return drafts[type];
}

export function isInstant(draft: Pick<EventDraft, 'type'>): boolean {
  return draft.type === 'nappy' || draft.type === 'growth' || draft.type === 'solids';
}

export function eventToDraft(event: BabyEvent): EventDraft {
  const base = { startedAt: event.startedAt, endedAt: event.endedAt, notes: event.notes };
  switch (event.type) {
    case 'sleep':
      return { ...base, type: 'sleep', details: event.details, segments: event.segments };
    case 'breast_feed':
      return { ...base, type: 'breast_feed', segments: event.segments };
    case 'bottle':
      return { ...base, type: 'bottle', details: event.details };
    case 'solids':
      return { ...base, type: 'solids', details: event.details };
    case 'nappy':
      return { ...base, type: 'nappy', details: event.details };
    case 'pump':
      return { ...base, type: 'pump', details: event.details, segments: event.segments };
    case 'growth':
      return { ...base, type: 'growth', details: event.details };
    case 'custom':
      return { ...base, type: 'custom', details: event.details };
  }
}

function hasDraftSegments<D extends EventDraft>(draft: D): draft is D & { segments: Stretch[] } {
  return 'segments' in draft;
}

export function shiftDraftStart<D extends EventDraft>(draft: D, startedAt: string): D {
  const delta = ms(startedAt) - ms(draft.startedAt);
  const shift = (iso: string) => new Date(ms(iso) + delta).toISOString();
  const shifted = { ...draft, startedAt, endedAt: draft.endedAt === null ? null : shift(draft.endedAt) };
  if (!hasDraftSegments(shifted)) return shifted;
  return {
    ...shifted,
    segments: shifted.segments.map((segment) => ({
      ...segment,
      startedAt: shift(segment.startedAt),
      endedAt: segment.endedAt === null ? null : shift(segment.endedAt),
    })),
  };
}

export function instantDraft<D extends EventDraft>(draft: D, at: string): D {
  return { ...draft, startedAt: at, endedAt: at };
}

const PAST_SLEEP_MINUTES = 60;
const PAST_SESSION_MINUTES = 20;

export function pastDraft(type: EventType, now: Date): EventDraft {
  const draft = emptyDraft(type, now);
  const earlier = (minutes: number) => new Date(now.getTime() - minutes * MINUTE_MS).toISOString();
  if (type === 'sleep') return { ...draft, startedAt: earlier(PAST_SLEEP_MINUTES) };
  if (type === 'breast_feed' || type === 'pump') {
    return { ...draft, startedAt: earlier(PAST_SESSION_MINUTES), endedAt: earlier(PAST_SESSION_MINUTES) };
  }
  return draft;
}
