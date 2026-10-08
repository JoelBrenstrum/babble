import type { DraftOfType, EventDraft, EventType } from './types';

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
  return draft.type === 'nappy' || draft.type === 'growth';
}
