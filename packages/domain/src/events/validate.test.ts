import { describe, expect, it } from 'vitest';
import { emptyDraft } from './drafts';
import { withNappyType } from './nappy';
import { makeEvent } from './test-events';
import {
  FUTURE_TOLERANCE_MS,
  hasErrors,
  MAX_HEAD_CIRCUMFERENCE_MM,
  MAX_LENGTH_MM,
  MAX_VOLUME_ML,
  MAX_WEIGHT_G,
  MIN_HEAD_CIRCUMFERENCE_MM,
  MIN_LENGTH_MM,
  MIN_WEIGHT_G,
  needsChoice,
  validateDraft,
} from './validate';

const NOW = new Date('2026-10-06T12:00:00Z');
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString();

describe('time checks', () => {
  it('allows a start a few minutes ahead but not beyond the tolerance', () => {
    const draft = { ...emptyDraft('custom', NOW), details: { title: 'x', description: '' } };
    expect(validateDraft({ ...draft, startedAt: at(FUTURE_TOLERANCE_MS), endedAt: null }, NOW)).toEqual({});
    expect(validateDraft({ ...draft, startedAt: at(FUTURE_TOLERANCE_MS + 1), endedAt: null }, NOW)).toEqual({
      startedAt: "That's in the future.",
    });
  });

  it('flags an unparseable start', () => {
    const draft = { ...emptyDraft('bottle', NOW), startedAt: 'nonsense', endedAt: null };
    expect(validateDraft(draft, NOW)).toEqual({ startedAt: 'Choose a start time.' });
  });

  it('flags an end in the future, which wins over an end before the start', () => {
    const draft = { ...emptyDraft('sleep', NOW), startedAt: at(-3600_000), endedAt: at(FUTURE_TOLERANCE_MS + 1) };
    expect(validateDraft(draft, NOW)).toEqual({ endedAt: "That's in the future." });
  });
});

describe('bottle limits', () => {
  const bottle = emptyDraft('bottle', NOW);
  const withAmount = (amountMl: number | null) =>
    validateDraft({ ...bottle, details: { ...bottle.details, amountMl } }, NOW);

  it('accepts amounts up to the maximum', () => {
    expect(withAmount(MAX_VOLUME_ML)).toEqual({});
    expect(withAmount(null)).toEqual({});
  });

  it('rejects negative amounts and amounts above the maximum', () => {
    expect(withAmount(-1)).toEqual({ amountMl: `Enter an amount up to ${MAX_VOLUME_ML} ml.` });
    expect(withAmount(MAX_VOLUME_ML + 1)).toEqual({ amountMl: `Enter an amount up to ${MAX_VOLUME_ML} ml.` });
  });
});

describe('growth limits', () => {
  const growth = emptyDraft('growth', NOW);
  const check = (details: Partial<typeof growth.details>) =>
    validateDraft({ ...growth, details: { ...growth.details, ...details } }, NOW);

  it.each([
    [{ weightG: MIN_WEIGHT_G }, {}],
    [{ weightG: MAX_WEIGHT_G }, {}],
    [{ weightG: MIN_WEIGHT_G - 1 }, { weightG: 'That weight looks wrong.' }],
    [{ weightG: MAX_WEIGHT_G + 1 }, { weightG: 'That weight looks wrong.' }],
    [{ lengthMm: MIN_LENGTH_MM }, {}],
    [{ lengthMm: MAX_LENGTH_MM + 1 }, { lengthMm: 'That length looks wrong.' }],
    [{ headCircumferenceMm: MIN_HEAD_CIRCUMFERENCE_MM }, {}],
    [{ headCircumferenceMm: MAX_HEAD_CIRCUMFERENCE_MM + 1 }, { headCircumferenceMm: 'That head size looks wrong.' }],
  ])('%j → %j', (details, expected) => expect(check(details)).toEqual(expected));
});

describe('pump and breastfeed segments', () => {
  it('rejects a side that ends before it starts', () => {
    const feed = {
      ...emptyDraft('breast_feed', NOW),
      segments: [{ side: 'left' as const, startedAt: at(-600_000), endedAt: at(-900_000) }],
    };
    expect(validateDraft(feed, NOW)).toEqual({ segments: 'Each side must end after it starts.' });
  });

  it('limits pump amounts', () => {
    const pump = emptyDraft('pump', NOW);
    const withAmounts = (leftMl: number | null, totalMl: number | null) =>
      validateDraft({ ...pump, details: { leftMl, rightMl: null, totalMl } }, NOW);
    expect(withAmounts(100, 150)).toEqual({});
    expect(withAmounts(MAX_VOLUME_ML + 1, null)).toEqual({ amounts: `Enter amounts up to ${MAX_VOLUME_ML} ml.` });
    expect(withAmounts(null, -5)).toEqual({ amounts: `Enter amounts up to ${MAX_VOLUME_ML} ml.` });
  });
});

describe('sleep awake periods', () => {
  it('reports an invalid wake-up only for a finished nap', () => {
    const nap = makeEvent('sleep', {
      startedAt: '2026-10-06T08:00:00Z',
      endedAt: '2026-10-06T10:00:00Z',
      segments: [{ startedAt: '2026-10-06T08:00:00Z', endedAt: '2026-10-06T07:00:00Z' }],
    });
    expect(validateDraft(nap, NOW)).toEqual({ awake: 'Check the wake-up times.' });
    expect(validateDraft({ ...nap, endedAt: null }, NOW)).toEqual({});
  });
});

describe('helpers', () => {
  it('detects errors', () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ title: 'Give it a title.' })).toBe(true);
  });

  it('only asks for a choice on a pending nappy', () => {
    const nappy = emptyDraft('nappy', NOW);
    expect(needsChoice(nappy)).toBe(true);
    expect(needsChoice({ ...nappy, details: withNappyType(nappy.details, 'wet') })).toBe(false);
    expect(needsChoice(emptyDraft('bottle', NOW))).toBe(false);
  });
});
