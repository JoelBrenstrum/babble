import { describe, expect, it } from 'vitest';
import { canResumeFeed, latestFeed, napPromptOnFeedEnd, napPromptOnFeedStart, staleSessions } from './feed-rules';
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

describe('canResumeFeed', () => {
  it('allows only the latest finished breastfeed', () => {
    expect(canResumeFeed(feed, 'feed', [])).toBe(true);
    expect(canResumeFeed(feed, 'bottle', [])).toBe(false);
    expect(canResumeFeed(bottle, 'bottle', [])).toBe(false);
    expect(canResumeFeed({ ...feed, endedAt: null }, 'feed', [])).toBe(false);
  });

  it('refuses while another feed is running', () => {
    const running = makeEvent('breast_feed', { id: 'other', endedAt: null });
    expect(canResumeFeed(feed, 'feed', [running])).toBe(false);
    expect(canResumeFeed(feed, 'feed', [nap])).toBe(true);
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

  it('ignores running segments and naps', () => {
    const running = {
      ...paused,
      segments: [{ side: 'left' as const, startedAt: '2026-10-06T11:00:00Z', endedAt: null }],
    };
    expect(staleSessions([running, nap], NOW, 1)).toEqual([]);
  });
});

describe('nap prompts', () => {
  it('asks to end a running nap when a feed starts', () => {
    expect(napPromptOnFeedStart([nap], '2026-10-06T12:00:00Z')).toEqual({
      kind: 'end-nap',
      nap,
      feedStartedAt: '2026-10-06T12:00:00Z',
    });
    expect(napPromptOnFeedStart([], '2026-10-06T12:00:00Z')).toBeNull();
  });

  it('asks whether the baby is asleep when a feed ends, unless a nap is running', () => {
    expect(napPromptOnFeedEnd([], '2026-10-06T12:00:00Z')).toEqual({
      kind: 'start-nap',
      feedEndedAt: '2026-10-06T12:00:00Z',
    });
    expect(napPromptOnFeedEnd([nap], '2026-10-06T12:00:00Z')).toBeNull();
  });
});
