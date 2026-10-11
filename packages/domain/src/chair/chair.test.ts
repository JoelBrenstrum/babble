import { describe, expect, it } from 'vitest';
import { makeEvent } from '../events/test-events';
import {
  chairBottleDraft,
  chairDimmed,
  chairIsNight,
  chairFeedSummary,
  chairFeedView,
  chairNappyDraft,
  defaultBottleAmount,
  defaultBottleContent,
  formatBottleAmount,
  lastFeedLine,
  lastNappyLine,
  runningBreastFeed,
  stepBottleAmount,
} from './chair';

const NOW = new Date('2026-10-06T12:30:00Z');
const at = (time: string) => `2026-10-06T${time}:00Z`;

const endedFeed = makeEvent('breast_feed', {
  id: 'feed-1',
  startedAt: at('10:00'),
  endedAt: at('10:20'),
  segments: [
    { side: 'left', startedAt: at('10:00'), endedAt: at('10:12') },
    { side: 'right', startedAt: at('10:12'), endedAt: at('10:20') },
  ],
});

describe('lastFeedLine', () => {
  it('describes the last breastfeed with its final side and length', () => {
    expect(lastFeedLine([endedFeed], NOW, 'metric')).toBe('Last fed 2h 10m ago · Right side · 20m');
  });

  it('uses a later bottle instead', () => {
    const bottle = makeEvent('bottle', {
      startedAt: at('11:30'),
      endedAt: at('11:30'),
      details: { content: 'formula', amountMl: 120, amountLeftMl: null },
    });
    expect(lastFeedLine([endedFeed, bottle], NOW, 'metric')).toBe('Last fed 1h 00m ago · Bottle · 120 ml');
    expect(lastFeedLine([bottle], NOW, 'imperial')).toBe('Last fed 1h 00m ago · Bottle · 4.1 oz');
  });

  it('leaves out the length of a feed under a minute', () => {
    const short = {
      ...endedFeed,
      segments: [{ side: 'left' as const, startedAt: '2026-10-06T10:18:30Z', endedAt: at('10:19') }],
    };
    expect(lastFeedLine([short], NOW, 'metric')).toBe('Last fed 2h 10m ago · Left side');
  });

  it('skips running and deleted feeds', () => {
    const running = makeEvent('breast_feed', { startedAt: at('12:00'), endedAt: null });
    const deleted = { ...endedFeed, deletedAt: at('11:00') };
    expect(lastFeedLine([running, deleted], NOW, 'metric')).toBe('No feeds logged yet');
  });
});

describe('lastNappyLine', () => {
  it('shows the latest nappy type and how long ago', () => {
    const older = makeEvent('nappy', { startedAt: at('09:00') });
    const latest = makeEvent('nappy', {
      startedAt: at('11:10'),
      details: { ...older.details, wet: true, dirty: true },
    });
    expect(lastNappyLine([older, latest], NOW)).toBe('Both · 1h 20m ago');
  });

  it('skips deleted and unfinished nappies', () => {
    const deleted = makeEvent('nappy', { startedAt: at('12:00'), deletedAt: at('12:05') });
    const pending = makeEvent('nappy', {
      startedAt: at('12:10'),
      details: { ...deleted.details, typePending: true },
    });
    expect(lastNappyLine([deleted, pending], NOW)).toBeNull();
  });
});

describe('runningBreastFeed', () => {
  it('finds the running breastfeed only', () => {
    const feed = makeEvent('breast_feed', { startedAt: at('12:00'), endedAt: null });
    const nap = makeEvent('sleep', { startedAt: at('11:00'), endedAt: null });
    expect(runningBreastFeed([nap, feed])).toBe(feed);
    expect(runningBreastFeed([nap])).toBeNull();
  });
});

describe('chairFeedView', () => {
  it('shows the open side and both side timers', () => {
    const feed = makeEvent('breast_feed', {
      startedAt: at('12:00'),
      endedAt: null,
      segments: [
        { side: 'left', startedAt: at('12:00'), endedAt: at('12:08') },
        { side: 'right', startedAt: at('12:08'), endedAt: null },
      ],
    });
    expect(chairFeedView(feed, new Date('2026-10-06T12:12:34Z'))).toEqual({
      paused: false,
      side: 'right',
      title: 'Feeding · Right',
      timer: '12:34',
      sides: 'Left 8:00 · Right 4:34',
      pausedFor: null,
    });
  });

  it('shows how long a paused feed has been paused', () => {
    const feed = makeEvent('breast_feed', {
      startedAt: at('12:00'),
      endedAt: null,
      segments: [{ side: 'left', startedAt: at('12:00'), endedAt: at('12:10') }],
    });
    expect(chairFeedView(feed, new Date('2026-10-06T12:13:00Z'))).toMatchObject({
      paused: true,
      side: 'left',
      title: 'Paused · Left',
      timer: '10:00',
      pausedFor: 'Paused 3m',
    });
    expect(chairFeedView(feed, new Date('2026-10-06T12:10:20Z')).pausedFor).toBe('Just paused');
  });
});

