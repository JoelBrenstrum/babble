// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { sampleBaby, sampleEvents } from '../fixtures';
import { queryKeys } from '../queries';
import { fakeClient } from '../test-utils';
import type { BabySettings } from '../types';
import { useSessionPrompts } from './use-session-prompts';

const NOW = new Date('2026-10-13T02:00:00Z');

function render(queryClient: QueryClient) {
  const { client, requests } = fakeClient(() => ({ body: [] }));
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  const { result } = renderHook(() => useSessionPrompts(client, sampleBaby.id), { wrapper });
  return { promptsFor: result.current, requests };
}

describe('useSessionPrompts', () => {
  const feed = sampleEvents(NOW).find((event) => event.type === 'breast_feed')!;

  it('reads the cache at call time without fetching anything', () => {
    const { promptsFor, requests } = render(new QueryClient());
    const prompts = promptsFor({ kind: 'end', event: feed, at: NOW.toISOString() });
    expect(requests).toHaveLength(0);
    expect(prompts.map((prompt) => prompt.kind)).toEqual(['start-nap']);
  });

  it('applies the cached nappy prompt timing', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.babySettings(sampleBaby.id), { nappy_prompt: 'feed_end' } as BabySettings);
    const { promptsFor } = render(queryClient);
    const prompts = promptsFor({ kind: 'end', event: feed, at: NOW.toISOString() });
    expect(prompts.map((prompt) => prompt.kind)).toEqual(['start-nap', 'nappy']);
  });
});
