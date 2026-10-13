import { describe, expect, it } from 'vitest';
import { makeEvent } from '../events/test-events';
import type { BabyEvent } from '../events/types';
import type { TimelineItem } from './day-layout';
import { formatFraction, LABEL_MIN_FRAC, partSpan, showsItemLabel, timelineItemLabel } from './item-label';

const item = (event: BabyEvent, startFrac = 0, endFrac = 0.1): TimelineItem => ({
  event,
  startFrac,
  endFrac,
  running: false,
  continuesBefore: false,
  continuesAfter: false,
  column: 0,
  parts: [],
});
const label = (event: BabyEvent) => timelineItemLabel(item(event), 'UTC', 'metric');

describe('timelineItemLabel', () => {
  it('labels sessions with their time and length, or running', () => {
    const sleep = makeEvent('sleep', { startedAt: '2026-10-06T14:00:00Z', endedAt: '2026-10-06T15:30:00Z' });
    expect(label(sleep)).toBe('Sleep 2:00 pm, 1h 30m');
    expect(label({ ...sleep, endedAt: null })).toBe('Sleep 2:00 pm, running');
    const feed = makeEvent('breast_feed', { startedAt: '2026-10-06T08:00:00Z', endedAt: '2026-10-06T08:20:00Z' });
    expect(label(feed)).toBe('Breastfeed 8:00 am, 20m');
    const pump = makeEvent('pump', { startedAt: '2026-10-06T08:00:00Z', endedAt: '2026-10-06T08:20:00Z' });
    expect(label(pump)).toBe('Pump 8:00 am, 20m');
  });

  it('labels instants with their detail', () => {
    const at = '2026-10-06T09:05:00Z';
    const bottle = makeEvent('bottle', {
      startedAt: at,
      details: { content: 'formula', amountMl: 90, amountLeftMl: 0 },
    });
    expect(label(bottle)).toBe('Bottle 9:05 am, 90 ml');
    expect(label({ ...bottle, details: { ...bottle.details, amountMl: null } })).toBe('Bottle 9:05 am');
    const solids = makeEvent('solids', {
      startedAt: at,
      details: { foods: ['Pear', 'Oats'], amount: null, reaction: null },
    });
    expect(label(solids)).toBe('Solids 9:05 am, Pear, Oats');
    const nappy = makeEvent('nappy', { startedAt: at });
    expect(label(nappy)).toBe('Nappy 9:05 am, wet');
  });

  it('labels custom entries with their title, time and length if they have one', () => {
    const bath = makeEvent('custom', {
      startedAt: '2026-10-06T18:00:00Z',
      endedAt: '2026-10-06T18:20:00Z',
      details: { title: 'Bath', description: '' },
    });
    expect(label(bath)).toBe('Bath 6:00 pm, 20m');
    expect(label({ ...bath, endedAt: bath.startedAt })).toBe('Bath 6:00 pm');
    expect(label({ ...bath, endedAt: null })).toBe('Bath 6:00 pm, running');
  });

  it('falls back to the time for other types', () => {
    expect(label(makeEvent('growth', { startedAt: '2026-10-06T09:05:00Z' }))).toBe('9:05 am');
  });
});

describe('label and part geometry', () => {
  it('shows a label only when the item is tall enough', () => {
    const event = makeEvent('sleep');
    expect(showsItemLabel(item(event, 0.1, 0.1 + LABEL_MIN_FRAC))).toBe(false);
    expect(showsItemLabel(item(event, 0.1, 0.1 + LABEL_MIN_FRAC + 0.001))).toBe(true);
  });

  it('places a part relative to its item', () => {
    const span = partSpan(item(makeEvent('breast_feed'), 0.2, 0.4), { startFrac: 0.25, endFrac: 0.35 });
    expect(span.top).toBeCloseTo(0.25);
    expect(span.height).toBeCloseTo(0.5);
  });

  it('survives an item with no height', () => {
    const span = partSpan(item(makeEvent('breast_feed'), 0.2, 0.2), { startFrac: 0.2, endFrac: 0.2 });
    expect(span).toEqual({ top: 0, height: 0 });
  });

  it('formats a fraction as a percentage', () => {
    expect(formatFraction(0.5)).toBe('50.000%');
    expect(formatFraction(1 / 3)).toBe('33.333%');
  });
});
