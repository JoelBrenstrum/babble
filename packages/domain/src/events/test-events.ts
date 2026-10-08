import { emptyDraft } from './drafts';
import { withNappyType } from './nappy';
import type { BabyEvent, DraftOfType, EventDraft, EventMeta, EventType } from './types';

const META: EventMeta = {
  id: 'event-1',
  babyId: 'baby-1',
  createdBy: 'user-1',
  createdAt: '2026-10-06T00:00:00Z',
  updatedAt: '2026-10-06T00:00:00Z',
  deletedAt: null,
  source: 'manual',
  sessionState: null,
  endedBy: null,
  endRecordedAt: null,
};

export function makeEvent<T extends EventType>(
  type: T,
  overrides: Partial<DraftOfType<T>> & Partial<EventMeta> = {},
): Extract<BabyEvent, { type: T }> {
  const draft: EventDraft = emptyDraft(type, new Date('2026-10-06T10:00:00Z'));
  const saved = draft.type === 'nappy' ? { ...draft, details: withNappyType(draft.details, 'wet') } : draft;
  return { ...saved, ...META, ...overrides } as Extract<BabyEvent, { type: T }>;
}
