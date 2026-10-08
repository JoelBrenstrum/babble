import { describe, expect, it } from 'vitest';
import {
  manualSleepDuration,
  pausedForMs,
  pumpFinishSummary,
  runningSessionLine,
  runningTone,
  startContext,
  withoutPumpAmounts,
} from './session-context';
import { makeEvent } from './test-events';

const NOW = new Date('2026-10-06T12:00:00Z');

const feed = makeEvent('breast_feed', {
  startedAt: '2026-10-06T09:26:00Z',
  endedAt: '2026-10-06T09:46:00Z',
  segments: [
    { side: 'left', startedAt: '2026-10-06T09:26:00Z', endedAt: '2026-10-06T09:36:00Z' },
    { side: 'right', startedAt: '2026-10-06T09:36:00Z', endedAt: '2026-10-06T09:46:00Z' },
  ],
});

describe('startContext', () => {
  it('describes the last breastfeed and the next side', () => {
    expect(startContext('breast_feed', [feed], NOW, 'metric')).toBe(
      'Last feed ended on Right, 2h 14m ago. Next side: Left.',
    );
  });

  it('invites either side when no breastfeed exists', () => {
    expect(startContext('breast_feed', [], NOW, 'metric')).toBe('No breastfeeds logged yet. Start on either side.');
  });

  it('says nothing while the latest breastfeed is still running', () => {
    expect(startContext('breast_feed', [{ ...feed, endedAt: null }], NOW, 'metric')).toBeNull();
  });

  it('describes the last pump with its amount in the chosen units', () => {
    const pump = makeEvent('pump', {
      startedAt: '2026-10-06T05:40:00Z',
      endedAt: '2026-10-06T05:58:00Z',
      details: { leftMl: 50, rightMl: 40, totalMl: null },
    });
    expect(startContext('pump', [pump], NOW, 'metric')).toBe('Last pump 6h 02m ago · 90 ml.');
    expect(startContext('pump', [pump], NOW, 'imperial')).toBe('Last pump 6h 02m ago · 3 oz.');
    const noAmount = { ...pump, details: { leftMl: null, rightMl: null, totalMl: null } };
    expect(startContext('pump', [noAmount], NOW, 'metric')).toBe('Last pump 6h 02m ago.');
  });

  it('says how long the baby has been awake since the last nap', () => {
    const nap = makeEvent('sleep', { startedAt: '2026-10-06T09:00:00Z', endedAt: '2026-10-06T10:55:00Z' });
    expect(startContext('sleep', [nap], NOW, 'metric')).toBe('Awake 1h 05m since the last nap.');
    expect(startContext('sleep', [], NOW, 'metric')).toBeNull();
  });
});

describe('runningSessionLine', () => {
  it('shows the current side and its time for a running feed', () => {
    const running = makeEvent('breast_feed', {
      startedAt: '2026-10-06T11:30:00Z',
      endedAt: null,
      segments: [{ side: 'right', startedAt: '2026-10-06T11:47:37Z', endedAt: null }],
    });
    expect(runningSessionLine(running, NOW, 'Jane')).toBe('Right · 12m 23s · started by Jane');
  });

  it('shows the total for a paused feed', () => {
    const paused = { ...feed, endedAt: null };
    expect(runningSessionLine(paused, NOW)).toBe('Paused · 20m 00s');
  });

  it('shows the nap length', () => {
    const nap = makeEvent('sleep', { startedAt: '2026-10-06T11:20:00Z', endedAt: null, segments: [] });
    expect(runningSessionLine(nap, NOW, 'Jane')).toBe('Napping · 40m · started by Jane');
  });
});

describe('pausedForMs', () => {
  it('counts from the last segment end while paused', () => {
    expect(pausedForMs(feed.segments, new Date('2026-10-06T09:47:12Z'))).toBe(72_000);
  });

  it('is null while a side is running or before any side', () => {
    expect(pausedForMs([{ side: 'left', startedAt: '2026-10-06T11:00:00Z', endedAt: null }], NOW)).toBeNull();
    expect(pausedForMs([], NOW)).toBeNull();
  });
});

describe('pumpFinishSummary', () => {
  it('shows the pumping time and when it finished', () => {
    const pump = makeEvent('pump', {
      startedAt: '2026-10-06T13:54:00Z',
      endedAt: '2026-10-06T14:12:00Z',
      segments: [
        { side: 'left', startedAt: '2026-10-06T13:54:00Z', endedAt: '2026-10-06T14:02:00Z' },
        { side: 'right', startedAt: '2026-10-06T14:02:05Z', endedAt: '2026-10-06T14:12:00Z' },
      ],
    });
    expect(pumpFinishSummary(pump, 'Pacific/Auckland')).toBe('17m 55s · finished 3:12 am');
    expect(pumpFinishSummary(feed, 'Pacific/Auckland')).toBeNull();
  });
});

describe('manualSleepDuration', () => {
  it('formats a valid range and rejects an empty or backwards one', () => {
    expect(manualSleepDuration('2026-10-06T01:58:00Z', '2026-10-06T03:10:00Z')).toBe('1h 12m');
    expect(manualSleepDuration('2026-10-06T03:10:00Z', '2026-10-06T01:58:00Z')).toBeNull();
    expect(manualSleepDuration('2026-10-06T03:10:00Z', '2026-10-06T03:10:00Z')).toBeNull();
    expect(manualSleepDuration('2026-10-06T03:10:00Z', null)).toBeNull();
  });
});

describe('runningTone', () => {
  it('follows the open side, the session type, or downtime while paused', () => {
    const left = makeEvent('breast_feed', {
      endedAt: null,
      segments: [{ side: 'left', startedAt: '2026-10-06T11:00:00Z', endedAt: null }],
    });
    expect(runningTone(left)).toBe('feed-left');
    expect(runningTone({ ...feed, endedAt: null })).toBe('downtime');
    expect(runningTone(makeEvent('sleep', { endedAt: null, segments: [] }))).toBe('sleep');
    expect(runningTone(makeEvent('pump', { endedAt: null, segments: [] }))).toBe('pump');
  });
});

describe('withoutPumpAmounts', () => {
  it('clears pump amounts and leaves other drafts alone', () => {
    const pump = makeEvent('pump', { details: { leftMl: 50, rightMl: 40, totalMl: 90 } });
    expect(withoutPumpAmounts(pump)).toMatchObject({ details: { leftMl: null, rightMl: null, totalMl: null } });
    expect(withoutPumpAmounts(feed)).toBe(feed);
  });
});
