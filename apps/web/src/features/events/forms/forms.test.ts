import { emptyDraft } from '@babble/domain';
import { describe, expect, it } from 'vitest';
import { buildSegments } from './segment-form';
import { instantDraft, shiftDraftStart } from './shared';

const START = '2026-10-06T10:00:00.000Z';

describe('buildSegments', () => {
  it('lays sides back to back, left first', () => {
    expect(buildSegments(START, { left: 10, right: 12 })).toEqual([
      { side: 'left', startedAt: START, endedAt: '2026-10-06T10:10:00.000Z' },
      { side: 'right', startedAt: '2026-10-06T10:10:00.000Z', endedAt: '2026-10-06T10:22:00.000Z' },
    ]);
  });

  it('skips empty sides', () => {
    expect(buildSegments(START, { left: null, right: 8 })).toEqual([
      { side: 'right', startedAt: START, endedAt: '2026-10-06T10:08:00.000Z' },
    ]);
    expect(buildSegments(START, { left: 0, right: null })).toEqual([]);
  });
});

describe('shiftDraftStart', () => {
  it('moves the end and every segment with the start', () => {
    const draft = {
      ...emptyDraft('breast_feed', new Date(START)),
      startedAt: START,
      endedAt: '2026-10-06T10:22:00.000Z',
      segments: buildSegments(START, { left: 10, right: 12 }),
    };
    const shifted = shiftDraftStart(draft, '2026-10-06T09:00:00.000Z');
    expect(shifted.endedAt).toBe('2026-10-06T09:22:00.000Z');
    expect(shifted.segments.map((segment) => segment.startedAt)).toEqual([
      '2026-10-06T09:00:00.000Z',
      '2026-10-06T09:10:00.000Z',
    ]);
  });

  it('keeps an open end open', () => {
    const draft = { ...emptyDraft('sleep', new Date(START)), endedAt: null };
    expect(shiftDraftStart(draft, '2026-10-06T08:00:00.000Z').endedAt).toBeNull();
  });
});

describe('instantDraft', () => {
  it('sets start and end together', () => {
    expect(instantDraft(emptyDraft('nappy', new Date(START)), '2026-10-06T08:00:00.000Z')).toMatchObject({
      startedAt: '2026-10-06T08:00:00.000Z',
      endedAt: '2026-10-06T08:00:00.000Z',
    });
  });
});
