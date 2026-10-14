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

function setDisplayMode(fullscreen: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) => ({ matches: fullscreen && query === '(display-mode: fullscreen)' }),
    configurable: true,
  });
}

beforeEach(() => {
  element = null;
  Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
  Object.defineProperty(document, 'fullscreenElement', { get: () => element, configurable: true });
  Object.defineProperty(document, 'exitFullscreen', { value: exitFullscreen, configurable: true });
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    value: requestFullscreen,
    configurable: true,
  });
  setDisplayMode(false);
});

afterEach(() => vi.clearAllMocks());

describe('useFullscreen', () => {
  it('enters and leaves full screen when asked', async () => {
    const { result } = renderHook(() => useFullscreen());
    expect(result.current).toMatchObject({ supported: true, active: false });
    await act(async () => result.current.enter());
    expect(requestFullscreen).toHaveBeenCalled();
    expect(result.current.active).toBe(true);
    await act(async () => result.current.exit());
    expect(exitFullscreen).toHaveBeenCalled();
    expect(result.current.active).toBe(false);
  });

  it('offers nothing when the browser itself is full screen, as in kiosk mode', () => {
    setDisplayMode(true);
    expect(renderHook(() => useFullscreen()).result.current.supported).toBe(false);
  });
});
