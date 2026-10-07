import { describe, expect, it } from 'vitest';
import {
  applySessionAction,
  discardNeedsConfirmation,
  earlierStart,
  sessionNoun,
  startChangeError,
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
    expect(applySessionAction(sleep, { kind: 'pause' }, NOW)).toBe(sleep);
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
