import { sampleEvents } from '@babble/api/fixtures';
import { dayLayout, type DayLayout } from '@babble/domain';
import { describe, expect, it } from 'vitest';
import { daySummaryText } from './day-summary-text';

const empty: DayLayout = { sleep: [], feeds: [], nappies: [], pumps: [] };

describe('daySummaryText', () => {
  it('says when a day has no data or nothing logged', () => {
    expect(daySummaryText(null)).toBe('No data for this day');
    expect(daySummaryText(empty)).toBe('Nothing logged');
  });

  it('counts each lane, singular or plural, skipping empty ones', () => {
    const item = dayLayout(
      sampleEvents(new Date('2026-10-13T12:00:00Z')),
      { start: new Date(0), end: new Date(8.64e12) },
      new Date(8e12),
    ).feeds[0]!;
    expect(daySummaryText({ ...empty, feeds: [item] })).toBe('1 feed');
    expect(daySummaryText({ ...empty, sleep: [item, item], nappies: [item] })).toBe('2 sleeps, 1 nappy');
  });
});
