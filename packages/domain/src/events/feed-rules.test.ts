import { describe, expect, it } from 'vitest';
import {
  feedPromptOnNapStart,
  nextBreastSide,
  canResumeFeed,
  feedEndTime,
  latestFeed,
  napPromptContent,
  napPromptOnFeedEnd,
  napPromptOnFeedStart,
  nappyPromptOnFeedStart,
  staleSessions,
} from './feed-rules';
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

  it('asks to end a running breastfeed when a nap starts, but not a pump', () => {
    const running = { ...feed, endedAt: null };
    expect(feedPromptOnNapStart([running], '2026-10-06T12:00:00Z')).toEqual({
      kind: 'end-feed',
      feed: running,
      napStartedAt: '2026-10-06T12:00:00Z',
    });
    expect(feedPromptOnNapStart([makeEvent('pump', { endedAt: null })], '2026-10-06T12:00:00Z')).toBeNull();
    expect(feedPromptOnNapStart([], '2026-10-06T12:00:00Z')).toBeNull();
  });
});

describe('nappy prompt', () => {
  it('asks for a nappy change when a feed starts, unless one was logged in the last 30 minutes', () => {
    const at = '2026-10-06T12:00:00Z';
    const nappyAt = (startedAt: string, deletedAt: string | null = null) =>
      makeEvent('nappy', { startedAt, endedAt: startedAt, deletedAt });
    expect(nappyPromptOnFeedStart([], at)).toEqual({ kind: 'nappy', feedStartedAt: at });
    expect(nappyPromptOnFeedStart([nappyAt('2026-10-06T11:20:00Z')], at)).toEqual({ kind: 'nappy', feedStartedAt: at });
    expect(nappyPromptOnFeedStart([nappyAt('2026-10-06T11:45:00Z')], at)).toBeNull();
    expect(nappyPromptOnFeedStart([nappyAt('2026-10-06T11:45:00Z', '2026-10-06T11:46:00Z')], at)).not.toBeNull();
  });

  it('offers to log a nappy or skip', () => {
    expect(napPromptContent({ kind: 'nappy', feedStartedAt: NOW.toISOString() }, 'Olivia', 'UTC', NOW)).toEqual({
      title: "Change Olivia's nappy?",
      body: 'Log a nappy change with this feed.',
      options: [
        { label: 'Yes, log a nappy', action: { kind: 'log-nappy' }, primary: true },
        { label: 'Not now', action: null, primary: false },
      ],
    });
  });
});

describe('end feed prompt', () => {
  const running = { ...feed, endedAt: null };

  it('ends the feed now when the nap starts now', () => {
    const content = napPromptContent(
      { kind: 'end-feed', feed: running, napStartedAt: NOW.toISOString() },
      'Olivia',
      'UTC',
      NOW,
    );
    expect(content.title).toBe("End Olivia's feed?");
    expect(content.body).toBe('A feed has been running since 10:00 am.');
    expect(content.options).toEqual([
      { label: 'End feed', action: { kind: 'end-feed', feedId: 'feed' }, primary: true },
      { label: 'Keep feeding', action: null, primary: false },
    ]);
  });

  it('ends the feed at a backdated nap start', () => {
    const content = napPromptContent(
      { kind: 'end-feed', feed: running, napStartedAt: '2026-10-06T11:40:00Z' },
      'Olivia',
      'UTC',
      NOW,
    );
    expect(content.options[0]).toEqual({
      label: 'End feed at nap start (11:40 am)',
      action: { kind: 'end-feed', feedId: 'feed', at: '2026-10-06T11:40:00Z' },
      primary: true,
    });
  });
});

describe('napPromptContent', () => {
  it('offers to end a nap, including at the feed start when that was a while ago', () => {
    const content = napPromptContent(
      { kind: 'end-nap', nap, feedStartedAt: '2026-10-06T11:40:00Z' },
      'Olivia',
      'UTC',
      NOW,
    );
    expect(content.title).toBe("End Olivia's nap?");
    expect(content.body).toBe('A nap has been running since 11:30 am.');
    expect(content.options).toEqual([
      { label: 'End nap now', action: { kind: 'end-nap', napId: 'nap' }, primary: true },
      {
        label: 'End at feed start (11:40 am)',
        action: { kind: 'end-nap', napId: 'nap', at: '2026-10-06T11:40:00Z' },
        primary: false,
      },
      { label: 'Keep sleeping', action: null, primary: false },
    ]);
  });

  it('skips "end at feed start" for a feed that just started', () => {
    const content = napPromptContent({ kind: 'end-nap', nap, feedStartedAt: NOW.toISOString() }, 'Olivia', 'UTC', NOW);
    expect(content.options.map((option) => option.label)).toEqual(['End nap now', 'Keep sleeping']);
  });

  it('only offers "asleep since feed end" when the feed ended a while ago', () => {
    const content = napPromptContent({ kind: 'start-nap', feedEndedAt: NOW.toISOString() }, 'Olivia', 'UTC', NOW);
    expect(content.options.map((option) => option.label)).toEqual(['Start nap now', 'Not now']);
  });

  it('asks whether the baby is asleep after a feed', () => {
    const content = napPromptContent({ kind: 'start-nap', feedEndedAt: '2026-10-06T11:34:00Z' }, 'Olivia', 'UTC', NOW);
    expect(content.title).toBe('Is Olivia asleep?');
    expect(content.options).toEqual([
      { label: 'Start nap now', action: { kind: 'start-nap' }, primary: true },
      {
        label: 'Asleep since feed end (11:34 am)',
        action: { kind: 'start-nap', at: '2026-10-06T11:34:00Z' },
        primary: false,
      },
      { label: 'Not now', action: null, primary: false },
    ]);
  });
});

describe('feedEndTime', () => {
  it('uses the last segment end for a paused feed', () => {
    const paused = makeEvent('breast_feed', {
      endedAt: null,
      segments: [{ side: 'left', startedAt: '2026-10-06T11:00:00Z', endedAt: '2026-10-06T11:20:00Z' }],
    });
    expect(feedEndTime(paused, NOW)).toBe('2026-10-06T11:20:00Z');
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
