import { themeOverride } from '@babble/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, THEME_COLORS, themeBootScript } from './theme';

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
  const daytime = { timeZone: 'UTC', start: 420, end: 1140 };
  const empty = { timeZone: 'UTC', start: 600, end: 600 };

  beforeEach(() => {
    document.head.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  const boot = (prefersDark: boolean) => {
    document.head.innerHTML = '';
    window.matchMedia = ((query: string) => ({ matches: prefersDark, media: query })) as typeof window.matchMedia;
    new Function(themeBootScript)();
    return {
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      color: document.getElementById('theme-color-override')?.getAttribute('content') ?? null,
    };
  };

  const cases: [string | null, { timeZone: string; start: number; end: number } | null, string, boolean][] = [
    ['night', night, '2026-10-09T05:59:00Z', true],
    ['night', night, '2026-10-09T06:00:00Z', true],
    ['night', night, '2026-10-09T11:00:00Z', true],
    ['night', night, '2026-10-09T17:59:00Z', true],
    ['night', night, '2026-10-09T18:00:00Z', true],
    ['night', night, '2026-10-09T01:00:00Z', false],
    ['night', daytime, '2026-10-09T07:00:00Z', true],
    ['night', daytime, '2026-10-09T18:59:00Z', false],
    ['night', daytime, '2026-10-09T19:00:00Z', false],
    ['night', empty, '2026-10-09T10:00:00Z', true],
    ['night', null, '2026-10-09T10:00:00Z', true],
    ['night', null, '2026-10-09T10:00:00Z', false],
    ['light', night, '2026-10-09T10:00:00Z', true],
    ['dark', night, '2026-10-09T10:00:00Z', false],
    ['system', night, '2026-10-09T10:00:00Z', true],
    ['system', night, '2026-10-09T10:00:00Z', false],
    [null, null, '2026-10-09T10:00:00Z', true],
  ];

  it.each(cases)(
    'agrees with the app for %s with %j at %s (prefers dark: %s)',
    (preference, window, iso, prefersDark) => {
      vi.setSystemTime(new Date(iso));
      if (preference !== null) localStorage.setItem('babble.theme', preference);
      if (window) localStorage.setItem('babble.night', JSON.stringify(window));
      const override = themeOverride(preference, window, new Date(iso));
      const expected = override ?? (prefersDark ? 'dark' : 'light');
      expect(boot(prefersDark)).toEqual({ theme: expected, color: override ? THEME_COLORS[override] : null });
    },
  );

  it.each([null, 'not json', '{"start":1140,"end":420}', '{"timeZone":"Nowhere/Else","start":1,"end":2}'])(
    'follows the system without a usable night window (%s)',
    (stored) => {
      localStorage.setItem('babble.theme', 'night');
      if (stored !== null) localStorage.setItem('babble.night', stored);
      expect(boot(true)).toEqual({ theme: 'dark', color: null });
    },
  );
});
