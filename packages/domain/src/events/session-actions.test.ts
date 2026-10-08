import { describe, expect, it } from 'vitest';
import {
  applySessionAction,
  discardNeedsConfirmation,
  earlierEnd,
  earlierStart,
  earliestEnd,
  endChangeError,
  sessionNoun,
  startChangeError,
  suggestedEnd,
} from './session-actions';
import { makeEvent } from './test-events';

const NOW = new Date('2026-10-06T10:20:00Z');
const running = makeEvent('breast_feed', {
  startedAt: '2026-10-06T10:00:00Z',
  endedAt: null,
  sessionState: 'running',
  segments: [{ side: 'left', startedAt: '2026-10-06T10:00:00Z', endedAt: null }],
});

describe('applySessionAction', () => {
  it('switches side by closing the open segment', () => {
    const next = applySessionAction(running, { kind: 'switch', side: 'right' }, NOW);
    expect(next.type === 'breast_feed' && next.segments).toEqual([
      { side: 'left', startedAt: '2026-10-06T10:00:00Z', endedAt: NOW.toISOString() },
      { side: 'right', startedAt: NOW.toISOString(), endedAt: null },
    ]);
  });

  it('ignores a switch to the current side', () => {
    expect(applySessionAction(running, { kind: 'switch', side: 'left' }, NOW)).toBe(running);
  });

  it('pauses and resumes on the last side', () => {
    const paused = applySessionAction(running, { kind: 'pause' }, NOW);
    expect(paused.sessionState).toBe('paused');
    const resumed = applySessionAction(paused, { kind: 'resume' }, new Date('2026-10-06T10:23:00Z'));
    expect(resumed.type === 'breast_feed' && resumed.segments.at(-1)).toEqual({
      side: 'left',
      startedAt: '2026-10-06T10:23:00.000Z',
      endedAt: null,
    });
  });

  it('ends at the last segment end when finished while paused', () => {
    const paused = applySessionAction(running, { kind: 'pause' }, NOW);
    const ended = applySessionAction(paused, { kind: 'end' }, new Date('2026-10-06T10:40:00Z'));
    expect(ended).toMatchObject({ endedAt: NOW.toISOString(), sessionState: 'ended' });
  });

  it('ends a sleep now', () => {
    const sleep = makeEvent('sleep', { startedAt: '2026-10-06T09:00:00Z', endedAt: null });
    expect(applySessionAction(sleep, { kind: 'end' }, NOW).endedAt).toBe(NOW.toISOString());
    expect(applySessionAction(sleep, { kind: 'switch', side: 'left' }, NOW)).toBe(sleep);
  });

  it('pauses and resumes a nap as stretches of sleep, and ends a paused nap when it was paused', () => {
    const sleep = makeEvent('sleep', { startedAt: '2026-10-06T09:00:00Z', endedAt: null });
    const paused = applySessionAction(sleep, { kind: 'pause' }, new Date('2026-10-06T09:40:00Z'));
    expect(paused).toMatchObject({
      sessionState: 'paused',
      segments: [{ startedAt: '2026-10-06T09:00:00Z', endedAt: '2026-10-06T09:40:00.000Z' }],
    });
    expect(applySessionAction(sleep, { kind: 'resume' }, NOW)).toBe(sleep);
    const resumed = applySessionAction(paused, { kind: 'resume' }, new Date('2026-10-06T09:50:00Z'));
    expect(resumed.type === 'sleep' && resumed.segments.at(-1)).toEqual({
      startedAt: '2026-10-06T09:50:00.000Z',
      endedAt: null,
    });
    expect(applySessionAction(paused, { kind: 'end' }, NOW).endedAt).toBe('2026-10-06T09:40:00.000Z');
    expect(applySessionAction(resumed, { kind: 'end' }, NOW).endedAt).toBe(NOW.toISOString());
  });

  it('leaves finished events alone', () => {
    const done = { ...running, endedAt: '2026-10-06T10:10:00Z' };
    expect(applySessionAction(done, { kind: 'switch', side: 'right' }, NOW)).toBe(done);
  });
});

describe('discardNeedsConfirmation', () => {
  it('confirms once a session has run for a minute', () => {
    const startedAt = '2026-10-06T10:00:00Z';
    expect(discardNeedsConfirmation({ startedAt }, new Date('2026-10-06T10:00:59Z'))).toBe(false);
    expect(discardNeedsConfirmation({ startedAt }, new Date('2026-10-06T10:01:00Z'))).toBe(true);
  });
});

describe('sessionNoun', () => {
  it('names sessions the way parents do', () => {
    expect(sessionNoun('sleep')).toBe('nap');
    expect(sessionNoun('breast_feed')).toBe('feed');
    expect(sessionNoun('pump')).toBe('pump');
  });
});

