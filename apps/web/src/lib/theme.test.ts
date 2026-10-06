import { describe, expect, it } from 'vitest';
import { resolveTheme } from './theme';

describe('resolveTheme', () => {
  it.each([
    ['light', true, 'light'],
    ['dark', false, 'dark'],
    ['system', true, 'dark'],
    ['system', false, 'light'],
    [null, true, 'dark'],
    ['garbage', false, 'light'],
  ] as const)('%s with prefersDark=%s → %s', (preference, prefersDark, expected) => {
    expect(resolveTheme(preference, prefersDark)).toBe(expected);
  });
});
