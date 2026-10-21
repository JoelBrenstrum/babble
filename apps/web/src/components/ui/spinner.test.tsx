import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STALL_MS } from '#/lib/use-stalled';
import { PageSpinner } from './spinner';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('PageSpinner', () => {
  it('offers a reload once loading has stalled', () => {
    const onReload = vi.fn();
    render(<PageSpinner onReload={onReload} />);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(STALL_MS));
    expect(screen.getByText('This is taking longer than usual.')).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'Reload' }).click());
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
