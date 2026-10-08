import { beforeEach, describe, expect, it } from 'vitest';
import { applyTheme, resolveTheme, THEME_COLORS, themeBootScript } from './theme';

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

const themeColors = () =>
  [...document.querySelectorAll('meta[name="theme-color"]')].map((tag) => [
    tag.getAttribute('content'),
    tag.getAttribute('media'),
  ]);

describe('theme colour', () => {
  beforeEach(() => {
    document.head.innerHTML = `
      <meta name="theme-color" content="${THEME_COLORS.light}" media="(prefers-color-scheme: light)">
      <meta name="theme-color" content="${THEME_COLORS.dark}" media="(prefers-color-scheme: dark)">`;
    window.matchMedia = ((query: string) => ({ matches: false, media: query })) as typeof window.matchMedia;
  });

  it('puts the chosen theme colour first and removes it when following the system', () => {
    applyTheme('dark');
    expect(themeColors()[0]).toEqual([THEME_COLORS.dark, null]);
    applyTheme('light');
    expect(themeColors()[0]).toEqual([THEME_COLORS.light, null]);
    expect(themeColors()).toHaveLength(3);
    applyTheme('system');
    expect(themeColors()).toHaveLength(2);
  });

  it('applies a saved override before the app loads', () => {
    localStorage.setItem('babble.theme', 'dark');
    new Function(themeBootScript)();
    expect(themeColors()[0]).toEqual([THEME_COLORS.dark, null]);
    localStorage.removeItem('babble.theme');
  });
});
