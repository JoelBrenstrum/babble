// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { fakeClient } from '../test-utils';
import { useCurrentDeviceName, useDeviceNameSync, type LocalDeviceName } from './device-name';

const device = (name: string | null) => ({
  session_id: 'session-1',
  user_id: 'user-1',
  member_name: 'Joel',
  name,
  user_agent: 'okhttp/4',
  created_at: '2026-10-14T00:00:00Z',
  last_active: '2026-10-15T00:00:00Z',
  is_current: true,
});

function setup(serverName: string | null, localName: string) {
  const { client, requests } = fakeClient((request) =>
    request.url.pathname.endsWith('/family_devices') ? { body: [device(serverName)] } : { status: 204, body: null },
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let stored = localName;
  const local: LocalDeviceName = { read: () => stored, write: (name) => void (stored = name) };
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  const renames = () => requests.filter((request) => request.url.pathname.endsWith('/rename_device'));
  return { client, local, wrapper, renames, stored: () => stored };
}

describe('useDeviceNameSync', () => {
  it('uploads the name saved on this device when the server has none', async () => {
    const { client, local, wrapper, renames } = setup(null, 'Chair');
    renderHook(() => useDeviceNameSync(client, 'family-1', local), { wrapper });
    await waitFor(() => expect(renames()).toHaveLength(1));
    expect(renames()[0]!.body).toEqual({ target_session_id: 'session-1', new_name: 'Chair' });
  });

  it('keeps a name set elsewhere, like by an admin, on this device', async () => {
    const { client, local, wrapper, renames, stored } = setup('Nursery', 'Chair');
    renderHook(() => useDeviceNameSync(client, 'family-1', local), { wrapper });
    await waitFor(() => expect(stored()).toBe('Nursery'));
    expect(renames()).toHaveLength(0);
  });
});

describe('useCurrentDeviceName', () => {
  it('shows the server name and saves changes for this session', async () => {
    const { client, local, wrapper, renames, stored } = setup('Chair', '');
    const { result } = renderHook(() => useCurrentDeviceName(client, 'family-1', local), { wrapper });
    await waitFor(() => expect(result.current.name).toBe('Chair'));
    act(() => result.current.setName('Nursery'));
    expect(stored()).toBe('Nursery');
    await waitFor(() => expect(renames()).toHaveLength(1));
    expect(renames()[0]!.body).toEqual({ target_session_id: 'session-1', new_name: 'Nursery' });
  });

  it('does not save names that are too long', async () => {
    const { client, local, wrapper, renames } = setup('Chair', '');
    const { result } = renderHook(() => useCurrentDeviceName(client, 'family-1', local), { wrapper });
    await waitFor(() => expect(result.current.name).toBe('Chair'));
    act(() => result.current.setName('x'.repeat(61)));
    expect(result.current.error).toBe('Use 60 characters or fewer for the name.');
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(renames()).toHaveLength(0);
  });
});