describe('chairFeedSummary', () => {
  it('totals the feed and each side used', () => {
    expect(chairFeedSummary(endedFeed, new Date(at('10:20')))).toEqual({
      title: 'Fed 20m',
      sides: 'Left 12m · Right 8m',
    });
  });

  it('leaves out a side that was barely used', () => {
    const oneSide = {
      ...endedFeed,
      segments: [{ side: 'left' as const, startedAt: at('10:00'), endedAt: at('10:15') }],
    };
    expect(chairFeedSummary(oneSide, new Date(at('10:15'))).sides).toBe('Left 15m');
  });
});

describe('bottle amounts', () => {
  it('steps in 10 ml or half ounces and stays in range', () => {
    expect(stepBottleAmount(120, 1, 'metric')).toBe(130);
    expect(stepBottleAmount(10, -1, 'metric')).toBe(10);
    expect(stepBottleAmount(400, 1, 'metric')).toBe(400);
    expect(stepBottleAmount(4, 1, 'imperial')).toBe(4.5);
    expect(stepBottleAmount(0.5, -1, 'imperial')).toBe(0.5);
  });

  it('starts from the last bottle, rounded to a step', () => {
    const bottle = makeEvent('bottle', { details: { content: 'formula', amountMl: 125, amountLeftMl: null } });
    expect(defaultBottleAmount([bottle], 'metric')).toBe(130);
    expect(defaultBottleAmount([bottle], 'imperial')).toBe(4);
    expect(defaultBottleAmount([], 'metric')).toBe(120);
    expect(defaultBottleAmount([], 'imperial')).toBe(4);
  });

  it('starts with the last bottle content', () => {
    const formula = makeEvent('bottle', { details: { content: 'formula', amountMl: 90, amountLeftMl: null } });
    const other = makeEvent('bottle', { details: { content: 'other', amountMl: 90, amountLeftMl: null } });
    expect(defaultBottleContent([formula])).toBe('formula');
    expect(defaultBottleContent([other])).toBe('breast_milk');
    expect(defaultBottleContent([])).toBe('breast_milk');
  });

  it('formats without float noise', () => {
    expect(formatBottleAmount(4.5)).toBe('4.5');
    expect(formatBottleAmount(120)).toBe('120');
  });

  it('builds a bottle draft in ml', () => {
    const draft = chairBottleDraft(4, 'mixed', 'imperial', NOW);
    expect(draft).toMatchObject({ type: 'bottle', startedAt: NOW.toISOString() });
    expect(draft.type === 'bottle' && draft.details).toMatchObject({ content: 'mixed', amountMl: 118 });
  });
});

describe('chairNappyDraft', () => {
  it('saves the chosen type', () => {
    const draft = chairNappyDraft('both', NOW);
    expect(draft.type === 'nappy' && draft.details).toMatchObject({ wet: true, dirty: true });
    expect(draft.type === 'nappy' && 'typePending' in draft.details).toBe(false);
  });
});

describe('chairDimmed', () => {
  const night = { timeZone: 'UTC', start: 19 * 60, end: 7 * 60 };
  const late = new Date('2026-10-06T23:00:00Z');

  it('dims at night once the screen has not been touched for 30 seconds', () => {
    expect(chairDimmed(night, late, late.getTime() - 31_000)).toBe(true);
    expect(chairDimmed(night, late, late.getTime() - 10_000)).toBe(false);
  });

  it('knows when it is night', () => {
    expect(chairIsNight(night, late)).toBe(true);
    expect(chairIsNight(night, NOW)).toBe(false);
    expect(chairIsNight(null, late)).toBe(false);
  });

  it('never dims during the day or without a night window', () => {
    expect(chairDimmed(night, NOW, 0)).toBe(false);
    expect(chairDimmed(null, late, 0)).toBe(false);
  });
});
