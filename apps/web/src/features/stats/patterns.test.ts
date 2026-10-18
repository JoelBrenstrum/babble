import type { InsightsReport, StatsCard } from '@babble/domain';
import { describe, expect, it } from 'vitest';
import { patternCards, patternsOf } from './patterns';

const empty: InsightsReport = { feeds: null, spacing: null, clusters: null, wake: null, night: null, weekly: null };
const wake = { key: 'wake', title: 'Wake windows' } as StatsCard;
const weekly = { takeaway: 'Longer nights', rows: [] } as unknown as NonNullable<InsightsReport['weekly']>;

describe('patternsOf', () => {
  it('always shows the teaser while locked', () => {
    expect(patternsOf({ locked: true })).toEqual({ locked: true });
  });

  it('hides patterns with nothing to show', () => {
    expect(patternsOf({ locked: false, report: null })).toBeNull();
    expect(patternsOf({ locked: false, report: empty })).toBeNull();
  });

  it('shows patterns once a card or the weekly summary exists', () => {
    expect(patternsOf({ locked: false, report: { ...empty, wake } })).toEqual({
      locked: false,
      report: { ...empty, wake },
    });
    expect(patternsOf({ locked: false, report: { ...empty, weekly } })?.locked).toBe(false);
  });
});

describe('patternCards', () => {
  it('lists the cards that exist in display order', () => {
    const feeds = { key: 'feeds', title: 'Feeds' } as StatsCard;
    expect(patternCards({ ...empty, wake, feeds })).toEqual([feeds, wake]);
    expect(patternCards(empty)).toEqual([]);
  });
});
