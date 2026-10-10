import { describe, expect, it } from 'vitest';
import { describeEvent, summariseLatest } from './describe';
import { emptyDraft, isInstant } from './drafts';
import { groupByDay } from './group';
import { otherSide, segmentTotals } from './segments';
import { makeEvent } from './test-events';
import { withNappyType } from './nappy';
import { hasErrors, needsChoice, validateDraft } from './validate';

const NOW = new Date('2026-10-06T10:30:00Z');

describe('segmentTotals', () => {
  it('sums closed segments per side and tracks the open one', () => {
    const totals = segmentTotals(
      [
        { side: 'left', startedAt: '2026-10-06T10:00:00Z', endedAt: '2026-10-06T10:10:32Z' },
        { side: 'right', startedAt: '2026-10-06T10:13:34Z', endedAt: '2026-10-06T10:25:57Z' },
        { side: 'left', startedAt: '2026-10-06T10:28:00Z', endedAt: null },
      ],
      NOW,
    );
    expect(totals).toEqual({
      leftMs: (10 * 60 + 32 + 120) * 1000,
      rightMs: (12 * 60 + 23) * 1000,
      activeMs: (10 * 60 + 32 + 120 + 12 * 60 + 23) * 1000,
      openSide: 'left',
      lastSide: 'left',
      openSegmentStartedAt: '2026-10-06T10:28:00Z',
    });
  });

  it('sorts segments before deciding the last side', () => {
    const totals = segmentTotals(
      [
        { side: 'right', startedAt: '2026-10-06T10:10:00Z', endedAt: '2026-10-06T10:20:00Z' },
        { side: 'left', startedAt: '2026-10-06T10:00:00Z', endedAt: '2026-10-06T10:10:00Z' },
      ],
      NOW,
    );
    expect(totals.lastSide).toBe('right');
    expect(totals.openSide).toBeNull();
  });

  it('handles no segments', () => {
    expect(segmentTotals([], NOW)).toMatchObject({ activeMs: 0, lastSide: null, openSide: null });
  });

  it('flips sides', () => {
    expect(otherSide('left')).toBe('right');
    expect(otherSide('right')).toBe('left');
  });
});

describe('validateDraft', () => {
  it('accepts a fresh draft of every type except custom, growth and nappy', () => {
    for (const type of ['sleep', 'breast_feed', 'bottle', 'pump'] as const) {
      expect(validateDraft(emptyDraft(type, NOW), NOW)).toEqual({});
    }
  });

  it('requires a nappy type to be picked', () => {
    const draft = emptyDraft('nappy', NOW);
    expect(validateDraft(draft, NOW)).toEqual({ type: 'Pick wet, dirty, both or dry.' });
    expect(needsChoice(draft)).toBe(true);
    const picked = { ...draft, details: withNappyType(draft.details, 'dry') };
    expect(validateDraft(picked, NOW)).toEqual({});
    expect(needsChoice(picked)).toBe(false);
  });

  it('requires a custom title and a growth measurement', () => {
    expect(validateDraft(emptyDraft('custom', NOW), NOW)).toEqual({ title: 'Give it a title.' });
    expect(validateDraft(emptyDraft('growth', NOW), NOW)).toEqual({ details: 'Enter at least one measurement.' });
  });

  it('requires at least one food for solids and limits the list', () => {
    const draft = emptyDraft('solids', NOW);
    expect(validateDraft(draft, NOW)).toEqual({ foods: 'Add at least one food.' });
    const withFoods = (foods: string[]) => validateDraft({ ...draft, details: { ...draft.details, foods } }, NOW);
    expect(withFoods(['Avocado'])).toEqual({});
    expect(withFoods(['a'.repeat(41)])).toEqual({ foods: 'Keep each food under 40 characters.' });
    expect(withFoods(Array.from({ length: 21 }, (_, index) => `Food ${index}`))).toEqual({
      foods: 'Add up to 20 foods.',
    });
  });

  it('rejects an end before the start and times in the future', () => {
    const draft = { ...emptyDraft('sleep', NOW), startedAt: '2026-10-06T10:00:00Z', endedAt: '2026-10-06T09:00:00Z' };
    expect(validateDraft(draft, NOW)).toEqual({ endedAt: 'The end must be after the start.' });
    const future = { ...emptyDraft('sleep', NOW), startedAt: '2026-10-06T11:00:00Z', endedAt: null };
    expect(validateDraft(future, NOW)).toEqual({ startedAt: "That's in the future." });
  });

  it('limits poo colours and requires a dirty nappy for poo details', () => {
    const empty = emptyDraft('nappy', NOW);
    const draft = { ...empty, details: withNappyType(empty.details, 'wet') };
    expect(
      validateDraft(
        { ...draft, details: { ...draft.details, dirty: true, pooColours: ['yellow', 'green', 'brown'] } },
        NOW,
      ),
    ).toEqual({ pooColours: 'Pick up to two colours.' });
    expect(validateDraft({ ...draft, details: { ...draft.details, dirty: false, pooSize: 'large' } }, NOW)).toEqual({
      dirty: 'Poo details need a dirty nappy.',
    });
  });

  it('checks bottle and growth ranges', () => {
    const bottle = emptyDraft('bottle', NOW);
    expect(validateDraft({ ...bottle, details: { ...bottle.details, amountMl: 90, amountLeftMl: 100 } }, NOW)).toEqual({
      amountLeftMl: "Left over can't be more than the bottle.",
    });
    const growth = emptyDraft('growth', NOW);
    expect(hasErrors(validateDraft({ ...growth, details: { ...growth.details, weightG: 3950 } }, NOW))).toBe(false);
    expect(validateDraft({ ...growth, details: { ...growth.details, weightG: 39 } }, NOW)).toEqual({
      weightG: 'That weight looks wrong.',
    });
  });
});

