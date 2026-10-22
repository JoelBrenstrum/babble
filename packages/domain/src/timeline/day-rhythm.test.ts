import { describe, expect, it } from 'vitest';
import { makeEvent } from '../events/test-events';
import { dayRhythm, dayRhythmCards, dayRhythmWindow } from './day-rhythm';

const HOUR = 3_600_000;
const baby = { timezone: 'UTC', day_start_minutes: 0, birth_date: '2026-09-01' };
const settings = { night_start_minutes: 19 * 60, night_end_minutes: 7 * 60 };
const now = new Date('2026-10-14T21:00:00Z');

const sleep = (id: string, start: string, end: string | null) =>
  makeEvent('sleep', { id, startedAt: `${start}:00Z`, endedAt: end && `${end}:00Z` });
const breast = (id: string, start: string, end: string) =>
  makeEvent('breast_feed', { id, startedAt: `${start}:00Z`, endedAt: `${end}:00Z` });
const bottle = (id: string, start: string) => makeEvent('bottle', { id, startedAt: `${start}:00Z`, endedAt: null });

const events = [
  sleep('night-1', '2026-10-13T19:30', '2026-10-14T01:30'),
  sleep('night-2', '2026-10-14T02:00', '2026-10-14T06:30'),
  sleep('nap-1', '2026-10-14T09:00', '2026-10-14T10:00'),
  sleep('nap-2', '2026-10-14T12:30', '2026-10-14T14:00'),
  sleep('bed', '2026-10-14T19:15', null),
  breast('evening', '2026-10-13T18:00', '2026-10-13T18:20'),
  breast('late', '2026-10-13T23:00', '2026-10-13T23:15'),
  breast('early', '2026-10-14T03:00', '2026-10-14T03:15'),
  breast('morning', '2026-10-14T07:30', '2026-10-14T07:50'),
  breast('mid', '2026-10-14T10:30', '2026-10-14T10:45'),
  bottle('top-up', '2026-10-14T10:55'),
  bottle('lunch', '2026-10-14T13:00'),
  breast('tea', '2026-10-14T17:00', '2026-10-14T17:20'),
  breast('bedtime', '2026-10-14T19:30', '2026-10-14T19:45'),
];

describe('dayRhythmWindow', () => {
  it('runs from the start of the day before to the end of the day or its night, whichever is later', () => {
    expect(dayRhythmWindow('2026-10-14', baby, settings)).toEqual({
      start: new Date('2026-10-13T00:00:00Z'),
      end: new Date('2026-10-15T07:00:00Z'),
    });
    expect(dayRhythmWindow('2026-10-14', { ...baby, day_start_minutes: 8 * 60 }, settings)).toEqual({
      start: new Date('2026-10-13T08:00:00Z'),
      end: new Date('2026-10-15T08:00:00Z'),
    });
  });
});

describe('dayRhythm', () => {
  const rhythm = dayRhythm({ events, dayKey: '2026-10-14', now, settings, baby });

  it('spaces daytime feeds start to start, folding in top-ups and leaving out the gap into the night', () => {
    expect(rhythm.feedSpacing).toEqual({ typicalMs: 3 * HOUR, longestMs: 4 * HOUR, shortestMs: 2.5 * HOUR });
  });

  it('takes the longest gap between feeds that started in the night before', () => {
    expect(rhythm.nightFeedGapMs).toBe(4.5 * HOUR);
  });

  it('measures the wake windows that began on the day', () => {
    expect(rhythm.wakeWindows).toEqual({ typicalMs: 2.5 * HOUR, longestMs: 5.25 * HOUR, shortestMs: 2.5 * HOUR });
  });

  it('summarises last night for today', () => {
    expect(rhythm.night).toEqual({ dayKey: '2026-10-13', sleepMs: 10.5 * HOUR, longestMs: 6 * HOUR, wakeUps: 1 });
  });

  it("summarises a past day's own night", () => {
    const later = new Date('2026-10-15T12:00:00Z');
    const past = dayRhythm({ events, dayKey: '2026-10-13', now: later, settings, baby });
    expect(past.night).toEqual({ dayKey: '2026-10-13', sleepMs: 10.5 * HOUR, longestMs: 6 * HOUR, wakeUps: 1 });
    expect(past.nightFeedGapMs).toBe(4.5 * HOUR);
  });

  it('counts a wake window to the day it ends in, even if baby woke before the day started', () => {
    const lateStart = { ...baby, day_start_minutes: 7 * 60 };
    const early = [
      sleep('night', '2026-10-13T19:30', '2026-10-14T06:30'),
      sleep('nap', '2026-10-14T08:30', '2026-10-14T09:30'),
    ];
    const result = dayRhythm({ events: early, dayKey: '2026-10-14', now, settings, baby: lateStart });
    expect(result.wakeWindows).toEqual({ typicalMs: 2 * HOUR, longestMs: 2 * HOUR, shortestMs: 2 * HOUR });
  });

  it('is empty when nothing was logged', () => {
    expect(dayRhythm({ events: [], dayKey: '2026-10-14', now, settings, baby })).toEqual({
      feedSpacing: null,
      wakeWindows: null,
      night: null,
      nightFeedGapMs: null,
    });
  });
});

describe('dayRhythmCards', () => {
  it('shows spacing, wake windows and the night before', () => {
    const rhythm = dayRhythm({ events, dayKey: '2026-10-14', now, settings, baby });
    expect(dayRhythmCards(rhythm, true)).toEqual([
      {
        key: 'spacing',
        label: 'Feed spacing',
        value: '3h 00m',
        details: [
          { label: 'Longest', value: '4h 00m' },
          { label: 'Shortest', value: '2h 30m' },
        ],
      },
      {
        key: 'wake',
        label: 'Wake windows',
        value: '2h 30m',
        details: [
          { label: 'Longest', value: '5h 15m' },
          { label: 'Shortest', value: '2h 30m' },
        ],
      },
      {
        key: 'night',
        label: 'Last night',
        value: '10h 30m',
        details: [
          { label: 'Longest stretch', value: '6h 00m' },
          { label: 'Wake-ups', value: '1' },
          { label: 'Longest feed gap', value: '4h 30m' },
        ],
      },
    ]);
  });

  it('names the night overnight on past days and leaves out what is missing', () => {
    const cards = dayRhythmCards(
      { feedSpacing: null, wakeWindows: null, night: null, nightFeedGapMs: 3 * HOUR },
      false,
    );
    expect(cards).toEqual([
      {
        key: 'night',
        label: 'Overnight',
        value: '—',
        details: [
          { label: 'Longest stretch', value: '—' },
          { label: 'Wake-ups', value: '—' },
          { label: 'Longest feed gap', value: '3h 00m' },
        ],
      },
    ]);
  });

  it('shows nothing when there is nothing to show', () => {
    expect(dayRhythmCards({ feedSpacing: null, wakeWindows: null, night: null, nightFeedGapMs: null }, true)).toEqual(
      [],
    );
  });
});
