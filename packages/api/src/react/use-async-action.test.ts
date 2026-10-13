// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAsyncAction } from './use-async-action';

describe('useAsyncAction', () => {
  it('reports success and clears busy', async () => {
    const { result } = renderHook(() => useAsyncAction());
    let ok = false;
    await act(async () => {
      ok = await result.current.run(async () => undefined);
    });
    expect(ok).toBe(true);
    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('turns a failure into an error message', async () => {
    const { result } = renderHook(() => useAsyncAction());
    let ok = true;
    await act(async () => {
      ok = await result.current.run(async () => {
        throw new Error('Nope');
      });
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.busy).toBe(false);
  });

  it('clears the previous error on the next run', async () => {
    const { result } = renderHook(() => useAsyncAction());
    await act(async () => {
      await result.current.run(async () => {
        throw new Error('Nope');
      });
    });
    await act(async () => {
      await result.current.run(async () => undefined);
    });
    expect(result.current.error).toBeNull();
  });
});
