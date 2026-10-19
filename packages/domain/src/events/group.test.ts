import { describe, expect, it } from 'vitest';
import { groupByDay } from './group';

const at = (startedAt: string) => ({ startedAt });

describe('groupByDay', () => {
  it('groups newest first by the local day', () => {
    const groups = groupByDay(
      [at('2026-10-06T20:00:00Z'), at('2026-10-07T09:00:00Z'), at('2026-10-06T08:00:00Z')],
      'UTC',
      0,
    );
    expect(groups).toEqual([
      { dayKey: '2026-10-07', items: [at('2026-10-07T09:00:00Z')] },
      { dayKey: '2026-10-06', items: [at('2026-10-06T20:00:00Z'), at('2026-10-06T08:00:00Z')] },
    ]);
  });

  it('counts the small hours before the day start as the day before', () => {
    const groups = groupByDay([at('2026-10-07T03:00:00Z'), at('2026-10-07T08:00:00Z')], 'UTC', 7 * 60);
    expect(groups.map((group) => group.dayKey)).toEqual(['2026-10-07', '2026-10-06']);
  });

  it('uses the baby time zone', () => {
    const [group] = groupByDay([at('2026-10-06T14:00:00Z')], 'Pacific/Auckland', 0);
    expect(group?.dayKey).toBe('2026-10-07');
  });

  it('is empty for no events', () => {
    expect(groupByDay([], 'UTC', 0)).toEqual([]);
  });
});
