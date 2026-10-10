import { describe, expect, it } from 'vitest';
import { makeEvent } from '../events/test-events';
import { withNappyType } from '../events/nappy';
import type { BabyEvent } from '../events/types';
import { dayHeading, dayTotals, listDayGroups, type DayGroupContext } from './day-groups';

const NOW = new Date('2026-10-06T10:30:00Z');
const context: DayGroupContext = {
  now: NOW,
  timeZone: 'UTC',
  dayStartMinutes: 0,
  units: 'metric',
  birthDate: '2026-09-25',
};

function nappy(type: 'wet' | 'dirty' | 'both' | 'dry') {
  const base = makeEvent('nappy');
  return { ...base, details: withNappyType(base.details, type) };
}

describe('dayHeading', () => {
  it('adds the date to today and yesterday only', () => {
    expect(dayHeading('2026-10-06', '2026-10-06')).toEqual({ title: 'Today', subtitle: 'Tue 6 Oct' });
    expect(dayHeading('2026-10-05', '2026-10-06')).toEqual({ title: 'Yesterday', subtitle: 'Mon 5 Oct' });
    expect(dayHeading('2026-10-02', '2026-10-06')).toEqual({ title: 'Fri 2 Oct', subtitle: null });
  });
});

describe('dayTotals', () => {
  it('counts time asleep, leaving out awake time in paused naps', () => {
    const nap = makeEvent('sleep', {
      startedAt: '2026-10-06T08:00:00Z',
      endedAt: '2026-10-06T09:30:00Z',
      segments: [
        { startedAt: '2026-10-06T08:00:00Z', endedAt: '2026-10-06T08:50:00Z' },
        { startedAt: '2026-10-06T09:00:00Z', endedAt: '2026-10-06T09:30:00Z' },
      ],
    });
    const running = makeEvent('sleep', { startedAt: '2026-10-06T10:00:00Z', endedAt: null });
    expect(dayTotals('sleep', [running, nap], context)).toBe('2 sleeps · 1h 50m');
  });

  it('splits nappies into wet and dirty', () => {
    expect(dayTotals('nappy', [nappy('wet'), nappy('both'), nappy('dirty')], context)).toBe('3 · 2 wet · 2 dirty');
    expect(dayTotals('nappy', [nappy('dry')], context)).toBe('1');
  });

  it('adds up pumps and bottles in the chosen units', () => {
    const pumps = [
      makeEvent('pump', { details: { leftMl: 60, rightMl: 55, totalMl: null } }),
      makeEvent('pump', { details: { leftMl: null, rightMl: null, totalMl: 100 } }),
    ];
    expect(dayTotals('pump', pumps.slice(0, 1), context)).toBe('1 session · 115 ml');
    expect(dayTotals('pump', pumps, context)).toBe('2 sessions · 215 ml');
    const bottles = [
      makeEvent('bottle', { details: { content: 'formula', amountMl: 100, amountLeftMl: 10 } }),
      makeEvent('bottle', { details: { content: 'breast_milk', amountMl: 90, amountLeftMl: null } }),
    ];
    expect(dayTotals('bottle', bottles, context)).toBe('2 bottles · 180 ml');
    expect(dayTotals('bottle', bottles, { ...context, units: 'imperial' })).toBe('2 bottles · 6.1 oz');
  });

  it('sums breastfeed time and adds bottle amounts for all feeds', () => {
    const feed = makeEvent('breast_feed', {
      startedAt: '2026-10-06T09:00:00Z',
      endedAt: '2026-10-06T09:40:00Z',
      segments: [
        { side: 'left', startedAt: '2026-10-06T09:00:00Z', endedAt: '2026-10-06T09:30:00Z' },
        { side: 'right', startedAt: '2026-10-06T09:30:00Z', endedAt: '2026-10-06T09:40:00Z' },
      ],
    });
    const bottle = makeEvent('bottle', { details: { content: 'formula', amountMl: 90, amountLeftMl: null } });
    expect(dayTotals('breast', [feed], context)).toBe('1 feed · 40m');
    expect(dayTotals('feeds', [feed, bottle], context)).toBe('2 feeds · 40m · 90 ml');
  });

  it('counts solids meals and different foods', () => {
    const meal = (foods: string[]) => makeEvent('solids', { details: { foods, amount: null, reaction: null } });
    expect(dayTotals('solids', [meal(['Avocado', 'Pear']), meal(['pear'])], context)).toBe('2 meals · 2 foods');
    expect(dayTotals('solids', [meal(['Egg'])], context)).toBe('1 meal · 1 food');
  });

  it('counts custom events', () => {
    expect(dayTotals('custom', [makeEvent('custom')], context)).toBe('1 event');
  });
});

describe('listDayGroups', () => {
  const growth = (startedAt: string, weightG: number | null, notes: string | null = null) =>
    makeEvent('growth', {
      id: startedAt,
      startedAt,
      endedAt: startedAt,
      notes,
      details: { weightG, lengthMm: null, headCircumferenceMm: null },
    });

  it('shows weight change since the previous weighing, birth and notes for growth', () => {
    const events: BabyEvent[] = [
      growth('2026-10-06T09:00:00Z', 3420),
      growth('2026-10-02T11:00:00Z', 3380, 'Midwife visit'),
      growth('2026-09-28T09:40:00Z', null),
      growth('2026-09-25T06:12:00Z', 3300),
    ];
    expect(
      listDayGroups('growth', events, context).map(({ title, subtitle, totals, notesInSubtitle }) => ({
        title,
        subtitle,
        totals,
        notesInSubtitle,
      })),
    ).toEqual([
      { title: 'Today', subtitle: 'Tue 6 Oct', totals: '+40 g since 2 Oct', notesInSubtitle: false },
      { title: 'Fri 2 Oct', subtitle: 'Midwife visit', totals: '+80 g since 25 Sept', notesInSubtitle: true },
      { title: 'Mon 28 Sept', subtitle: null, totals: '1 measurement', notesInSubtitle: false },
      { title: 'Birth', subtitle: 'Fri 25 Sept', totals: '1 measurement', notesInSubtitle: false },
    ]);
  });

  it('labels other lists by day with totals', () => {
    const events = [
      { ...nappy('wet'), id: 'a', startedAt: '2026-10-06T09:00:00Z' },
      { ...nappy('both'), id: 'b', startedAt: '2026-10-05T09:00:00Z' },
    ];
    expect(listDayGroups('nappy', events, context).map((group) => [group.title, group.subtitle, group.totals])).toEqual(
      [
        ['Today', 'Tue 6 Oct', '1 · 1 wet'],
        ['Yesterday', 'Mon 5 Oct', '1 · 1 wet · 1 dirty'],
      ],
    );
  });
});
