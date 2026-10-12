import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFullscreen } from './fullscreen';

let element: Element | null = null;
const requestFullscreen = vi.fn(async () => {
  element = document.documentElement;
  document.dispatchEvent(new Event('fullscreenchange'));
});
const exitFullscreen = vi.fn(async () => {
  element = null;
  document.dispatchEvent(new Event('fullscreenchange'));
});

beforeEach(() => {
  element = null;
  Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
  Object.defineProperty(document, 'fullscreenElement', { get: () => element, configurable: true });
  Object.defineProperty(document, 'exitFullscreen', { value: exitFullscreen, configurable: true });
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    value: requestFullscreen,
    configurable: true,
  });
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('useFullscreen', () => {
  it('wants full screen by default and follows the browser state', async () => {
    const { result } = renderHook(() => useFullscreen());
    expect(result.current).toMatchObject({ supported: true, active: false, wanted: true });
    await act(async () => result.current.enter());
    expect(requestFullscreen).toHaveBeenCalled();
    expect(result.current.active).toBe(true);
  });

  it('remembers leaving full screen', async () => {
    const { result } = renderHook(() => useFullscreen());
    await act(async () => result.current.enter());
    await act(async () => result.current.exit());
    expect(exitFullscreen).toHaveBeenCalled();
    expect(result.current).toMatchObject({ active: false, wanted: false });
    expect(localStorage.getItem('babble.chairFullscreen')).toBe('off');
    expect(renderHook(() => useFullscreen()).result.current.wanted).toBe(false);
  });
});
