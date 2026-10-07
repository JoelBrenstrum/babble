import { describe, expect, it } from 'vitest';
import { makeEvent } from '../events/test-events';
import { formatWeightChange } from '../format/units';
import { listStrip, sinceItem, stripKind, stripWindow, type StripContext } from './list-strip';

const context: StripContext = {
  now: new Date('2026-10-08T12:00:00Z'),
  timeZone: 'UTC',
  dayStartMinutes: 0,
  nightStartMinutes: 19 * 60,
  nightEndMinutes: 7 * 60,
  units: 'metric',
  birthDate: '2026-09-08',
  sex: 'female',
};

let ids = 0;
const id = () => `event-${(ids += 1)}`;

const breastFeed = (startedAt: string, endedAt: string | null, side: 'left' | 'right') =>
  makeEvent('breast_feed', {
    id: id(),
    startedAt,
    endedAt,
    segments: [{ side, startedAt, endedAt }],
  });
const bottle = (startedAt: string, amountMl: number) =>
  makeEvent('bottle', {
    id: id(),
    startedAt,
    endedAt: null,
    details: { amountMl, amountLeftMl: null, content: 'formula' },
  });
const nappy = (startedAt: string, wet: boolean, dirty: boolean) =>
  makeEvent('nappy', {
    id: id(),
    startedAt,
    endedAt: null,
    details: { ...makeEvent('nappy').details, wet, dirty, pooColours: dirty ? ['mustard'] : [] },
  });
const sleep = (startedAt: string, endedAt: string | null) => makeEvent('sleep', { id: id(), startedAt, endedAt });
const weight = (startedAt: string, weightG: number, lengthMm: number | null = null) =>
  makeEvent('growth', {
    id: id(),
    startedAt,
    endedAt: null,
    details: { weightG, lengthMm, headCircumferenceMm: null },
  });

describe('stripKind', () => {
  it('splits feeds by the filter and keeps other trackers', () => {
    expect(stripKind('breast_feed', 'all')).toBe('feeds');
    expect(stripKind('breast_feed', 'bottle')).toBe('bottle');
    expect(stripKind('bottle', 'breast')).toBe('breast');
    expect(stripKind('nappy', 'all')).toBe('nappy');
  });
});

describe('stripWindow', () => {
  it('covers the last 7 finished days and today', () => {
    expect(stripWindow(context.now, 'UTC', 0)).toEqual({
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-10-09T00:00:00.000Z',
    });
  });
});

describe('sinceItem', () => {
  it('shows the time since the last entry ended', () => {
    expect(sinceItem('nappy', [nappy('2026-10-08T10:40:00Z', true, false)], context)).toEqual({
      label: 'Last change',
      value: '1h 20m',
      note: 'ago · 10:40 am',
    });
  });

  it('counts a running session from its start', () => {
    expect(sinceItem('sleep', [sleep('2026-10-08T11:15:00Z', null)], context)).toEqual({
      label: 'Asleep for',
      value: '45m',
      note: 'since 11:15 am',
    });
  });

  it('switches to days after a day and handles nothing logged', () => {
    expect(
      sinceItem(
        'pump',
        [makeEvent('pump', { startedAt: '2026-10-05T09:00:00Z', endedAt: '2026-10-05T09:20:00Z' })],
        context,
      ),
    ).toEqual({ label: 'Last pump', value: '3 days', note: 'ago · 5 Oct' });
    expect(sinceItem('custom', [], context)).toEqual({ label: 'Last', value: '—' });
    expect(sinceItem('nappy', [nappy('2026-10-08T11:59:30Z', true, false)], context)).toEqual({
      label: 'Last change',
      value: 'Just now',
    });
  });
});

