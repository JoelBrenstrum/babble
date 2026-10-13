import { describe, expect, it } from 'vitest';
import { hasSegments, lastSegmentEnd, mapSegments, otherSide, segmentTotals } from './segments';
import { makeEvent } from './test-events';

const seg = (side: 'left' | 'right', start: string, end: string | null) => ({
  side,
  startedAt: `2026-10-06T${start}:00Z`,
  endedAt: end && `2026-10-06T${end}:00Z`,
});

describe('lastSegmentEnd', () => {
  it('is null with no segments', () => {
    expect(lastSegmentEnd({ segments: [] })).toBeNull();
  });

  it('is the latest end, whatever the order', () => {
    const segments = [seg('right', '10:20', '10:30'), seg('left', '10:00', '10:10')];
    expect(lastSegmentEnd({ segments })).toBe(Date.parse('2026-10-06T10:30:00Z'));
  });

  it('is null while any segment is still open', () => {
    expect(lastSegmentEnd({ segments: [seg('left', '10:00', '10:10'), seg('right', '10:20', null)] })).toBeNull();
  });
});

describe('hasSegments', () => {
  it('is true for sessions with segments only', () => {
    expect(hasSegments(makeEvent('sleep'))).toBe(true);
    expect(hasSegments(makeEvent('breast_feed'))).toBe(true);
    expect(hasSegments(makeEvent('pump'))).toBe(true);
    expect(hasSegments(makeEvent('bottle'))).toBe(false);
    expect(hasSegments(makeEvent('nappy'))).toBe(false);
  });
});

describe('mapSegments', () => {
  const drop = <S>(segments: S[]) => segments.slice(1);

  it('rewrites the segments of any segmented event', () => {
    const feed = makeEvent('breast_feed', {
      segments: [seg('left', '10:00', '10:10'), seg('right', '10:10', '10:20')],
    });
    const mapped = mapSegments(feed, drop);
    expect(mapped.type === 'breast_feed' && mapped.segments).toEqual([seg('right', '10:10', '10:20')]);
    const nap = makeEvent('sleep', { segments: [{ startedAt: '2026-10-06T10:00:00Z', endedAt: null }] });
    expect(mapSegments(nap, drop)).toMatchObject({ type: 'sleep', segments: [] });
  });

  it('leaves other events untouched', () => {
    const bottle = makeEvent('bottle');
    expect(mapSegments(bottle, drop)).toBe(bottle);
  });
});

describe('segmentTotals open segment', () => {
  it('names the open side and its start, or null when paused', () => {
    const now = new Date('2026-10-06T10:30:00Z');
    expect(segmentTotals([seg('left', '10:00', null)], now).open).toEqual({
      side: 'left',
      startedAt: '2026-10-06T10:00:00Z',
    });
    expect(segmentTotals([seg('left', '10:00', '10:10')], now).open).toBeNull();
    expect(segmentTotals([], now).open).toBeNull();
  });

  it('never reports a negative duration', () => {
    const totals = segmentTotals([seg('left', '10:10', '10:00')], new Date('2026-10-06T10:30:00Z'));
    expect(totals.activeMs).toBe(0);
  });
});

describe('otherSide', () => {
  it('flips', () => {
    expect(otherSide('left')).toBe('right');
    expect(otherSide('right')).toBe('left');
  });
});
