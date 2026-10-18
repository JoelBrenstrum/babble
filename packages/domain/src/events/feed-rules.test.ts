import { describe, expect, it } from 'vitest';
import { canResumeSession, feedEndTime, latestFeed, nextBreastSide, staleSessions } from './feed-rules';
import { makeEvent } from './test-events';

const NOW = new Date('2026-10-06T12:00:00Z');
const feed = makeEvent('breast_feed', {
  id: 'feed',
  startedAt: '2026-10-06T10:00:00Z',
  endedAt: '2026-10-06T10:20:00Z',
  segments: [{ side: 'left', startedAt: '2026-10-06T10:00:00Z', endedAt: '2026-10-06T10:20:00Z' }],
});
const bottle = makeEvent('bottle', { id: 'bottle', startedAt: '2026-10-06T11:00:00Z' });
const nap = makeEvent('sleep', { id: 'nap', startedAt: '2026-10-06T11:30:00Z', endedAt: null });

describe('latestFeed', () => {
  it('picks the newest breast or bottle feed', () => {
    expect(latestFeed([feed, bottle, nap])?.id).toBe('bottle');
    expect(latestFeed([feed, { ...bottle, deletedAt: '2026-10-06T11:05:00Z' }])?.id).toBe('feed');
  });
});

describe('canResumeSession', () => {
  const soon = new Date('2026-10-06T10:35:00Z');
  const endedNap = makeEvent('sleep', {
    id: 'ended-nap',
    startedAt: '2026-10-06T09:00:00Z',
    endedAt: '2026-10-06T10:25:00Z',
  });

  it('allows the latest finished breastfeed or sleep within 20 minutes of it ending', () => {
    expect(canResumeSession(feed, [feed], [], soon)).toBe(true);
    expect(canResumeSession(feed, [feed], [], new Date('2026-10-06T10:40:00Z'))).toBe(true);
    expect(canResumeSession(feed, [feed], [], new Date('2026-10-06T10:41:00Z'))).toBe(false);
    expect(canResumeSession(endedNap, [feed, endedNap], [], soon)).toBe(true);
    expect(canResumeSession(endedNap, [feed, endedNap], [], new Date('2026-10-06T10:46:00Z'))).toBe(false);
  });

  it('refuses older entries, bottles, running entries and other kinds', () => {
    const later = { ...bottle, startedAt: '2026-10-06T10:30:00Z' };
    expect(canResumeSession(feed, [feed, later], [], soon)).toBe(false);
    expect(canResumeSession(later, [feed, later], [], soon)).toBe(false);
    expect(canResumeSession({ ...feed, endedAt: null }, [feed], [], soon)).toBe(false);
    const newerNap = { ...endedNap, id: 'newer', startedAt: '2026-10-06T10:30:00Z' };
    expect(canResumeSession(endedNap, [endedNap, newerNap], [], soon)).toBe(false);
    const pump = makeEvent('pump', { id: 'pump', startedAt: '2026-10-06T10:00:00Z', endedAt: '2026-10-06T10:20:00Z' });
    expect(canResumeSession(pump, [pump], [], soon)).toBe(false);
  });

  it('refuses while another of the same kind is running', () => {
    const running = makeEvent('breast_feed', { id: 'other', endedAt: null });
    expect(canResumeSession(feed, [feed], [running], soon)).toBe(false);
    expect(canResumeSession(feed, [feed], [nap], soon)).toBe(true);
    expect(canResumeSession(endedNap, [endedNap], [nap], soon)).toBe(false);
    expect(canResumeSession(endedNap, [endedNap], [running], soon)).toBe(true);
  });
});

describe('staleSessions', () => {
  const paused = makeEvent('breast_feed', {
    id: 'paused',
    startedAt: '2026-10-06T11:00:00Z',
    endedAt: null,
    segments: [{ side: 'left', startedAt: '2026-10-06T11:00:00Z', endedAt: '2026-10-06T11:20:00Z' }],
  });

  it('finds paused sessions idle for longer than the limit', () => {
    expect(staleSessions([paused], NOW, 30).map((e) => e.id)).toEqual(['paused']);
    expect(staleSessions([paused], NOW, 60)).toEqual([]);
  });

  it('includes paused naps but not naps that were never paused', () => {
    const pausedNap = makeEvent('sleep', {
      id: 'paused-nap',
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: null,
      segments: [{ startedAt: '2026-10-06T10:00:00Z', endedAt: '2026-10-06T11:00:00Z' }],
    });
    expect(staleSessions([pausedNap, nap], NOW, 30).map((e) => e.id)).toEqual(['paused-nap']);
  });

  it('ignores running segments and naps', () => {
    const running = {
      ...paused,
      segments: [{ side: 'left' as const, startedAt: '2026-10-06T11:00:00Z', endedAt: null }],
    };
    expect(staleSessions([running, nap], NOW, 1)).toEqual([]);
  });
});

describe('feedEndTime', () => {
  it('uses the last segment end for a paused feed', () => {
    const paused = makeEvent('breast_feed', {
      endedAt: null,
      segments: [{ side: 'left', startedAt: '2026-10-06T11:00:00Z', endedAt: '2026-10-06T11:20:00Z' }],
    });
    expect(feedEndTime(paused, NOW)).toBe('2026-10-06T11:20:00.000Z');
  });

  it('uses now while a side is still running', () => {
    const running = makeEvent('breast_feed', {
      endedAt: null,
      segments: [{ side: 'left', startedAt: '2026-10-06T11:00:00Z', endedAt: null }],
    });
    expect(feedEndTime(running, NOW)).toBe(NOW.toISOString());
  });
});

describe('nextBreastSide', () => {
  const feed = (startedAt: string, sides: ('left' | 'right')[]) =>
    makeEvent('breast_feed', {
      id: startedAt,
      startedAt,
      segments: sides.map((side, index) => ({
        side,
        startedAt: new Date(Date.parse(startedAt) + index * 600_000).toISOString(),
        endedAt: new Date(Date.parse(startedAt) + (index + 1) * 600_000).toISOString(),
      })),
    });

  it('suggests the other side from the one the last feed ended on', () => {
    expect(
      nextBreastSide([feed('2026-10-06T08:00:00Z', ['left']), feed('2026-10-06T11:00:00Z', ['left', 'right'])]),
    ).toBe('left');
    expect(nextBreastSide([feed('2026-10-06T11:00:00Z', ['right', 'left'])])).toBe('right');
  });

  it('has no suggestion without a breastfeed', () => {
    expect(nextBreastSide([makeEvent('bottle')])).toBeNull();
    expect(nextBreastSide([])).toBeNull();
  });
});
