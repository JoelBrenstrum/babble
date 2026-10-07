import { describe, expect, it } from 'vitest';
import { describeEvent, summariseLatest } from './describe';
import { emptyDraft } from './drafts';
import { groupByDay } from './group';
import { otherSide, segmentTotals } from './segments';
import { makeEvent } from './test-events';
import { hasErrors, validateDraft } from './validate';

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
  it('accepts a fresh draft of every type except custom and growth', () => {
    for (const type of ['sleep', 'breast_feed', 'bottle', 'nappy', 'pump'] as const) {
      expect(validateDraft(emptyDraft(type, NOW), NOW)).toEqual({});
    }
  });

  it('requires a custom title and a growth measurement', () => {
    expect(validateDraft(emptyDraft('custom', NOW), NOW)).toEqual({ title: 'Give it a title.' });
    expect(validateDraft(emptyDraft('growth', NOW), NOW)).toEqual({ details: 'Enter at least one measurement.' });
  });

  it('rejects an end before the start and times in the future', () => {
    const draft = { ...emptyDraft('sleep', NOW), startedAt: '2026-10-06T10:00:00Z', endedAt: '2026-10-06T09:00:00Z' };
    expect(validateDraft(draft, NOW)).toEqual({ endedAt: 'The end must be after the start.' });
    const future = { ...emptyDraft('sleep', NOW), startedAt: '2026-10-06T11:00:00Z', endedAt: null };
    expect(validateDraft(future, NOW)).toEqual({ startedAt: "That's in the future." });
  });

  it('limits poo colours and requires a dirty nappy for poo details', () => {
    const draft = emptyDraft('nappy', NOW);
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
        { text: 'R 12m', tone: 'feed-right' },
        { text: '3m', tone: 'downtime' },
      ],
      duration: '22m',
      running: false,
    });
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
      { text: 'Dry', tone: 'nappy' },
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
      },
    } as typeof base;
    expect(describeEvent(both, NOW, 'metric').parts).toEqual([
      { text: 'Wet · Medium', tone: 'nappy' },
      { text: 'Dirty · Large', tone: 'nappy', pooColours: ['mustard', 'green'] },
    ]);
  });

  it('describes bottles using what was drunk', () => {
    const event = makeEvent('bottle', { details: { content: 'formula', amountMl: 120, amountLeftMl: 15 } });
    expect(describeEvent(event, NOW, 'metric').parts).toEqual([{ text: '105 ml formula', tone: 'bottle' }]);
    expect(describeEvent(event, NOW, 'imperial').parts[0]!.text).toBe('3.6 oz formula');
  });

  it('describes pumps and growth', () => {
    const pump = makeEvent('pump', { details: { leftMl: 60, rightMl: 50, totalMl: null } });
    expect(describeEvent(pump, NOW, 'metric').parts.map((p) => p.text)).toEqual(['L 60 ml', 'R 50 ml']);
    const totalOnly = makeEvent('pump', { details: { leftMl: null, rightMl: null, totalMl: 110 } });
    expect(describeEvent(totalOnly, NOW, 'metric').parts.map((p) => p.text)).toEqual(['110 ml']);
    const growth = makeEvent('growth', { details: { weightG: 3950, lengthMm: 510, headCircumferenceMm: 360 } });
    expect(describeEvent(growth, NOW, 'metric').parts.map((p) => p.text)).toEqual(['3.95 kg', '51 cm', 'Head 36 cm']);
  });

  it('marks running sessions and measures them up to now', () => {
    const sleep = makeEvent('sleep', { startedAt: '2026-10-06T09:18:00Z', endedAt: null });
    expect(describeEvent(sleep, NOW, 'metric')).toMatchObject({ running: true, duration: '1h 12m' });
    expect(summariseLatest(sleep, NOW, 'metric')).toBe('In progress');
  });

  it('summarises the latest entry for the home rows', () => {
    const nappy = makeEvent('nappy');
    expect(summariseLatest(nappy, NOW, 'metric')).toBe('Wet');
    const sleep = makeEvent('sleep', { startedAt: '2026-10-06T08:00:00Z', endedAt: '2026-10-06T09:40:00Z' });
    expect(summariseLatest(sleep, NOW, 'metric')).toBe('1h 40m');
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
