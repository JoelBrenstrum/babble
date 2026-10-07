import { sampleEvents, sampleRunningFeed } from '@babble/api/fixtures';
import { describe, expect, it } from 'vitest';
import { listTypesFor } from '#/lib/trackers';
import { toDraft } from './events/event-form';
import { latestMeta } from './home-overview';

const now = new Date('2026-10-06T10:00:00Z');
const events = sampleEvents(now);
const byType = (type: string) => events.find((event) => event.type === type);

describe('latestMeta', () => {
  it('describes the most recent entry', () => {
    expect(latestMeta(byType('nappy'), now, 'metric', 'Pacific/Auckland')).toBe(
      'Last 48m ago · Wet · Medium · Dirty · Medium',
    );
    expect(latestMeta(byType('bottle'), now, 'metric', 'Pacific/Auckland')).toBe('Last 4h 48m ago · 90 ml formula');
    expect(latestMeta(byType('growth'), now, 'metric', 'Pacific/Auckland')).toBe('3.42 kg · 2 Oct');
  });

  it('handles running and missing entries', () => {
    expect(latestMeta(sampleRunningFeed(now), now, 'metric', 'Pacific/Auckland')).toBe('In progress');
    expect(latestMeta(undefined, now, 'metric', 'Pacific/Auckland')).toBe('Nothing logged yet');
  });
});

describe('listTypesFor', () => {
  it('combines feeds unless filtered', () => {
    expect(listTypesFor('breast_feed')).toEqual(['breast_feed', 'bottle']);
    expect(listTypesFor('bottle', 'bottle')).toEqual(['bottle']);
    expect(listTypesFor('breast_feed', 'breast')).toEqual(['breast_feed']);
    expect(listTypesFor('nappy', 'bottle')).toEqual(['nappy']);
  });
});

describe('toDraft', () => {
  it('drops the event metadata', () => {
    const draft = toDraft(byType('nappy')!);
    expect(draft).not.toHaveProperty('id');
    expect(draft).not.toHaveProperty('sessionState');
    expect(draft.type).toBe('nappy');
  });
});
