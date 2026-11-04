import { describe, expect, it } from 'vitest';
import {
  canSaveCustomTitle,
  customTitleSuggestions,
  matchingCustomTitle,
  MAX_SAVED_CUSTOM_TITLES,
  normaliseCustomTitle,
  recentCustomTitles,
} from './custom-titles';
import type { BabyEvent } from './types';

const custom = (title: string, startedAt: string, deletedAt: string | null = null) =>
  ({ type: 'custom', startedAt, deletedAt, details: { title, description: '' } }) as BabyEvent;

describe('normaliseCustomTitle', () => {
  it('trims, collapses spaces and caps the length', () => {
    expect(normaliseCustomTitle('  Calpol   2.5ml ')).toBe('Calpol 2.5ml');
    expect(normaliseCustomTitle('x'.repeat(100))).toHaveLength(80);
  });
});

describe('recentCustomTitles', () => {
  it('lists distinct titles, latest first, skipping deleted and other events', () => {
    const events = [
      custom('Calpol', '2026-11-01T08:00:00Z'),
      custom('bath', '2026-11-03T08:00:00Z'),
      custom('Pamol', '2026-11-04T08:00:00Z', '2026-11-04T09:00:00Z'),
      custom('Bath', '2026-11-02T08:00:00Z'),
      { type: 'nappy', startedAt: '2026-11-05T08:00:00Z', deletedAt: null } as BabyEvent,
    ];
    expect(recentCustomTitles(events)).toEqual(['bath', 'Calpol']);
  });

  it('stops at the limit', () => {
    const events = ['A', 'B', 'C'].map((title, index) => custom(title, `2026-11-0${index + 1}T08:00:00Z`));
    expect(recentCustomTitles(events, 2)).toEqual(['C', 'B']);
  });
});

describe('customTitleSuggestions', () => {
  it('puts saved titles first and adds recent ones not already saved', () => {
    expect(customTitleSuggestions(['Bath', 'Walk'], ['walk', 'Calpol'])).toEqual(['Bath', 'Walk', 'Calpol']);
  });
});

describe('canSaveCustomTitle', () => {
  it('only saves new, non-empty titles while there is room', () => {
    expect(canSaveCustomTitle(['Bath'], 'Calpol')).toBe(true);
    expect(canSaveCustomTitle(['Bath'], ' bath ')).toBe(false);
    expect(canSaveCustomTitle(['Bath'], '   ')).toBe(false);
    const full = Array.from({ length: MAX_SAVED_CUSTOM_TITLES }, (_, index) => `Title ${index}`);
    expect(canSaveCustomTitle(full, 'Calpol')).toBe(false);
  });
});

describe('matchingCustomTitle', () => {
  it('finds the suggestion matching the typed title regardless of case and spacing', () => {
    expect(matchingCustomTitle(['Tummy time'], ' tummy  TIME')).toBe('Tummy time');
    expect(matchingCustomTitle(['Tummy time'], 'Tummy')).toBeNull();
  });
});
