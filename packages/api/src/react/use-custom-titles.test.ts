// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '../queries';
import { fakeClient } from '../test-utils';
import { useCustomTitleMutations } from './use-custom-titles';

describe('useCustomTitleMutations', () => {
  it('saves a new title even though it shows in the list straight away', async () => {
    const { client, requests } = fakeClient((request) =>
      request.method === 'POST' ? { status: 201, body: [] } : { body: [{ title: 'Bath' }, { title: 'Calpol' }] },
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.customTitles('baby-1'), ['Bath']);
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
    const { result } = renderHook(() => useCustomTitleMutations(client, 'baby-1'), { wrapper });

    act(() => result.current.add.mutate('Calpol'));

    await waitFor(() => expect(result.current.add.isSuccess).toBe(true));
    expect(requests.filter((request) => request.method === 'POST').map((request) => request.body)).toEqual([
      { baby_id: 'baby-1', title: 'Calpol' },
    ]);
  });
});
