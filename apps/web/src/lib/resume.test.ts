import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RESUME_RELOAD_AFTER_MS, shouldReloadOnResume, watchResume } from './resume';

const base = { hiddenAt: 0, now: RESUME_RELOAD_AFTER_MS, online: true, pathname: '/' };

describe('shouldReloadOnResume', () => {
  it('reloads once the app has been hidden long enough', () => {
    expect(shouldReloadOnResume(base)).toBe(true);
    expect(shouldReloadOnResume({ ...base, now: RESUME_RELOAD_AFTER_MS - 1 })).toBe(false);
  });

  it('never reloads without a hidden time, offline, or on the chair', () => {
    expect(shouldReloadOnResume({ ...base, hiddenAt: null })).toBe(false);
    expect(shouldReloadOnResume({ ...base, online: false })).toBe(false);
    expect(shouldReloadOnResume({ ...base, pathname: '/chair' })).toBe(false);
  });
});

describe('watchResume', () => {
  let visibility: DocumentVisibilityState = 'visible';

  function setVisibility(value: DocumentVisibilityState) {
    visibility = value;
    document.dispatchEvent(new Event('visibilitychange'));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', { get: () => visibility, configurable: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    visibility = 'visible';
  });

  it('reloads after a long time hidden and then starts counting afresh', () => {
    const reload = vi.fn();
    const stop = watchResume(reload, 1000);
    setVisibility('hidden');
    vi.advanceTimersByTime(500);
    setVisibility('visible');
    expect(reload).not.toHaveBeenCalled();
    setVisibility('hidden');
    vi.advanceTimersByTime(1000);
    setVisibility('visible');
    expect(reload).toHaveBeenCalledTimes(1);
    stop();
    setVisibility('hidden');
    vi.advanceTimersByTime(1000);
    setVisibility('visible');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('keeps the first hidden time across repeated hidden events', () => {
    const reload = vi.fn();
    const stop = watchResume(reload, 1000);
    setVisibility('hidden');
    vi.advanceTimersByTime(600);
    setVisibility('hidden');
    vi.advanceTimersByTime(600);
    setVisibility('visible');
    expect(reload).toHaveBeenCalledTimes(1);
    stop();
  });
});
