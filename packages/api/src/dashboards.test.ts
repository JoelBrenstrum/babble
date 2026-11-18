import { describe, expect, it } from 'vitest';
import { getDashboard, saveDashboard } from './dashboards';
import { fakeClient } from './test-utils';

describe('getDashboard', () => {
  it('falls back to the default layout when nothing is saved or the layout is unreadable', async () => {
    const empty = fakeClient(() => ({ body: null }));
    expect((await getDashboard(empty.client, 'family-1')).cards.map((card) => card.id)).toEqual([
      'sleep',
      'feeds',
      'breast-time',
      'nappies',
      'pump',
      'growth',
    ]);
    const broken = fakeClient(() => ({ body: { layout: { version: 9 } } }));
    expect((await getDashboard(broken.client, 'family-1')).cards).toHaveLength(6);
    const saved = fakeClient(() => ({
      body: { layout: { version: 1, cards: [{ id: 'x', kind: 'text', body: 'Hi', size: 's' }] } },
    }));
    expect((await getDashboard(saved.client, 'family-1')).cards).toEqual([
      { id: 'x', kind: 'text', body: 'Hi', size: 's' },
    ]);
  });
});

describe('saveDashboard', () => {
  it('upserts the layout for the family', async () => {
    const { client, requests } = fakeClient(() => ({ status: 204, body: null }));
    await saveDashboard(client, 'family-1', { version: 1, cards: [] });
    expect(requests[0]?.method).toBe('POST');
    expect(requests[0]?.url.searchParams.get('on_conflict')).toBe('family_id');
    expect(requests[0]?.body).toEqual({ family_id: 'family-1', layout: { version: 1, cards: [] } });
  });
});
