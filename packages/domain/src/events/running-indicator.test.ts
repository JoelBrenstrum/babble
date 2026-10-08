import { describe, expect, it } from 'vitest';
import { runningIndicator } from './running-indicator';
import { makeEvent } from './test-events';

const nap = makeEvent('sleep', { id: 'nap', endedAt: null, sessionState: 'running' });
const feed = makeEvent('breast_feed', { id: 'feed', endedAt: null, sessionState: 'running' });
const pump = makeEvent('pump', { id: 'pump', endedAt: null, sessionState: 'paused' });

describe('runningIndicator', () => {
  it('is hidden when nothing is running', () => {
    expect(runningIndicator([])).toBeNull();
    expect(runningIndicator([{ ...nap, endedAt: '2026-10-06T10:30:00Z' }])).toBeNull();
  });

  it('uses the colour of the running tracker and pulses', () => {
    expect(runningIndicator([nap])).toEqual({ tokens: ['sleep'], pulsing: true, label: 'Nap running' });
  });

  it('splits the dot between two trackers and keeps at most two colours', () => {
    expect(runningIndicator([feed, nap])).toEqual({
      tokens: ['feed-right', 'sleep'],
      pulsing: true,
      label: 'Feed and nap running',
    });
    expect(runningIndicator([feed, nap, pump])?.tokens).toEqual(['feed-right', 'sleep']);
    expect(runningIndicator([feed, nap, pump])?.label).toBe('Feed, nap and pump running');
  });

  it('stays still when everything is paused', () => {
    expect(runningIndicator([pump])).toEqual({ tokens: ['pump'], pulsing: false, label: 'Pump paused' });
    expect(runningIndicator([pump, nap])?.pulsing).toBe(true);
  });

  it('names timed custom events', () => {
    expect(runningIndicator([makeEvent('custom', { endedAt: null })])?.label).toBe('Custom running');
  });
});
