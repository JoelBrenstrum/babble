// @vitest-environment jsdom
import { addCard, defaultDashboard, moveCard, type DashboardLayout } from '@babble/domain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '../queries';
import { fakeClient } from '../test-utils';
import { useDashboardEditor } from './use-dashboard';

const familyId = 'family-1';

function setup(respond: () => { status: number; body: unknown }) {
  const { client, requests } = fakeClient(respond);
  const queryClient = new QueryClient();
  const stored = defaultDashboard();
  queryClient.setQueryData(queryKeys.dashboard(familyId), stored);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  const hook = renderHook(() => useDashboardEditor(client, familyId), { wrapper });
  const cached = () => queryClient.getQueryData<DashboardLayout>(queryKeys.dashboard(familyId))!;
  return { ...hook, requests, stored, cached };
}

const note = (layout: DashboardLayout) => addCard(layout, { kind: 'text', body: 'Typed', size: 's' });

describe('useDashboardEditor', () => {
  it('builds each edit on the one before it, even within the same tick', async () => {
    const { result, requests, stored, cached } = setup(() => ({ status: 204, body: null }));
    act(() => {
      result.current.edit(note, stored);
      result.current.edit((layout) => moveCard(layout, 'sleep', 1), stored);
    });
    expect(
      cached()
        .cards.map((card) => card.id)
        .slice(0, 2),
    ).toEqual(['feeds', 'sleep']);
    expect(cached().cards.at(-1)).toMatchObject({ kind: 'text', body: 'Typed' });
    await waitFor(() => expect(requests).toHaveLength(2));
    await waitFor(() => expect(result.current.unsaved).toBeNull());
  });

  it('sends nothing for an edit that changes nothing', () => {
    const { result, requests, stored } = setup(() => ({ status: 204, body: null }));
    act(() => result.current.edit((layout) => layout, stored));
    expect(requests).toHaveLength(0);
  });

  it('keeps a failed edit so it can be sent again', async () => {
    let status = 500;
    const { result, requests, stored } = setup(() => ({ status, body: status === 500 ? { message: 'down' } : null }));
    act(() => result.current.edit(note, stored));
    await waitFor(() => expect(result.current.unsaved?.cards.at(-1)).toMatchObject({ body: 'Typed' }));

    status = 204;
    const sent = requests.length;
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.unsaved).toBeNull());
    expect(requests.length).toBeGreaterThan(sent);
  });

  it('drops a failed edit when it is discarded', async () => {
    const { result, stored } = setup(() => ({ status: 500, body: { message: 'down' } }));
    act(() => result.current.edit(note, stored));
    await waitFor(() => expect(result.current.unsaved).not.toBeNull());
    act(() => result.current.discard());
    expect(result.current.unsaved).toBeNull();
  });
});
