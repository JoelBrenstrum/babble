import { describe, expect, it } from 'vitest';
import { applySessionAction, discardNeedsConfirmation, sessionNoun } from './session-actions';
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