describe('describeEvent', () => {
  it('describes a finished breastfeed with downtime', () => {
    const event = makeEvent('breast_feed', {
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: '2026-10-06T10:25:57Z',
      segments: [
        { side: 'left', startedAt: '2026-10-06T10:00:00Z', endedAt: '2026-10-06T10:10:32Z' },
        { side: 'right', startedAt: '2026-10-06T10:13:34Z', endedAt: '2026-10-06T10:25:57Z' },
      ],
    });
    expect(describeEvent(event, NOW, 'metric')).toEqual({
      title: 'Breastfeed',
      parts: [
        { text: 'L 10m', tone: 'feed-left' },
        { text: '3m', tone: 'downtime', icon: 'pause' },
        { text: 'R 12m', tone: 'feed-right' },
      ],
      duration: '22m',
      trailing: '22m',
      running: false,
    });
  });

  it('lists breastfeed sides in the order they happened', () => {
    const event = makeEvent('breast_feed', {
      startedAt: '2026-10-06T09:00:00Z',
      endedAt: '2026-10-06T09:30:00Z',
      segments: [
        { side: 'right', startedAt: '2026-10-06T09:00:00Z', endedAt: '2026-10-06T09:10:00Z' },
        { side: 'left', startedAt: '2026-10-06T09:10:00Z', endedAt: '2026-10-06T09:25:00Z' },
      ],
    });
    expect(describeEvent(event, NOW, 'metric').parts.map((p) => p.text)).toEqual(['R 10m', 'L 15m', '5m']);
  });

  it('hides downtime for imported feeds', () => {
    const event = makeEvent('breast_feed', {
      source: 'huckleberry_csv',
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: '2026-10-06T10:30:00Z',
      segments: [{ side: 'right', startedAt: '2026-10-06T10:00:00Z', endedAt: '2026-10-06T10:20:00Z' }],
    });
    expect(describeEvent(event, NOW, 'metric').parts).toEqual([{ text: 'R 20m', tone: 'feed-right' }]);
  });

  it('describes nappies, including dry and colours', () => {
    const base = makeEvent('nappy');
    expect(describeEvent({ ...base, details: { ...base.details, wet: false } }, NOW, 'metric').parts).toEqual([
      { text: 'Dry', tone: 'nappy', icon: 'circle' },
    ]);
    const both = {
      ...base,
      details: {
        ...base.details,
        wet: true,
        wetSize: 'medium',
        dirty: true,
        pooSize: 'large',
        pooColours: ['mustard', 'green'],
        pooTextures: ['seedy'],
      },
    } as typeof base;
    expect(describeEvent(both, NOW, 'metric')).toMatchObject({
      parts: [
        { text: 'Both', tone: 'nappy', icon: 'layers' },
        { text: 'Seedy', tone: 'neutral' },
        { text: 'Mustard + green', tone: 'neutral', pooColours: ['mustard', 'green'] },
      ],
      trailing: 'Large',
    });
    const black = {
      ...both,
      details: { ...both.details, wet: false, pooColours: ['black'], pooTextures: [] },
    } as typeof base;
    expect(describeEvent(black, NOW, 'metric').parts).toEqual([
      { text: 'Dirty', tone: 'nappy', icon: 'circle-dot' },
      { text: 'Black', tone: 'neutral', pooColours: ['black'] },
      { text: 'Check', tone: 'caution', icon: 'stethoscope' },
    ]);
    expect(describeEvent({ ...base, details: { ...base.details, wetSize: 'tiny' } }, NOW, 'metric')).toMatchObject({
      parts: [{ text: 'Wet', icon: 'droplet' }],
      trailing: 'Tiny',
    });
  });

  it('describes bottles using what was drunk', () => {
    const event = makeEvent('bottle', { details: { content: 'formula', amountMl: 120, amountLeftMl: 15 } });
    expect(describeEvent(event, NOW, 'metric').parts).toEqual([{ text: '105 ml formula', tone: 'bottle' }]);
    expect(describeEvent(event, NOW, 'imperial').parts[0]!.text).toBe('3.6 oz formula');
  });

  it('describes pumps and growth', () => {
    const pump = makeEvent('pump', { details: { leftMl: 60, rightMl: 50, totalMl: null } });
    expect(describeEvent(pump, NOW, 'metric').parts.map((p) => p.text)).toEqual(['L 60 ml', 'R 50 ml']);
    expect(describeEvent(pump, NOW, 'metric').trailing).toBe('110 ml');
    expect(summariseLatest(pump, NOW, 'metric')).toBe('110 ml');
    const totalOnly = makeEvent('pump', { details: { leftMl: null, rightMl: null, totalMl: 110 } });
    expect(describeEvent(totalOnly, NOW, 'metric')).toMatchObject({ parts: [], trailing: '110 ml' });
    const growth = makeEvent('growth', { details: { weightG: 3950, lengthMm: 510, headCircumferenceMm: 360 } });
    expect(describeEvent(growth, NOW, 'metric').parts).toEqual([
      { text: '3.95 kg', tone: 'growth', icon: 'weight' },
      { text: '51 cm', tone: 'growth', icon: 'ruler' },
      { text: 'Head 36 cm', tone: 'growth', icon: 'circle-dashed' },
    ]);
  });

  it('shows pump sides with time, amount and idle time', () => {
    const pump = makeEvent('pump', {
      startedAt: '2026-10-06T09:00:00Z',
      endedAt: '2026-10-06T09:19:00Z',
      details: { leftMl: 60, rightMl: 55, totalMl: null },
      segments: [
        { side: 'left', startedAt: '2026-10-06T09:00:00Z', endedAt: '2026-10-06T09:08:00Z' },
        { side: 'right', startedAt: '2026-10-06T09:09:00Z', endedAt: '2026-10-06T09:19:00Z' },
      ],
    });
    expect(describeEvent(pump, NOW, 'imperial').trailing).toBe('3.9 oz');
    expect(describeEvent(pump, NOW, 'metric')).toMatchObject({
      parts: [
        { text: 'L 8m · 60 ml', tone: 'pump' },
        { text: '1m', tone: 'downtime' },
        { text: 'R 10m · 55 ml', tone: 'pump' },
      ],
      duration: '18m',
      trailing: '115 ml',
    });
  });

  it('marks running sessions and measures them up to now', () => {
    const sleep = makeEvent('sleep', { startedAt: '2026-10-06T09:18:00Z', endedAt: null });
    expect(describeEvent(sleep, NOW, 'metric')).toMatchObject({
      running: true,
      duration: '1h 12m',
      parts: [{ text: 'In progress', tone: 'active', icon: 'play' }],
    });
    expect(summariseLatest(sleep, NOW, 'metric')).toBe('In progress · 1h 12m');
    const justStarted = makeEvent('custom', { startedAt: '2026-10-06T10:29:30Z', endedAt: null });
    expect(summariseLatest(justStarted, NOW, 'metric')).toBe('In progress');
  });

  it('describes solids with foods, reaction and amount', () => {
    const solids = makeEvent('solids', {
      details: { foods: ['Avocado', 'Pear'], amount: 'some', reaction: 'loved' },
    });
    expect(describeEvent(solids, NOW, 'metric')).toEqual({
      title: 'Solids',
      parts: [
        { text: 'Avocado, Pear', tone: 'solids' },
        { text: 'Loved it', tone: 'neutral' },
      ],
      duration: null,
      trailing: 'Some',
      running: false,
    });
    expect(summariseLatest(solids, NOW, 'metric')).toBe('Avocado, Pear');
    expect(isInstant(solids)).toBe(true);
  });

  it('summarises the latest entry for the home rows', () => {
    const nappy = makeEvent('nappy');
    expect(summariseLatest(nappy, NOW, 'metric')).toBe('Wet');
    const sleep = makeEvent('sleep', { startedAt: '2026-10-06T08:00:00Z', endedAt: '2026-10-06T09:40:00Z' });
    expect(summariseLatest(sleep, NOW, 'metric')).toBe('1h 40m');
    const feed = makeEvent('breast_feed', {
      startedAt: '2026-10-06T09:00:00Z',
      endedAt: '2026-10-06T09:30:00Z',
      segments: [
        { side: 'left', startedAt: '2026-10-06T09:00:00Z', endedAt: '2026-10-06T09:10:00Z' },
        { side: 'right', startedAt: '2026-10-06T09:15:00Z', endedAt: '2026-10-06T09:30:00Z' },
      ],
    });
    expect(summariseLatest(feed, NOW, 'metric')).toBe('L 10m · R 15m');
    const custom = makeEvent('custom', { details: { title: 'Bath', description: '' } });
    expect(describeEvent(custom, NOW, 'metric').title).toBe('Bath');
  });
});

