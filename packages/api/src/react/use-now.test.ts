// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNow, WakeProvider } from './use-now';

describe('useNow', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-13T10:00:00Z') }));
  afterEach(() => vi.useRealTimers());

  it('ticks on its interval', () => {
    const { result } = renderHook(() => useNow(60_000));
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.toISOString()).toBe('2026-10-13T10:01:00.000Z');
  });

  it('catches up immediately when the app wakes', () => {
    let wake: () => void = () => undefined;
    const stop = vi.fn();
    const onWake = (listener: () => void) => {
      wake = listener;
      return stop;
    };
    const wrapper = ({ children }: { children: ReactNode }) => createElement(WakeProvider, { onWake }, children);
    const { result, unmount } = renderHook(() => useNow(60_000), { wrapper });
    vi.setSystemTime(new Date('2026-10-13T12:30:00Z'));
    expect(result.current.toISOString()).toBe('2026-10-13T10:00:00.000Z');
    act(() => wake());
    expect(result.current.toISOString()).toBe('2026-10-13T12:30:00.000Z');
    unmount();
    expect(stop).toHaveBeenCalled();
  });

  it('refreshes as soon as it is enabled and does nothing while disabled', () => {
    const { result, rerender } = renderHook((enabled: boolean) => useNow(1000, enabled), { initialProps: false });
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.toISOString()).toBe('2026-10-13T10:00:00.000Z');
    rerender(true);
    expect(result.current.toISOString()).toBe('2026-10-13T10:00:05.000Z');
  });
});
