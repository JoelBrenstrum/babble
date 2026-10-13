import { describe, expect, it } from 'vitest';
import {
  feedPromptOnNapStart,
  napPromptOnFeedEnd,
  napPromptOnFeedStart,
  nappyPromptAfterBottle,
  nappyPromptOnFeedFinish,
  nappyPromptOnFeedStart,
  nappyPromptOnSideChange,
  NAPPY_PROMPT_LABELS,
  NAPPY_PROMPT_OPTIONS,
  promptsForSessionEvent,
} from './session-prompts';
import type { BabyEvent } from './types';
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
  const at = '2026-10-06T12:00:00Z';
  const nappyAt = (startedAt: string, deletedAt: string | null = null) =>
    makeEvent('nappy', { startedAt, endedAt: startedAt, deletedAt });
  const oneSide = makeEvent('breast_feed', {
    startedAt: '2026-10-06T11:50:00Z',
    endedAt: null,
    segments: [{ side: 'left', startedAt: '2026-10-06T11:50:00Z', endedAt: null }],
  });
  const bothSides = {
    ...oneSide,
    segments: [
      { side: 'left' as const, startedAt: '2026-10-06T11:50:00Z', endedAt: '2026-10-06T11:55:00Z' },
      { side: 'right' as const, startedAt: '2026-10-06T11:55:00Z', endedAt: null },
    ],
  };

  it('asks when a feed starts, unless a nappy was logged in the last 30 minutes', () => {
    expect(nappyPromptOnFeedStart('feed_start', [], at)).toEqual({ kind: 'nappy', at });
    expect(nappyPromptOnFeedStart('feed_start', [nappyAt('2026-10-06T11:20:00Z')], at)).toEqual({ kind: 'nappy', at });
    expect(nappyPromptOnFeedStart('feed_start', [nappyAt('2026-10-06T11:45:00Z')], at)).toBeNull();
    expect(
      nappyPromptOnFeedStart('feed_start', [nappyAt('2026-10-06T11:45:00Z', '2026-10-06T11:46:00Z')], at),
    ).not.toBeNull();
    for (const timing of ['first_side', 'feed_end', 'off'] as const) {
      expect(nappyPromptOnFeedStart(timing, [], at)).toBeNull();
    }
  });

  it('asks after the first side, when moving to the other side for the first time', () => {
    expect(nappyPromptOnSideChange('first_side', oneSide, 'right', [], at)).toEqual({ kind: 'nappy', at });
    expect(nappyPromptOnSideChange('first_side', oneSide, 'left', [], at)).toBeNull();
    expect(nappyPromptOnSideChange('first_side', bothSides, 'left', [], at)).toBeNull();
    expect(nappyPromptOnSideChange('feed_start', oneSide, 'right', [], at)).toBeNull();
  });

  it('asks when the feed ends, or then if the feed only used one side', () => {
    expect(nappyPromptOnFeedFinish('feed_end', bothSides, [], at)).toEqual({ kind: 'nappy', at });
    expect(nappyPromptOnFeedFinish('first_side', oneSide, [], at)).toEqual({ kind: 'nappy', at });
    expect(nappyPromptOnFeedFinish('first_side', bothSides, [], at)).toBeNull();
    expect(nappyPromptOnFeedFinish('feed_start', bothSides, [], at)).toBeNull();
    expect(nappyPromptOnFeedFinish('off', oneSide, [], at)).toBeNull();
  });

  it('asks after a bottle unless prompts are off', () => {
    expect(nappyPromptAfterBottle('feed_end', [], at)).toEqual({ kind: 'nappy', at });
    expect(nappyPromptAfterBottle('off', [], at)).toBeNull();
  });
});

describe('promptsForSessionEvent', () => {
  const running: BabyEvent[] = [];
  const base = { running, latest: [] as BabyEvent[], nappyTiming: 'feed_start' as const, at: NOW.toISOString() };

  it('asks to end a running nap and about a nappy when a feed starts', () => {
    const prompts = promptsForSessionEvent({ ...base, kind: 'start', event: { type: 'breast_feed' }, running: [nap] });
    expect(prompts).toEqual([
      { kind: 'end-nap', nap, feedStartedAt: base.at },
      { kind: 'nappy', at: base.at },
    ]);
  });

  it('only asks about the nappy when no nap is running', () => {
    expect(promptsForSessionEvent({ ...base, kind: 'start', event: { type: 'breast_feed' } })).toEqual([
      { kind: 'nappy', at: base.at },
    ]);
    expect(
      promptsForSessionEvent({ ...base, kind: 'start', event: { type: 'breast_feed' }, nappyTiming: 'feed_end' }),
    ).toEqual([]);
  });

  it('asks to end a running feed when a nap starts', () => {
    const runningFeed = { ...feed, endedAt: null };
    expect(
      promptsForSessionEvent({ ...base, kind: 'start', event: { type: 'sleep' }, running: [runningFeed] }),
    ).toEqual([{ kind: 'end-feed', feed: runningFeed, napStartedAt: base.at }]);
    expect(promptsForSessionEvent({ ...base, kind: 'start', event: { type: 'sleep' } })).toEqual([]);
  });

  it('prompts after a logged bottle, preferring the nap prompt over starting one', () => {
    const asleep = promptsForSessionEvent({ ...base, kind: 'start', event: { type: 'bottle' }, running: [nap] });
    expect(asleep.map((prompt) => prompt.kind)).toEqual(['end-nap', 'nappy']);
    const awake = promptsForSessionEvent({ ...base, kind: 'start', event: { type: 'bottle' } });
    expect(awake.map((prompt) => prompt.kind)).toEqual(['start-nap', 'nappy']);
    expect(
      promptsForSessionEvent({ ...base, kind: 'start', event: { type: 'bottle' }, nappyTiming: 'off' }),
    ).toHaveLength(1);
  });

  it('asks about a nappy on the first change of side only', () => {
    const request = { ...base, kind: 'side' as const, nappyTiming: 'first_side' as const };
    expect(promptsForSessionEvent({ ...request, event: feed, side: 'right' })).toEqual([
      { kind: 'nappy', at: base.at },
    ]);
    expect(promptsForSessionEvent({ ...request, event: feed, side: 'left' })).toEqual([]);
    expect(promptsForSessionEvent({ ...request, event: bottle, side: 'right' })).toEqual([]);
  });

  it('asks about starting a nap and a nappy when a feed ends', () => {
    const prompts = promptsForSessionEvent({ ...base, kind: 'end', event: feed, nappyTiming: 'feed_end' });
    expect(prompts).toEqual([
      { kind: 'start-nap', feedEndedAt: base.at },
      { kind: 'nappy', at: base.at },
    ]);
    expect(promptsForSessionEvent({ ...base, kind: 'end', event: feed, running: [nap], nappyTiming: 'off' })).toEqual(
      [],
    );
  });

  it('has nothing to say for other session types', () => {
    expect(promptsForSessionEvent({ ...base, kind: 'end', event: nap })).toEqual([]);
    expect(promptsForSessionEvent({ ...base, kind: 'start', event: { type: 'nappy' } })).toEqual([]);
  });
});

describe('NAPPY_PROMPT_OPTIONS', () => {
  it('lists every timing with its label', () => {
    expect(NAPPY_PROMPT_OPTIONS.map((option) => option.value)).toEqual(Object.keys(NAPPY_PROMPT_LABELS));
    expect(NAPPY_PROMPT_OPTIONS.every((option) => option.label === NAPPY_PROMPT_LABELS[option.value])).toBe(true);
  });
});
