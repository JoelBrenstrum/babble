import { describe, expect, it } from 'vitest';
import { cacheVersion, cacheVersionFor } from './cache-version';

describe('cacheVersion', () => {
  it('stays the same across releases that leave the data shapes alone', () => {
    expect(cacheVersion(['a', 'b'])).toBe(cacheVersion(['a', 'b']));
  });

  it('changes when a shape file or the revision changes', () => {
    expect(cacheVersion(['a', 'b'])).not.toBe(cacheVersion(['a', 'c']));
    expect(cacheVersion(['ab', ''])).not.toBe(cacheVersion(['a', 'b']));
    expect(cacheVersion(['a'], 1)).not.toBe(cacheVersion(['a'], 2));
  });

  it('reads the shape files from the repository', () => {
    expect(cacheVersionFor(`${__dirname}/../../../..`)).toMatch(/^[0-9a-f]{12}$/);
  });
});
