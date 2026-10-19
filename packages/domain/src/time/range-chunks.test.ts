import { describe, expect, it } from 'vitest';
import type { BabyEvent } from '../events/types';
import { chunkStartKey, eventsWithin, overlapsRange, rangeChunks } from './range-chunks';

const NZ = 'Pacific/Auckland';

describe('chunkStartKey', () => {
  it('groups days into fixed seven-day chunks starting on Mondays', () => {
    expect(chunkStartKey('2026-10-12')).toBe('2026-10-12');
    expect(chunkStartKey('2026-10-18')).toBe('2026-10-12');
    expect(chunkStartKey('2026-10-19')).toBe('2026-10-19');
    expect(chunkStartKey('2024-01-01')).toBe('2024-01-01');
    expect(chunkStartKey('2023-12-31')).toBe('2023-12-25');
  });
});

describe('rangeChunks', () => {
  it('covers a range with whole chunks aligned to the baby day start', () => {
    const chunks = rangeChunks('2026-10-14T03:00:00Z', '2026-10-21T03:00:00Z', NZ, 7 * 60);
    expect(chunks).toEqual([
      { from: '2026-10-11T18:00:00.000Z', to: '2026-10-18T18:00:00.000Z' },
      { from: '2026-10-18T18:00:00.000Z', to: '2026-10-25T18:00:00.000Z' },
    ]);
  });

  it('is stable for any sub-range inside the same chunk', () => {
    const a = rangeChunks('2026-10-12T00:00:00Z', '2026-10-13T00:00:00Z', 'UTC', 0);
    const b = rangeChunks('2026-10-15T10:00:00Z', '2026-10-15T11:00:00Z', 'UTC', 0);
    expect(a).toEqual(b);
    expect(a).toEqual([{ from: '2026-10-12T00:00:00.000Z', to: '2026-10-19T00:00:00.000Z' }]);
  });

  it('does not reach into the next chunk when the range ends exactly on its boundary', () => {
    expect(rangeChunks('2026-10-12T00:00:00Z', '2026-10-19T00:00:00Z', 'UTC', 0)).toHaveLength(1);
    expect(rangeChunks('2026-10-12T00:00:00Z', '2026-10-19T00:00:01Z', 'UTC', 0)).toHaveLength(2);
  });

  it('returns nothing for an empty or inverted range', () => {
    expect(rangeChunks('2026-10-12T00:00:00Z', '2026-10-12T00:00:00Z', 'UTC', 0)).toEqual([]);
    expect(rangeChunks('2026-10-13T00:00:00Z', '2026-10-12T00:00:00Z', 'UTC', 0)).toEqual([]);
  });
});

function event(id: string, startedAt: string, endedAt: string | null, extra: Partial<BabyEvent> = {}): BabyEvent {
  return {
    id,
    babyId: 'b',
    type: 'nappy',
    startedAt,
    endedAt,
    deletedAt: null,
    ...extra,
  } as BabyEvent;
}

describe('overlapsRange and eventsWithin', () => {
  const from = '2026-10-12T00:00:00Z';
  const to = '2026-10-13T00:00:00Z';

  it('matches the server rule: starts in range, ends in range, or still running', () => {
    expect(overlapsRange(event('a', '2026-10-12T05:00:00Z', '2026-10-12T05:10:00Z'), from, to)).toBe(true);
    expect(overlapsRange(event('b', '2026-10-11T23:00:00Z', '2026-10-12T01:00:00Z'), from, to)).toBe(true);
    expect(overlapsRange(event('c', '2026-10-11T23:00:00Z', '2026-10-11T23:30:00Z'), from, to)).toBe(false);
    expect(overlapsRange(event('d', '2026-10-13T00:00:00Z', null), from, to)).toBe(false);
    expect(overlapsRange(event('e', '2026-10-11T20:00:00Z', null, { type: 'sleep' }), from, to)).toBe(true);
    expect(overlapsRange(event('f', '2026-10-11T20:00:00Z', null), from, to)).toBe(false);
    expect(overlapsRange(event('g', '2026-10-12T05:00:00Z', null, { deletedAt: 'x' }), from, to)).toBe(false);
  });

  it('dedupes events seen in two chunks and sorts newest first', () => {
    const nap = event('nap', '2026-10-11T22:00:00Z', '2026-10-12T02:00:00Z', { type: 'sleep' });
    const feed = event('feed', '2026-10-12T08:00:00Z', '2026-10-12T08:20:00Z');
    expect(eventsWithin([nap, feed, nap], from, to).map((item) => item.id)).toEqual(['feed', 'nap']);
  });
});
