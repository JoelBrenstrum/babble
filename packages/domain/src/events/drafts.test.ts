import { describe, expect, it } from 'vitest';
import { emptyDraft, eventToDraft, instantDraft, isInstant, pastDraft, shiftDraftStart } from './drafts';
import { makeEvent } from './test-events';
import { EVENT_TYPES } from '../trackers';

const NOW = new Date('2026-10-06T12:00:00Z');

describe('emptyDraft', () => {
  it('starts every type at now with no notes', () => {
    for (const type of EVENT_TYPES) {
      expect(emptyDraft(type, NOW)).toMatchObject({
        type,
        startedAt: NOW.toISOString(),
        endedAt: NOW.toISOString(),
        notes: null,
      });
    }
  });

  it('starts a nappy undecided', () => {
    const draft = emptyDraft('nappy', NOW);
    expect(draft.details.typePending).toBe(true);
  });
});

describe('isInstant', () => {
  it('is true for nappies, growth and solids only', () => {
    expect(EVENT_TYPES.filter((type) => isInstant({ type }))).toEqual(
      EVENT_TYPES.filter((type) => ['nappy', 'growth', 'solids'].includes(type)),
    );
  });
});

describe('eventToDraft', () => {
  it.each(EVENT_TYPES)('keeps only the draft fields of a %s', (type) => {
    const event = makeEvent(type, { notes: 'a note' });
    const draft = eventToDraft(event);
    expect(draft.type).toBe(type);
    expect(draft.notes).toBe('a note');
    const allowed = ['type', 'startedAt', 'endedAt', 'notes', 'details', 'segments'];
    expect(Object.keys(draft).every((key) => allowed.includes(key))).toBe(true);
    expect(draft).toMatchObject({ startedAt: event.startedAt, endedAt: event.endedAt });
  });

  it('drops event metadata', () => {
    const draft = eventToDraft(makeEvent('bottle', { id: 'x', deletedAt: '2026-10-06T00:00:00Z' }));
    expect(draft).not.toHaveProperty('id');
    expect(draft).not.toHaveProperty('babyId');
    expect(draft).not.toHaveProperty('deletedAt');
    expect(draft).not.toHaveProperty('sessionState');
  });

  it('carries segments for sessions and details for the rest', () => {
    const segments = [{ side: 'left' as const, startedAt: '2026-10-06T10:00:00Z', endedAt: '2026-10-06T10:10:00Z' }];
    expect(eventToDraft(makeEvent('breast_feed', { segments }))).toMatchObject({ segments });
    expect(eventToDraft(makeEvent('breast_feed', { segments }))).not.toHaveProperty('details');
    expect(eventToDraft(makeEvent('pump', { segments }))).toMatchObject({ segments, details: expect.any(Object) });
    expect(eventToDraft(makeEvent('bottle'))).not.toHaveProperty('segments');
  });
});

describe('shiftDraftStart', () => {
  it('moves the end and every segment by the same amount', () => {
    const draft = {
      ...emptyDraft('breast_feed', NOW),
      startedAt: '2026-10-06T10:00:00.000Z',
      endedAt: '2026-10-06T10:30:00.000Z',
      segments: [
        { side: 'left' as const, startedAt: '2026-10-06T10:00:00.000Z', endedAt: '2026-10-06T10:10:00.000Z' },
        { side: 'right' as const, startedAt: '2026-10-06T10:15:00.000Z', endedAt: null },
      ],
    };
    expect(shiftDraftStart(draft, '2026-10-06T09:00:00.000Z')).toEqual({
      ...draft,
      startedAt: '2026-10-06T09:00:00.000Z',
      endedAt: '2026-10-06T09:30:00.000Z',
      segments: [
        { side: 'left', startedAt: '2026-10-06T09:00:00.000Z', endedAt: '2026-10-06T09:10:00.000Z' },
        { side: 'right', startedAt: '2026-10-06T09:15:00.000Z', endedAt: null },
      ],
    });
  });

  it('leaves an open end open and drafts without segments alone', () => {
    const draft = { ...emptyDraft('bottle', NOW), startedAt: '2026-10-06T10:00:00.000Z', endedAt: null };
    const shifted = shiftDraftStart(draft, '2026-10-06T10:05:00.000Z');
    expect(shifted).toEqual({ ...draft, startedAt: '2026-10-06T10:05:00.000Z' });
    expect(shifted).not.toHaveProperty('segments');
  });
});

describe('instantDraft', () => {
  it('sets start and end to the same moment', () => {
    expect(instantDraft(emptyDraft('nappy', NOW), '2026-10-06T08:00:00Z')).toMatchObject({
      startedAt: '2026-10-06T08:00:00Z',
      endedAt: '2026-10-06T08:00:00Z',
    });
  });
});

describe('pastDraft', () => {
  const minutesAgo = (draft: { startedAt: string }) => (NOW.getTime() - Date.parse(draft.startedAt)) / 60_000;

  it('starts a sleep an hour ago and leaves it open to an end', () => {
    const draft = pastDraft('sleep', NOW);
    expect(minutesAgo(draft)).toBe(60);
    expect(draft.endedAt).toBe(NOW.toISOString());
  });

  it('puts feeds and pumps twenty minutes ago as an instant', () => {
    for (const type of ['breast_feed', 'pump'] as const) {
      const draft = pastDraft(type, NOW);
      expect(minutesAgo(draft)).toBe(20);
      expect(draft.endedAt).toBe(draft.startedAt);
    }
  });

  it('leaves other types at now', () => {
    expect(pastDraft('bottle', NOW)).toEqual(emptyDraft('bottle', NOW));
  });
});
