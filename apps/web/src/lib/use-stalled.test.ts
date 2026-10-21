import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStalled } from './use-stalled';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useStalled', () => {
  it('flips to stalled after the wait', () => {
    const { result } = renderHook(() => useStalled(1000));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(999));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  it('stops the timer on unmount', () => {
    const { unmount } = renderHook(() => useStalled(1000));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
