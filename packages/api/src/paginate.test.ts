import { describe, expect, it } from 'vitest';
import { paginate } from './paginate';

describe('paginate', () => {
  it('follows the cursor from the last row until a short page', async () => {
    const cursors: (number | null)[] = [];
    const rows = await paginate<number, number>(
      async (cursor) => {
        cursors.push(cursor);
        return cursor === null ? [5, 4] : cursor === 4 ? [3, 2] : [1];
      },
      (last) => last,
      2,
    );
    expect(rows).toEqual([5, 4, 3, 2, 1]);
    expect(cursors).toEqual([null, 4, 2]);
  });

  it('stops after one request when the first page is short or empty', async () => {
    let calls = 0;
    const rows = await paginate<number, number>(
      async () => (calls++, []),
      (last) => last,
      2,
    );
    expect(rows).toEqual([]);
    expect(calls).toBe(1);
  });
});
