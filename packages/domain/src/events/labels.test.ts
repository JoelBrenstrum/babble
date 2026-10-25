import { describe, expect, it } from 'vitest';
import {
  SIDE_LABEL,
  SIZE_LABELS,
  SIZES,
  SOLIDS_AMOUNT_LABELS,
  SOLIDS_AMOUNT_OPTIONS,
  SOLIDS_REACTION_LABELS,
  SOLIDS_REACTION_OPTIONS,
  WET_SIZE_LABELS,
} from './labels';

describe('option lists', () => {
  it('pair every amount and reaction with its label, in order', () => {
    expect(SOLIDS_AMOUNT_OPTIONS.map((option) => option.value)).toEqual(Object.keys(SOLIDS_AMOUNT_LABELS));
    expect(SOLIDS_AMOUNT_OPTIONS.every((option) => option.label === SOLIDS_AMOUNT_LABELS[option.value])).toBe(true);
    expect(SOLIDS_REACTION_OPTIONS.map((option) => option.value)).toEqual(Object.keys(SOLIDS_REACTION_LABELS));
    expect(SOLIDS_REACTION_OPTIONS.every((option) => option.label === SOLIDS_REACTION_LABELS[option.value])).toBe(true);
  });

  it('labels the sides', () => {
    expect(SIDE_LABEL).toEqual({ left: 'Left', right: 'Right' });
  });

  it('lists the sizes from smallest to largest, with a weight-based wording for wet nappies', () => {
    expect(SIZES).toEqual(Object.keys(SIZE_LABELS));
    expect(SIZES.map((size) => WET_SIZE_LABELS[size])).toEqual(['Damp', 'Light', 'Medium', 'Heavy', 'Soaked']);
  });
});