describe('listStrip', () => {
  it('summarises feeds with a daily average and the next side', () => {
    const events = [
      breastFeed('2026-10-06T08:00:00Z', '2026-10-06T08:20:00Z', 'left'),
      breastFeed('2026-10-06T11:00:00Z', '2026-10-06T11:20:00Z', 'right'),
      bottle('2026-10-07T09:00:00Z', 90),
      breastFeed('2026-10-08T09:00:00Z', '2026-10-08T09:30:00Z', 'left'),
    ];
    expect(listStrip('feeds', events, context)).toEqual([
      { label: 'Last feed', value: '2h 30m', note: 'ago · 9:30 am' },
      { label: 'Today', value: '1', note: 'avg 1.5' },
      { label: 'Next side', value: 'Right' },
    ]);
    expect(listStrip('breast', events, context)[1]).toEqual({ label: 'Today', value: '1', note: 'avg 1' });
  });

  it('counts an entry once when it is passed twice', () => {
    const feed = breastFeed('2026-10-08T09:00:00Z', '2026-10-08T09:30:00Z', 'left');
    expect(listStrip('feeds', [feed, feed], context)[1]).toEqual({ label: 'Today', value: '1' });
  });

  it('leaves out the average before anything was logged', () => {
    expect(
      listStrip('feeds', [breastFeed('2026-10-08T09:00:00Z', '2026-10-08T09:30:00Z', 'left')], context)[1],
    ).toEqual({
      label: 'Today',
      value: '1',
    });
  });

  it('summarises bottles by volume', () => {
    const events = [
      bottle('2026-10-07T09:00:00Z', 120),
      bottle('2026-10-08T09:00:00Z', 60),
      bottle('2026-10-08T11:00:00Z', 90),
    ];
    expect(listStrip('bottle', events, context)).toEqual([
      { label: 'Last bottle', value: '1h 00m', note: 'ago · 11:00 am' },
      { label: 'Today', value: '150 ml', note: 'avg 120 ml' },
      { label: 'Per bottle', value: '90 ml' },
    ]);
  });

  it('summarises sleep and naps', () => {
    const events = [
      sleep('2026-10-07T10:00:00Z', '2026-10-07T12:00:00Z'),
      sleep('2026-10-08T09:00:00Z', '2026-10-08T10:30:00Z'),
    ];
    expect(listStrip('sleep', events, context)).toEqual([
      { label: 'Awake for', value: '1h 30m', note: 'ago · 10:30 am' },
      { label: 'Today', value: '1h 30m', note: 'avg 2h 00m' },
      { label: 'Naps', value: '1', note: 'avg 1' },
    ]);
  });

  it('summarises nappies with the latest poo colour', () => {
    const events = [nappy('2026-10-07T09:00:00Z', true, true), nappy('2026-10-08T09:00:00Z', true, false)];
    expect(listStrip('nappy', events, context)).toEqual([
      { label: 'Last change', value: '3h 00m', note: 'ago · 9:00 am' },
      { label: 'Wet today', value: '1', note: 'avg 1' },
      { label: 'Dirty today', value: '0', note: 'avg 1', swatch: 'mustard' },
    ]);
  });

  it('summarises pumping by side', () => {
    const events = [
      makeEvent('pump', {
        id: id(),
        startedAt: '2026-10-08T08:00:00Z',
        endedAt: '2026-10-08T08:20:00Z',
        details: { leftMl: 60, rightMl: 50, totalMl: null },
      }),
    ];
    expect(listStrip('pump', events, context).slice(1)).toEqual([
      { label: 'Today', value: '110 ml' },
      { label: 'Left / right', value: '60 / 50', note: 'ml today' },
    ]);
  });

  it('shows the latest growth with percentiles and the weight change', () => {
    const events = [weight('2026-10-02T09:00:00Z', 4000), weight('2026-10-08T09:00:00Z', 4180, 540)];
    const [weightItem, change, length] = listStrip('growth', events, context);
    expect(weightItem).toMatchObject({ label: 'Weight', value: '4.18 kg' });
    expect(weightItem!.note).toMatch(/^\d+(st|nd|rd|th) percentile$/);
    expect(change).toEqual({ label: 'Change', value: '+180 g', note: 'in 6 days' });
    expect(length).toMatchObject({ label: 'Length', value: '54 cm' });
    expect(listStrip('growth', events, { ...context, sex: null })[0]).toEqual({ label: 'Weight', value: '4.18 kg' });
    expect(listStrip('growth', [], context)).toEqual([
      { label: 'Weight', value: '—' },
      { label: 'Change', value: '—' },
      { label: 'Length', value: '—' },
    ]);
  });

  it('counts custom events today and over 7 days', () => {
    const events = [
      makeEvent('custom', { id: id(), startedAt: '2026-10-01T09:00:00Z', endedAt: null }),
      makeEvent('custom', { id: id(), startedAt: '2026-10-03T09:00:00Z', endedAt: null }),
      makeEvent('custom', { id: id(), startedAt: '2026-10-08T09:00:00Z', endedAt: null }),
    ];
    expect(listStrip('custom', events, context).slice(1)).toEqual([
      { label: 'Today', value: '1' },
      { label: '7 days', value: '2' },
    ]);
  });
});

describe('formatWeightChange', () => {
  it.each([
    [180, 'metric', '+180 g'],
    [-45, 'metric', '−45 g'],
    [1250, 'metric', '+1.25 kg'],
    [0.2, 'metric', '0 g'],
    [170, 'imperial', '+6 oz'],
    [600, 'imperial', '+1 lb 5 oz'],
  ] as const)('%d g %s → %s', (grams, units, expected) => expect(formatWeightChange(grams, units)).toBe(expected));
});
