// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSettled } from './use-settled';

describe('useSettled', () => {
  it('holds the last settled value until the new one settles', () => {
    const { result, rerender } = renderHook(({ value, settled }) => useSettled(value, settled), {
      initialProps: { value: '7d', settled: true },
    });
    expect(result.current).toBe('7d');
    rerender({ value: '30d', settled: false });
    expect(result.current).toBe('7d');
    rerender({ value: '30d', settled: true });
    expect(result.current).toBe('30d');
    rerender({ value: '30d', settled: false });
    expect(result.current).toBe('30d');
  });
});
