import { describe, expect, it } from 'vitest';
import { makeEvent } from '../events/test-events';
import { bucketByDay, dayLayout, markerShiftPercent } from './day-layout';

const window = { start: new Date('2026-10-06T00:00:00Z'), end: new Date('2026-10-07T00:00:00Z') };
const NOW = new Date('2026-10-06T18:00:00Z');

describe('dayLayout', () => {
  it('clips a sleep that crosses the day start and flags it', () => {
    const sleep = makeEvent('sleep', { startedAt: '2026-10-05T20:00:00Z', endedAt: '2026-10-06T06:00:00Z' });
    const [item] = dayLayout([sleep], window, NOW).sleep;
    expect(item).toMatchObject({ startFrac: 0, endFrac: 0.25, continuesBefore: true, continuesAfter: false });
  });

  it('runs open sessions up to now', () => {
    const nap = makeEvent('sleep', { id: 'nap', startedAt: '2026-10-06T12:00:00Z', endedAt: null });
    const [item] = dayLayout([nap], window, NOW).sleep;
    expect(item).toMatchObject({ startFrac: 0.5, endFrac: 0.75, running: true });
  });

  it('places feed sides and bottles in the feed lane', () => {
    const feed = makeEvent('breast_feed', {
      startedAt: '2026-10-06T06:00:00Z',
      endedAt: '2026-10-06T07:12:00Z',
      segments: [
        { side: 'left', startedAt: '2026-10-06T06:00:00Z', endedAt: '2026-10-06T06:36:00Z' },
        { side: 'right', startedAt: '2026-10-06T06:36:00Z', endedAt: '2026-10-06T07:12:00Z' },
      ],
    });
    const bottle = makeEvent('bottle', { id: 'bottle', startedAt: '2026-10-06T12:00:00Z' });
    const { feeds } = dayLayout([bottle, feed], window, NOW);
    expect(feeds.map((item) => item.event.type)).toEqual(['breast_feed', 'bottle']);
    expect(feeds[0]!.parts).toEqual([
      { side: 'left', startFrac: 0.25, endFrac: 0.275 },
      { side: 'right', startFrac: 0.275, endFrac: 0.3 },
    ]);
    expect(feeds[1]).toMatchObject({ startFrac: 0.5, endFrac: 0.5, running: false });
  });

  it('places solids as a marker in the feed lane', () => {
    const solids = makeEvent('solids', { startedAt: '2026-10-06T18:00:00Z', endedAt: '2026-10-06T18:00:00Z' });
    expect(dayLayout([solids], window, NOW).feeds).toMatchObject([{ startFrac: 0.75, endFrac: 0.75 }]);
  });

  it('moves markers that would overlap into the next column', () => {
    const nappies = ['01:00', '01:10', '01:20', '03:00'].map((time, index) =>
      makeEvent('nappy', { id: `nappy-${index}`, startedAt: `2026-10-06T${time}:00Z` }),
    );
    expect(dayLayout(nappies, window, NOW).nappies.map((item) => item.column)).toEqual([0, 1, 2, 0]);
  });

  it('leaves out deleted entries, growth and entries on other days', () => {
    const events = [
      makeEvent('nappy', { startedAt: '2026-10-06T03:00:00Z', deletedAt: '2026-10-06T03:01:00Z' }),
      makeEvent('nappy', { startedAt: '2026-10-07T00:00:00Z' }),
      makeEvent('growth', { startedAt: '2026-10-06T03:00:00Z' }),
    ];
    expect(dayLayout(events, window, NOW)).toEqual({ sleep: [], feeds: [], nappies: [], pumps: [] });
  });
});

describe('bucketByDay', () => {
  it('puts a sleep that crosses the boundary in both days', () => {
    const sleep = makeEvent('sleep', { startedAt: '2026-10-06T05:00:00Z', endedAt: '2026-10-06T09:00:00Z' });
    const nappy = makeEvent('nappy', { startedAt: '2026-10-06T06:30:00Z' });
    const days = bucketByDay([sleep, nappy], ['2026-10-05', '2026-10-06'], 'UTC', 7 * 60, NOW);
    expect(days.map((day) => day.events.map((event) => event.type))).toEqual([['sleep', 'nappy'], ['sleep']]);
    expect(days[1]!.window.start).toEqual(new Date('2026-10-06T07:00:00Z'));
  });

  it('gives a fall-back day 25 hours', () => {
    const [day] = bucketByDay([], ['2027-04-04'], 'Pacific/Auckland', 0, NOW);
    expect(day!.window.end.getTime() - day!.window.start.getTime()).toBe(25 * 3_600_000);
  });
});

describe('markerShiftPercent', () => {
  it('shifts clustered markers along the lane but never past it', () => {
    expect([0, 1, 2, 3, 7].map(markerShiftPercent)).toEqual([0, 30, 60, 60, 60]);
  });
});
