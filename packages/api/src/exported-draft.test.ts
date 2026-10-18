import { emptyDraft, EVENT_TYPES, type EventDraft } from '@babble/domain';
import { describe, expect, it } from 'vitest';
import { readExportedDraft } from './exported-draft';
import { sampleEvents } from './fixtures';

const NOW = new Date('2026-10-09T02:00:00Z');

function raw(draft: EventDraft, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...(draft as unknown as Record<string, unknown>), ...overrides };
}

describe('readExportedDraft', () => {
  it.each(EVENT_TYPES)('reads an empty %s draft back unchanged', (type) => {
    const draft = emptyDraft(type, NOW);
    const expected =
      draft.type === 'nappy' ? { ...draft, details: { ...draft.details, typePending: undefined } } : draft;
    expect(readExportedDraft(raw(draft))).toEqual(expected);
  });

  it('keeps only the draft fields of an exported event', () => {
    for (const event of sampleEvents(NOW)) {
      const draft = readExportedDraft(raw(event));
      expect(draft).toBeDefined();
      expect(draft).not.toHaveProperty('id');
      expect(draft).not.toHaveProperty('createdBy');
      expect(draft).toMatchObject({ type: event.type, startedAt: event.startedAt, notes: event.notes });
    }
  });

  it('reads nested details and segments', () => {
    const [feed, sleep, nappy, bottle, pump] = sampleEvents(NOW);
    expect(readExportedDraft(raw(feed!))).toMatchObject({ segments: (feed as { segments: unknown }).segments });
    expect(readExportedDraft(raw(sleep!))).toMatchObject({
      details: { locations: ['cot'], fallAsleep: 'under_10_min' },
    });
    expect(readExportedDraft(raw(nappy!))).toMatchObject({ details: { pooColours: ['mustard', 'green'] } });
    expect(readExportedDraft(raw(bottle!))).toMatchObject({ details: { content: 'formula', amountMl: 90 } });
    expect(readExportedDraft(raw(pump!))).toMatchObject({ details: { leftMl: 50 }, segments: [] });
  });

  it.each([
    ['an unknown type', raw(emptyDraft('nappy', NOW), { type: 'teleport' })],
    ['a missing start', raw(emptyDraft('nappy', NOW), { startedAt: undefined })],
    ['a number for notes', raw(emptyDraft('nappy', NOW), { notes: 7 })],
    ['missing details', raw(emptyDraft('bottle', NOW), { details: undefined })],
    ['details that are a list', raw(emptyDraft('bottle', NOW), { details: [] })],
    [
      'an unknown bottle content',
      raw(emptyDraft('bottle', NOW), { details: { content: 'juice', amountMl: null, amountLeftMl: null } }),
    ],
    [
      'a string amount',
      raw(emptyDraft('bottle', NOW), { details: { content: 'formula', amountMl: '90', amountLeftMl: null } }),
    ],
    [
      'an unknown sleep location',
      raw(emptyDraft('sleep', NOW), { details: { ...emptyDraft('sleep', NOW).details, locations: ['moon'] } }),
    ],
    [
      'a segment without a side',
      raw(emptyDraft('breast_feed', NOW), { segments: [{ startedAt: NOW.toISOString(), endedAt: null }] }),
    ],
    ['segments that are not a list', raw(emptyDraft('breast_feed', NOW), { segments: {} })],
    ['a missing custom title', raw(emptyDraft('custom', NOW), { details: { description: '' } })],
  ])('rejects %s', (_, value) => {
    expect(readExportedDraft(value)).toBeUndefined();
  });

  it('drops fields it does not know, inside details too', () => {
    const draft = readExportedDraft(
      raw(emptyDraft('custom', NOW), { extra: 1, details: { title: 'Bath', description: '', colour: 'blue' } }),
    );
    expect(draft).toEqual({ ...emptyDraft('custom', NOW), details: { title: 'Bath', description: '' } });
  });
});
