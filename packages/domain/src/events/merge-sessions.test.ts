import { describe, expect, it } from 'vitest';
import { makeEvent } from './test-events';
import {
  liveMergeOffer,
  liveMergeText,
  mergeableSessions,
  mergeCandidate,
  mergeCopy,
  mergeGapText,
  resumeCopy,
  MERGE_WITHIN_MS,
} from './merge-sessions';

const feed = (id: string, startedAt: string, endedAt: string | null, overrides = {}) =>
  makeEvent('breast_feed', { id, startedAt, endedAt, segments: [], ...overrides });
const sleep = (id: string, startedAt: string, endedAt: string | null, overrides = {}) =>
  makeEvent('sleep', { id, startedAt, endedAt, segments: [], ...overrides });

describe('mergeCandidate', () => {
  const first = feed('a', '2026-10-06T10:00:00Z', '2026-10-06T10:20:00Z');

  it('offers a merge when the next feed starts within 20 minutes', () => {
    expect(mergeCandidate(first, feed('b', '2026-10-06T10:32:00Z', '2026-10-06T10:40:00Z'))).toEqual({
      type: 'breast_feed',
      earlierId: 'a',
      laterId: 'b',
      gapMs: 12 * 60_000,
    });
    expect(mergeCandidate(first, feed('b', '2026-10-06T10:40:00Z', null))?.gapMs).toBe(MERGE_WITHIN_MS);
  });

  it('offers a merge when the next sleep starts within 20 minutes', () => {
    const nap = sleep('a', '2026-10-06T10:00:00Z', '2026-10-06T10:40:00Z');
    expect(mergeCandidate(nap, sleep('b', '2026-10-06T10:45:00Z', null))).toEqual({
      type: 'sleep',
      earlierId: 'a',
      laterId: 'b',
      gapMs: 5 * 60_000,
    });
    expect(mergeCandidate(nap, sleep('b', '2026-10-06T11:01:00Z', null))).toBeNull();
  });

  it('offers a merge when the next one starts before the first ended', () => {
    expect(mergeCandidate(first, feed('b', '2026-10-06T10:15:00Z', '2026-10-06T10:30:00Z'))).toMatchObject({
      laterId: 'b',
      gapMs: -5 * 60_000,
    });
    expect(mergeCandidate(first, feed('b', '2026-10-06T10:19:00Z', null))?.gapMs).toBe(-60_000);
  });

  it('refuses feeds too far apart, inside or before the first, running first, bottles, deleted, other babies or mixed types', () => {
    expect(mergeCandidate(first, feed('b', '2026-10-06T10:41:00Z', null))).toBeNull();
    expect(mergeCandidate(first, feed('b', '2026-10-06T10:05:00Z', '2026-10-06T10:10:00Z'))).toBeNull();
    expect(mergeCandidate(first, feed('b', '2026-10-06T10:00:00Z', null))).toBeNull();
    expect(mergeCandidate(first, feed('b', '2026-10-06T09:55:00Z', null))).toBeNull();
    expect(mergeCandidate(feed('a', '2026-10-06T10:00:00Z', null), feed('b', '2026-10-06T10:05:00Z', null))).toBeNull();
    expect(mergeCandidate(first, makeEvent('bottle', { id: 'b', startedAt: '2026-10-06T10:25:00Z' }))).toBeNull();
    expect(
      mergeCandidate(first, feed('b', '2026-10-06T10:25:00Z', null, { deletedAt: '2026-10-06T10:26:00Z' })),
    ).toBeNull();
    expect(mergeCandidate(first, feed('b', '2026-10-06T10:25:00Z', null, { babyId: 'other' }))).toBeNull();
    expect(mergeCandidate(first, sleep('b', '2026-10-06T10:25:00Z', null))).toBeNull();
  });
});

