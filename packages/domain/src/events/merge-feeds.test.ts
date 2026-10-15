import { describe, expect, it } from 'vitest';
import { makeEvent } from './test-events';
import {
  liveMergeOffer,
  liveMergeText,
  mergeableFeeds,
  mergeCandidate,
  mergeGapText,
  MERGE_FEEDS_WITHIN_MS,
} from './merge-feeds';

const feed = (id: string, startedAt: string, endedAt: string | null, overrides = {}) =>
  makeEvent('breast_feed', { id, startedAt, endedAt, segments: [], ...overrides });

describe('mergeCandidate', () => {
  const first = feed('a', '2026-10-06T10:00:00Z', '2026-10-06T10:20:00Z');

  it('offers a merge when the next feed starts within 30 minutes', () => {
    expect(mergeCandidate(first, feed('b', '2026-10-06T10:32:00Z', '2026-10-06T10:40:00Z'))).toEqual({
      earlierId: 'a',
      laterId: 'b',
      gapMs: 12 * 60_000,
    });
    expect(mergeCandidate(first, feed('b', '2026-10-06T10:50:00Z', null))?.gapMs).toBe(MERGE_FEEDS_WITHIN_MS);
  });

  it('refuses feeds too far apart, overlapping, running first, bottles, deleted or other babies', () => {
    expect(mergeCandidate(first, feed('b', '2026-10-06T10:51:00Z', null))).toBeNull();
    expect(mergeCandidate(first, feed('b', '2026-10-06T10:19:00Z', null))).toBeNull();
    expect(mergeCandidate(feed('a', '2026-10-06T10:00:00Z', null), feed('b', '2026-10-06T10:05:00Z', null))).toBeNull();
    expect(mergeCandidate(first, makeEvent('bottle', { id: 'b', startedAt: '2026-10-06T10:25:00Z' }))).toBeNull();
    expect(
      mergeCandidate(first, feed('b', '2026-10-06T10:25:00Z', null, { deletedAt: '2026-10-06T10:26:00Z' })),
    ).toBeNull();
    expect(mergeCandidate(first, feed('b', '2026-10-06T10:25:00Z', null, { babyId: 'other' }))).toBeNull();
  });
});

describe('mergeableFeeds', () => {
  it('pairs each feed with the breastfeed just before it, ignoring other entries', () => {
    const events = [
      feed('c', '2026-10-06T13:00:00Z', '2026-10-06T13:10:00Z'),
      feed('a', '2026-10-06T10:00:00Z', '2026-10-06T10:20:00Z'),
      makeEvent('bottle', { id: 'bottle', startedAt: '2026-10-06T10:22:00Z' }),
      feed('b', '2026-10-06T10:25:00Z', '2026-10-06T10:40:00Z'),
    ];
    const merges = mergeableFeeds(events);
    expect([...merges.keys()]).toEqual(['b']);
    expect(merges.get('b')).toMatchObject({ earlierId: 'a', gapMs: 5 * 60_000 });
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
});

describe('merge text', () => {
  it('describes the gap', () => {
    expect(mergeGapText(12 * 60_000)).toBe('12m apart');
    expect(mergeGapText(20_000)).toBe('Under a minute apart');
    expect(liveMergeText(8 * 60_000)).toBe('Started 8m after the last feed');
    expect(liveMergeText(0)).toBe('Started straight after the last feed');
  });
});
