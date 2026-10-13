import { clock, queryKeys } from '@babble/api';
import { useTrackingSettings } from '@babble/api/react';
import type { BabbleClient } from '@babble/api';
import { promptsForSessionEvent, type BabyEvent, type NapPrompt, type SessionPromptRequest } from '@babble/domain';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type SessionPromptInput = DistributiveOmit<SessionPromptRequest, 'running' | 'latest' | 'nappyTiming' | 'at'> & {
  at?: string;
};

export function useSessionPrompts(client: BabbleClient, babyId: string): (input: SessionPromptInput) => NapPrompt[] {
  const queryClient = useQueryClient();
  const { nappyPrompt } = useTrackingSettings(client, babyId);
  return useCallback(
    (input) =>
      promptsForSessionEvent({
        ...input,
        at: input.at ?? clock.now().toISOString(),
        running: queryClient.getQueryData<BabyEvent[]>(queryKeys.runningEvents(babyId)) ?? [],
        latest: queryClient.getQueryData<BabyEvent[]>(queryKeys.latestEvents(babyId)) ?? [],
        nappyTiming: nappyPrompt,
      } as SessionPromptRequest),
    [queryClient, babyId, nappyPrompt],
  );
}
