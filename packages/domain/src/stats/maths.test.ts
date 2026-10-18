import { describe, expect, it } from 'vitest';
import { mean, median } from './maths';

describe('median', () => {
  it('handles odd, even and empty lists', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe('mean', () => {
  it('averages the picked value and is null for an empty list', () => {
    expect(mean([{ ms: 10 }, { ms: 20 }, { ms: 60 }], (item) => item.ms)).toBe(30);
    expect(mean([], () => 1)).toBeNull();
  });
});
