import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCharging, useScreenWakeLock } from './wake-lock';

function mockWakeLock() {
  const sentinels: { released: boolean; release: () => Promise<void> }[] = [];
  const request = vi.fn(async () => {
    const sentinel = {
      released: false,
      release: vi.fn(async () => {
        sentinel.released = true;
      }),
    };
    sentinels.push(sentinel);
    return sentinel;
  });
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  return { request, sentinels };
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock');
  Reflect.deleteProperty(navigator, 'getBattery');
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});

describe('useScreenWakeLock', () => {
  it('holds the lock while enabled and releases it when turned off', async () => {
    const { request, sentinels } = mockWakeLock();
    const { rerender } = renderHook(({ on }) => useScreenWakeLock(on), { initialProps: { on: true } });
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'));
    rerender({ on: false });
    await waitFor(() => expect(sentinels[0]!.released).toBe(true));
  });

  it('takes the lock again when the page comes back into view', async () => {
    const { request, sentinels } = mockWakeLock();
    renderHook(() => useScreenWakeLock(true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    sentinels[0]!.released = true;
    act(() => setVisibility('visible'));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it('does nothing when off or unsupported', () => {
    const { request } = mockWakeLock();
    renderHook(() => useScreenWakeLock(false));
    expect(request).not.toHaveBeenCalled();
    Reflect.deleteProperty(navigator, 'wakeLock');
    expect(() => renderHook(() => useScreenWakeLock(true))).not.toThrow();
  });
});

describe('useCharging', () => {
  it('is unknown without the battery API', () => {
    expect(renderHook(() => useCharging()).result.current).toBeNull();
  });

  it('follows charging changes', async () => {
    const battery = Object.assign(new EventTarget(), { charging: false });
    Object.defineProperty(navigator, 'getBattery', { value: async () => battery, configurable: true });
    const { result } = renderHook(() => useCharging());
    await waitFor(() => expect(result.current).toBe(false));
    act(() => {
      battery.charging = true;
      battery.dispatchEvent(new Event('chargingchange'));
    });
    expect(result.current).toBe(true);
  });
});
