import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNightTheme } from './use-night-theme';

const night = { timeZone: 'UTC', start: 1140, end: 420 };

describe('useNightTheme', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.matchMedia = ((query: string) => ({ matches: false, media: query })) as typeof window.matchMedia;
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  const isDark = () => document.documentElement.classList.contains('dark');

  it('caches the night window for the boot script', () => {
    renderHook(() => useNightTheme(night));
    expect(JSON.parse(localStorage.getItem('babble.night')!)).toEqual(night);
  });

  it('flips to dark when the night window starts', () => {
    vi.setSystemTime(new Date('2026-10-09T18:59:30Z'));
    localStorage.setItem('babble.theme', 'night');
    renderHook(() => useNightTheme(night));
    expect(isDark()).toBe(false);
    vi.advanceTimersByTime(60_000);
    expect(isDark()).toBe(true);
  });

  it('leaves other choices alone', () => {
    vi.setSystemTime(new Date('2026-10-09T23:00:00Z'));
    localStorage.setItem('babble.theme', 'light');
    renderHook(() => useNightTheme(night));
    vi.advanceTimersByTime(60_000);
    expect(isDark()).toBe(false);
  });
});
