import { sampleEvents, sampleRunningFeed } from '@babble/api/fixtures';
import { describe, expect, it } from 'vitest';
import { toDraft } from './events/event-form';
import { latestMeta } from './home-overview';

const now = new Date('2026-10-06T10:00:00Z');
const events = sampleEvents(now);
const byType = (type: string) => events.find((event) => event.type === type);

describe('latestMeta', () => {
  it('describes the most recent entry', () => {
    expect(latestMeta(byType('nappy'), now, 'metric', 'Pacific/Auckland')).toBe('Last 48m ago · Both · Medium');
    expect(latestMeta(byType('bottle'), now, 'metric', 'Pacific/Auckland')).toBe('Last 5h 00m ago · 90 ml formula');
    expect(latestMeta(byType('growth'), now, 'metric', 'Pacific/Auckland')).toBe('3.42 kg · 2 Oct');
  });

  it('handles running and missing entries', () => {
    expect(latestMeta(sampleRunningFeed(now), now, 'metric', 'Pacific/Auckland')).toBe('In progress · 22m');
    expect(latestMeta(undefined, now, 'metric', 'Pacific/Auckland')).toBe('Nothing logged yet');
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
