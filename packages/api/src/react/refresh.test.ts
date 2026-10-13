import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { refreshEvents, refreshFamilies } from './refresh';

describe('refresh', () => {
  it('invalidates only active event queries', async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    await refreshEvents(queryClient, 'baby-1');
    expect(spy).toHaveBeenCalledWith({ queryKey: ['events', 'baby-1'] });
  });

  it('refetches families even when no screen is showing them', async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    await refreshFamilies(queryClient);
    expect(spy).toHaveBeenCalledWith({ queryKey: ['families'], refetchType: 'all' });
  });
});
