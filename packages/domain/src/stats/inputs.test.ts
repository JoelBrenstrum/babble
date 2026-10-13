import { describe, expect, it } from 'vitest';
import { statsInputs, statsOptions } from './inputs';

const baby = { timezone: 'Pacific/Auckland', day_start_minutes: 420, birth_date: '2026-10-01' };
const now = new Date('2026-10-08T03:00:00Z');

describe('statsInputs', () => {
  it('spans the last seven days to the end of today', () => {
    const { todayKey, keys, from, to } = statsInputs('7d', baby, now);
    expect(todayKey).toBe('2026-10-08');
    expect(keys).toEqual([
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
    ]);
    expect(from).toBe('2026-10-01T18:00:00.000Z');
    expect(to).toBe('2026-10-08T18:00:00.000Z');
  });

  it('starts at birth for all time', () => {
    const { keys, from } = statsInputs('all', baby, now);
    expect(keys[0]).toBe('2026-10-01');
    expect(keys).toHaveLength(8);
    expect(from).toBe('2026-09-30T18:00:00.000Z');
  });

  it('is stable within the same day', () => {
    expect(statsInputs('30d', baby, now)).toEqual(statsInputs('30d', baby, new Date('2026-10-08T10:00:00Z')));
  });
});

describe('statsOptions', () => {
  it('maps the baby and its settings', () => {
    expect(
      statsOptions(
        baby,
        { night_start_minutes: 1140, night_end_minutes: 420, downtime_merge_threshold_sec: 90 },
        'imperial',
      ),
    ).toEqual({
      timeZone: 'Pacific/Auckland',
      dayStartMinutes: 420,
      nightStartMinutes: 1140,
      nightEndMinutes: 420,
      mergeGapMs: 90_000,
      units: 'imperial',
    });
  });
});
