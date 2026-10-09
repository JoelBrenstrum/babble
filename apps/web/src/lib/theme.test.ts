import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  const night = { timeZone: 'Pacific/Auckland', start: 1140, end: 420 };

  it('is dark inside the night window and light outside it', () => {
    expect(resolveTheme('night', false, night, new Date('2026-10-09T08:00:00Z'))).toBe('dark');
    expect(resolveTheme('night', true, night, new Date('2026-10-09T01:00:00Z'))).toBe('light');
  });

  it('follows the system at night without a window', () => {
    expect(resolveTheme('night', true, null)).toBe('dark');
    expect(resolveTheme('night', false, null)).toBe('light');
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

  it('overrides the status bar colour for dark at night', () => {
    const night = { timeZone: 'UTC', start: 1140, end: 420 };
    applyTheme('night', night, new Date('2026-10-09T23:00:00Z'));
    expect(themeColors()[0]).toEqual([THEME_COLORS.dark, null]);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    applyTheme('night', night, new Date('2026-10-09T12:00:00Z'));
    expect(themeColors()[0]).toEqual([THEME_COLORS.light, null]);
    expect(themeColors()).toHaveLength(3);
    applyTheme('night', null);
    expect(themeColors()).toHaveLength(2);
  });
});

describe('theme boot script', () => {
  const night = { timeZone: 'Pacific/Auckland', start: 1140, end: 420 };

  beforeEach(() => {
    document.head.innerHTML = '';
    window.matchMedia = ((query: string) => ({ matches: true, media: query })) as typeof window.matchMedia;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  const boot = () => {
    document.head.innerHTML = '';
    new Function(themeBootScript)();
    return {
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      color: document.getElementById('theme-color-override')?.getAttribute('content') ?? null,
    };
  };

  it.each([
    '2026-10-09T05:59:00Z',
    '2026-10-09T06:00:00Z',
    '2026-10-09T11:00:00Z',
    '2026-10-09T17:59:00Z',
    '2026-10-09T18:00:00Z',
    '2026-10-09T01:00:00Z',
  ])('agrees with the app at %s', (iso) => {
    vi.setSystemTime(new Date(iso));
    localStorage.setItem('babble.theme', 'night');
    localStorage.setItem('babble.night', JSON.stringify(night));
    const expected = resolveTheme('night', true, night, new Date(iso));
    expect(boot()).toEqual({ theme: expected, color: THEME_COLORS[expected] });
  });

  it.each([null, 'not json', '{"start":1140,"end":420}', '{"timeZone":"Nowhere/Else","start":1,"end":2}'])(
    'follows the system without a usable night window (%s)',
    (stored) => {
      localStorage.setItem('babble.theme', 'night');
      if (stored !== null) localStorage.setItem('babble.night', stored);
      expect(boot()).toEqual({ theme: 'dark', color: null });
    },
  );
});