describe('changing the start of a running session', () => {
  it('moves the feed and its first side earlier', () => {
    const next = applySessionAction(running, { kind: 'set-start', startedAt: '2026-10-06T09:50:00.000Z' }, NOW);
    expect(next.startedAt).toBe('2026-10-06T09:50:00.000Z');
    expect(next.type === 'breast_feed' && next.segments[0]?.startedAt).toBe('2026-10-06T09:50:00.000Z');
  });

  it('moves only the first side when there are several', () => {
    const switched = applySessionAction(running, { kind: 'switch', side: 'right' }, NOW);
    const next = applySessionAction(switched, { kind: 'set-start', startedAt: '2026-10-06T09:55:00.000Z' }, NOW);
    expect(next.type === 'breast_feed' && next.segments.map((s) => s.startedAt)).toEqual([
      '2026-10-06T09:55:00.000Z',
      NOW.toISOString(),
    ]);
  });

  it('moves a nap start', () => {
    const nap = makeEvent('sleep', { startedAt: '2026-10-06T10:00:00Z', endedAt: null, sessionState: 'running' });
    const next = applySessionAction(nap, { kind: 'set-start', startedAt: '2026-10-06T09:00:00.000Z' }, NOW);
    expect(next.startedAt).toBe('2026-10-06T09:00:00.000Z');
  });

  it('ignores an invalid start', () => {
    expect(applySessionAction(running, { kind: 'set-start', startedAt: '2026-10-06T11:00:00Z' }, NOW)).toBe(running);
  });

  it('rejects future starts and starts after the first side ended', () => {
    expect(startChangeError(running, '2026-10-06T10:30:00Z', NOW)).toBe("The start can't be in the future.");
    const switched = applySessionAction(running, { kind: 'switch', side: 'right' }, new Date('2026-10-06T10:05:00Z'));
    expect(startChangeError(switched, '2026-10-06T10:06:00Z', NOW)).toBe(
      'The start must be before the first side ended.',
    );
    expect(startChangeError(switched, '2026-10-06T09:30:00Z', NOW)).toBeNull();
    expect(startChangeError(running, 'nonsense', NOW)).toBe('Pick a start time.');
  });

  it('offers starts earlier than the current one', () => {
    expect(earlierStart(running, 10)).toBe('2026-10-06T09:50:00.000Z');
  });
});

describe('ending a running session earlier', () => {
  const nap = makeEvent('sleep', { startedAt: '2026-10-06T09:00:00Z', endedAt: null, sessionState: 'running' });
  const paused = makeEvent('breast_feed', {
    startedAt: '2026-10-06T09:40:00Z',
    endedAt: null,
    sessionState: 'paused',
    segments: [{ side: 'left', startedAt: '2026-10-06T09:40:00Z', endedAt: '2026-10-06T09:55:00Z' }],
  });

  it('ends a nap at the chosen time, never later than now', () => {
    expect(applySessionAction(nap, { kind: 'end', at: earlierEnd(NOW, 15) }, NOW).endedAt).toBe(
      '2026-10-06T10:05:00.000Z',
    );
    expect(applySessionAction(nap, { kind: 'end', at: '2026-10-06T11:00:00Z' }, NOW).endedAt).toBe(NOW.toISOString());
  });

  it('closes the open side at the chosen time', () => {
    const next = applySessionAction(running, { kind: 'end', at: '2026-10-06T10:12:00.000Z' }, NOW);
    expect(next.endedAt).toBe('2026-10-06T10:12:00.000Z');
    expect(next.type === 'breast_feed' && next.segments[0]!.endedAt).toBe('2026-10-06T10:12:00.000Z');
  });

  it('allows ends back to the nap start, the open side start or the last side end', () => {
    expect(earliestEnd(nap)).toBe('2026-10-06T09:00:00Z');
    expect(earliestEnd(running)).toBe('2026-10-06T10:00:00Z');
    expect(earliestEnd(paused)).toBe('2026-10-06T09:55:00Z');
  });

  it('suggests five minutes ago, or the earliest allowed end if that is later', () => {
    expect(suggestedEnd(nap, NOW)).toBe('2026-10-06T10:15:00.000Z');
    expect(suggestedEnd(running, new Date('2026-10-06T10:02:00Z'))).toBe('2026-10-06T10:00:00Z');
  });

  it('explains ends that are too early or in the future', () => {
    expect(endChangeError(nap, '2026-10-06T09:30:00Z', NOW)).toBeNull();
    expect(endChangeError(nap, '2026-10-06T08:59:00Z', NOW)).toBe("The end can't be before the nap started.");
    expect(endChangeError(nap, '2026-10-06T10:21:00Z', NOW)).toBe("The end can't be in the future.");
    expect(endChangeError(running, '2026-10-06T09:59:00Z', NOW)).toBe(
      "The end can't be before the current side started.",
    );
    expect(endChangeError(paused, '2026-10-06T09:50:00Z', NOW)).toBe("The end can't be before the last side finished.");
    expect(endChangeError(nap, 'nonsense', NOW)).toBe('Pick an end time.');
  });
});