describe('groupByDay', () => {
  it('groups newest first using the baby timezone and day start', () => {
    const events = [
      { startedAt: '2026-10-05T17:30:00Z' },
      { startedAt: '2026-10-05T18:30:00Z' },
      { startedAt: '2026-10-06T02:00:00Z' },
    ];
    expect(groupByDay(events, 'Pacific/Auckland', 0)).toEqual([
      { dayKey: '2026-10-06', items: [events[2], events[1], events[0]] },
    ]);
    expect(groupByDay(events, 'Pacific/Auckland', 420)).toEqual([
      { dayKey: '2026-10-06', items: [events[2], events[1]] },
      { dayKey: '2026-10-05', items: [events[0]] },
    ]);
  });
});

describe('describeEvent for naps', () => {
  it('shows wake-ups and awake time for a nap that was paused', () => {
    const nap = makeEvent('sleep', {
      startedAt: '2026-10-06T08:00:00Z',
      endedAt: '2026-10-06T09:30:00Z',
      segments: [
        { startedAt: '2026-10-06T08:00:00Z', endedAt: '2026-10-06T08:50:00Z' },
        { startedAt: '2026-10-06T09:00:00Z', endedAt: '2026-10-06T09:30:00Z' },
      ],
    });
    expect(describeEvent(nap, NOW, 'metric')).toMatchObject({
      duration: '1h 20m',
      parts: [
        { text: '1 wake-up', tone: 'sleep' },
        { text: 'awake 10m', tone: 'downtime' },
      ],
    });
    expect(describeEvent({ ...nap, segments: [] }, NOW, 'metric')).toMatchObject({ duration: '1h 30m', parts: [] });
  });

  it('shows locations and moods after the wake-ups', () => {
    const nap = makeEvent('sleep', {
      startedAt: '2026-10-06T08:00:00Z',
      endedAt: '2026-10-06T09:00:00Z',
      details: {
        locations: ['car', 'swing'],
        fallAsleep: null,
        startMoods: ['upset'],
        endMoods: ['happy'],
        wokenByCarer: false,
      },
    });
    expect(describeEvent(nap, NOW, 'metric').parts).toEqual([
      { text: 'Car', tone: 'sleep' },
      { text: 'Swing', tone: 'sleep' },
      { text: 'Upset → happy', tone: 'neutral' },
    ]);
    const happy = { ...nap, details: { ...nap.details, locations: [], startMoods: [] } } as typeof nap;
    expect(describeEvent(happy, NOW, 'metric').parts).toEqual([{ text: 'Happy', tone: 'neutral' }]);
    expect(summariseLatest(nap, NOW, 'metric')).toBe('1h 00m');
  });
});
