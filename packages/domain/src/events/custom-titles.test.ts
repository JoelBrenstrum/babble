import { describe, expect, it } from 'vitest';
import {
  canSaveCustomTitle,
  customMinutes,
  customTitleEntry,
  customTitleHint,
  formatCustomAmount,
  matchingCustomTitle,
  MAX_SAVED_CUSTOM_TITLES,
  normaliseCustomTitle,
  withCustomKind,
  withCustomMinutes,
  withCustomStart,
  withCustomTitle,
  type CustomTitle,
} from './custom-titles';
import { emptyDraft } from './drafts';

const note = (title: string): CustomTitle => ({ title, kind: 'note', unit: null });
const drops: CustomTitle = { title: 'Vitamin drops', kind: 'amount', unit: 'drops' };
const tummy: CustomTitle = { title: 'Tummy time', kind: 'duration', unit: null };
const draft = emptyDraft('custom', new Date('2026-10-06T10:00:00Z'));

describe('normaliseCustomTitle', () => {
  it('trims, collapses spaces and caps the length', () => {
    expect(normaliseCustomTitle('  Calpol   2.5ml ')).toBe('Calpol 2.5ml');
    expect(normaliseCustomTitle('x'.repeat(100))).toHaveLength(80);
  });

  it('never ends in a space when the cap lands on one', () => {
    expect(normaliseCustomTitle(`${'x'.repeat(79)} hello`)).toBe('x'.repeat(79));
  });
});

describe('customTitleEntry', () => {
  it('tidies the title and keeps a unit only for amounts', () => {
    expect(customTitleEntry(' Calpol ', 'amount', '  ml ')).toEqual({ title: 'Calpol', kind: 'amount', unit: 'ml' });
    expect(customTitleEntry('Walk', 'duration', 'ml')).toEqual({ title: 'Walk', kind: 'duration', unit: null });
    expect(customTitleEntry('Calpol', 'amount', '  ')).toEqual({ title: 'Calpol', kind: 'amount', unit: null });
  });
});

describe('canSaveCustomTitle', () => {
  it('only saves new, non-empty titles while there is room', () => {
    expect(canSaveCustomTitle([note('Bath')], note('Calpol'))).toBe(true);
    expect(canSaveCustomTitle([note('Bath')], note(' bath '))).toBe(false);
    expect(canSaveCustomTitle([note('Bath')], note('   '))).toBe(false);
    const full = Array.from({ length: MAX_SAVED_CUSTOM_TITLES }, (_, index) => note(`Title ${index}`));
    expect(canSaveCustomTitle(full, note('Calpol'))).toBe(false);
  });

  it('needs a unit for an amount', () => {
    expect(canSaveCustomTitle([], { title: 'Calpol', kind: 'amount', unit: ' ' })).toBe(false);
    expect(canSaveCustomTitle([], { title: 'Calpol', kind: 'amount', unit: 'ml' })).toBe(true);
  });
});

describe('matchingCustomTitle', () => {
  it('finds the saved title matching the typed one regardless of case and spacing', () => {
    expect(matchingCustomTitle([tummy], ' tummy  TIME')).toBe(tummy);
    expect(matchingCustomTitle([tummy], 'Tummy')).toBeNull();
  });
});

describe('customTitleHint', () => {
  it('names what a saved title captures', () => {
    expect(customTitleHint(note('Bath'))).toBeNull();
    expect(customTitleHint(tummy)).toBe('min');
    expect(customTitleHint(drops)).toBe('drops');
  });
});

describe('custom minutes', () => {
  it('reads and sets the length from the start, and keeps it when the start moves', () => {
    const fiveMinutes = withCustomMinutes(draft, 5);
    expect(fiveMinutes.endedAt).toBe('2026-10-06T10:05:00.000Z');
    expect(customMinutes(fiveMinutes)).toBe(5);
    expect(withCustomStart(fiveMinutes, '2026-10-06T09:00:00.000Z').endedAt).toBe('2026-10-06T09:05:00.000Z');
    expect(customMinutes({ ...draft, endedAt: null })).toBe(0);
  });
});

describe('withCustomKind', () => {
  const timed = withCustomMinutes(withCustomKind(draft, 'duration'), 10);

  it('keeps the length for minutes and drops it otherwise', () => {
    expect(customMinutes(timed)).toBe(10);
    expect(customMinutes(withCustomKind(timed, 'note'))).toBe(0);
    expect(customMinutes(withCustomKind(timed, 'amount', 'drops'))).toBe(0);
  });

  it('clears the amount and unit when it no longer counts an amount', () => {
    const counted = withCustomKind(draft, 'amount', 'drops');
    const withAmount = { ...counted, details: { ...counted.details, amount: 3 } };
    expect(withAmount.details).toMatchObject({ kind: 'amount', unit: 'drops', amount: 3 });
    expect(withCustomKind(withAmount, 'duration').details).toMatchObject({
      kind: 'duration',
      amount: null,
      unit: null,
    });
  });
});

describe('withCustomTitle', () => {
  it('takes the title, kind and unit of a picked saved title', () => {
    expect(withCustomTitle(draft, drops).details).toMatchObject({
      title: 'Vitamin drops',
      kind: 'amount',
      unit: 'drops',
    });
    expect(withCustomTitle(draft, tummy).details).toMatchObject({ title: 'Tummy time', kind: 'duration', unit: null });
  });

  it('clears the title when the pick is undone', () => {
    expect(withCustomTitle(withCustomTitle(draft, drops), null).details).toMatchObject({ title: '', kind: 'amount' });
  });
});

describe('formatCustomAmount', () => {
  it('shows the amount with its unit without trailing zeros', () => {
    expect(formatCustomAmount(2, 'drops')).toBe('2 drops');
    expect(formatCustomAmount(2.5, 'ml')).toBe('2.5 ml');
    expect(formatCustomAmount(1 / 3, null)).toBe('0.33');
  });
});
