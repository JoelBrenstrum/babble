// @vitest-environment jsdom
import type { EventOfType } from '@babble/domain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { sampleBaby, sampleEvents } from '../fixtures';
import { fakeClient } from '../test-utils';
import { NotifyProvider } from './notify';
import { usePumpAmountsDraft } from './use-pump-amounts';

const babyId = sampleBaby.id;

function setup() {
  const { client, requests } = fakeClient(() => ({ status: 204, body: null }));
  const pump = sampleEvents(new Date()).find((event) => event.type === 'pump') as EventOfType<'pump'>;
  const event: EventOfType<'pump'> = {
    ...pump,
    endedAt: null,
    details: { leftMl: null, rightMl: null, totalMl: null },
  };
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(NotifyProvider, { notify: vi.fn() }, children),
    );
  const hook = renderHook((props: { event: EventOfType<'pump'> }) => usePumpAmountsDraft(client, babyId, props.event), {
    wrapper,
    initialProps: { event },
  });
  return { ...hook, event, requests };
}

describe('usePumpAmountsDraft', () => {
  it('combines quick changes to both sides into one save', async () => {
    const { result, requests } = setup();
    act(() => result.current.change({ leftMl: 20 }));
    act(() => result.current.change({ rightMl: 30 }));
    act(() => result.current.change({ leftMl: 40 }));

    expect(result.current.details).toEqual({ leftMl: 40, rightMl: 30, totalMl: null });
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]!.body).toMatchObject({ changes: { left_ml: 40, right_ml: 30 } });
  });

  it('saves a pending change when it unmounts', async () => {
    const { result, unmount, requests } = setup();
    act(() => result.current.change({ rightMl: 10 }));
    unmount();
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]!.body).toMatchObject({ changes: { right_ml: 10 } });
  });

  it('picks up amounts saved on another device while nothing is pending', () => {
    const { result, rerender, event } = setup();
    rerender({ event: { ...event, details: { leftMl: 70, rightMl: null, totalMl: null } } });
    expect(result.current.details.leftMl).toBe(70);
  });

  it('keeps what is being typed when another update arrives mid-edit', () => {
    const { result, rerender, event } = setup();
    act(() => result.current.change({ leftMl: 50 }));
    rerender({ event: { ...event, details: { leftMl: 10, rightMl: null, totalMl: null } } });
    expect(result.current.details.leftMl).toBe(50);
  });
});