describe('mergeableSessions', () => {
  it('pairs each feed or sleep with the one of the same kind just before it', () => {
    const events = [
      feed('c', '2026-10-06T13:00:00Z', '2026-10-06T13:10:00Z'),
      feed('a', '2026-10-06T10:00:00Z', '2026-10-06T10:20:00Z'),
      makeEvent('bottle', { id: 'bottle', startedAt: '2026-10-06T10:22:00Z' }),
      sleep('nap-2', '2026-10-06T10:50:00Z', '2026-10-06T11:30:00Z'),
      feed('b', '2026-10-06T10:25:00Z', '2026-10-06T10:40:00Z'),
      sleep('nap-1', '2026-10-06T10:20:00Z', '2026-10-06T10:30:00Z'),
    ];
    const merges = mergeableSessions(events);
    expect([...merges.keys()].sort()).toEqual(['b', 'nap-2']);
    expect(merges.get('b')).toMatchObject({ type: 'breast_feed', earlierId: 'a', gapMs: 5 * 60_000 });
    expect(merges.get('nap-2')).toMatchObject({ type: 'sleep', earlierId: 'nap-1', gapMs: 20 * 60_000 });
  });
});

describe('liveMergeOffer', () => {
  it('offers to merge a running feed into the one just before it', () => {
    const running = feed('now', '2026-10-06T10:28:00Z', null);
    const events = [
      feed('old', '2026-10-06T07:00:00Z', '2026-10-06T07:20:00Z'),
      feed('a', '2026-10-06T10:00:00Z', '2026-10-06T10:20:00Z'),
    ];
    expect(liveMergeOffer(running, events)).toMatchObject({ earlierId: 'a', laterId: 'now', gapMs: 8 * 60_000 });
    expect(liveMergeOffer(running, [events[0]!])).toBeNull();
    expect(liveMergeOffer(feed('done', '2026-10-06T10:28:00Z', '2026-10-06T10:30:00Z'), events)).toBeNull();
  });

  it('offers to merge a running sleep into the last sleep, not a feed', () => {
    const running = sleep('now', '2026-10-06T10:28:00Z', null);
    const events = [
      sleep('nap', '2026-10-06T09:30:00Z', '2026-10-06T10:15:00Z'),
      feed('a', '2026-10-06T10:20:00Z', '2026-10-06T10:25:00Z'),
    ];
    expect(liveMergeOffer(running, events)).toMatchObject({ type: 'sleep', earlierId: 'nap', gapMs: 13 * 60_000 });
  });
});

describe('merge text', () => {
  it('describes the gap', () => {
    expect(mergeGapText(12 * 60_000)).toBe('12m apart');
    expect(mergeGapText(20_000)).toBe('Under a minute apart');
    expect(mergeGapText(-12 * 60_000)).toBe('Overlaps by 12m');
    expect(mergeGapText(-20_000)).toBe('Overlaps by under a minute');
    const merge = { earlierId: 'a', laterId: 'b' };
    expect(liveMergeText({ ...merge, type: 'breast_feed', gapMs: 8 * 60_000 })).toBe('Started 8m after the last feed');
    expect(liveMergeText({ ...merge, type: 'breast_feed', gapMs: 0 })).toBe('Started straight after the last feed');
    expect(liveMergeText({ ...merge, type: 'sleep', gapMs: 8 * 60_000 })).toBe('Started 8m after the last sleep');
    expect(liveMergeText({ ...merge, type: 'sleep', gapMs: -5 * 60_000 })).toBe('Started before the last sleep ended');
  });

  it('names what is being merged', () => {
    expect(mergeCopy('breast_feed').title).toBe('Merge feeds');
    expect(mergeCopy('sleep').title).toBe('Merge sleeps');
    expect(mergeCopy('sleep').confirm).toMatch(/awake/);
  });

  it('names what is being resumed and for how long', () => {
    expect(resumeCopy('breast_feed')).toEqual({
      action: 'Resume feed',
      hint: 'Resume only appears on the most recent feed, for 20 minutes after it ends.',
    });
    expect(resumeCopy('sleep').action).toBe('Resume sleep');
  });
});
