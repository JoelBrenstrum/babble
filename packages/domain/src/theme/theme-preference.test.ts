import { describe, expect, it } from 'vitest';
import { nightThemeHint, parseNightWindow, parseThemePreference, themeOverride } from './theme-preference';

const night = { timeZone: 'Pacific/Auckland', start: 1140, end: 420 };
const at = (iso: string) => new Date(iso);

describe('themeOverride', () => {
  it.each([
    ['light', null],
    ['dark', null],
    ['light', night],
  ] as const)('keeps a fixed %s choice', (preference, window) => {
    expect(themeOverride(preference, window, at('2026-10-09T08:00:00Z'))).toBe(preference);
  });

  it.each([null, 'system', 'garbage'])('follows the system for %s', (preference) => {
    expect(themeOverride(preference, night, at('2026-10-09T08:00:00Z'))).toBeNull();
  });

  it('follows the system at night without a window', () => {
    expect(themeOverride('night', null, at('2026-10-09T08:00:00Z'))).toBeNull();
  });

  it.each([
    ['2026-10-09T05:59:00Z', 'light'],
    ['2026-10-09T06:00:00Z', 'dark'],
    ['2026-10-09T11:00:00Z', 'dark'],
    ['2026-10-09T17:59:00Z', 'dark'],
    ['2026-10-09T18:00:00Z', 'light'],
    ['2026-10-09T01:00:00Z', 'light'],
  ] as const)('crosses midnight in the baby zone: %s is %s', (iso, expected) => {
    expect(themeOverride('night', night, at(iso))).toBe(expected);
  });

  it('handles a window that does not cross midnight', () => {
    const day = { timeZone: 'UTC', start: 60, end: 300 };
    expect(themeOverride('night', day, at('2026-10-09T02:00:00Z'))).toBe('dark');
    expect(themeOverride('night', day, at('2026-10-09T05:00:00Z'))).toBe('light');
    expect(themeOverride('night', day, at('2026-10-09T00:59:00Z'))).toBe('light');
  });
});

describe('parseThemePreference', () => {
  it.each([
    ['night', 'night'],
    ['dark', 'dark'],
    ['light', 'light'],
    [null, 'system'],
    ['nope', 'system'],
  ] as const)('%s → %s', (value, expected) => {
    expect(parseThemePreference(value)).toBe(expected);
  });
});

describe('parseNightWindow', () => {
  it('reads a stored window', () => {
    expect(parseNightWindow(JSON.stringify(night))).toEqual(night);
  });

  it.each([null, '', '{', '{"timeZone":"UTC","start":"1"}', 'null'])('rejects %s', (value) => {
    expect(parseNightWindow(value)).toBeNull();
  });
});

describe('nightThemeHint', () => {
  it('describes the window in clock times', () => {
    expect(nightThemeHint('Olivia', night)).toBe("Dark between 7:00 pm and 7:00 am, from Olivia's night settings.");
  });

  it('falls back before settings load', () => {
    expect(nightThemeHint('Olivia', null)).toBe("Dark during Olivia's night window.");
  });
});
