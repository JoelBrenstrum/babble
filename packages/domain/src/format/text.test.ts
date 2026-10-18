import { describe, expect, it } from 'vitest';
import { capitalise } from './text';

describe('capitalise', () => {
  it('upper-cases only the first character', () => {
    expect(capitalise('left')).toBe('Left');
    expect(capitalise('feed and sleep')).toBe('Feed and sleep');
    expect(capitalise('')).toBe('');
  });
});
