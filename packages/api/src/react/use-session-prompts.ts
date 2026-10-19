import { promptsForSessionEvent, type BabyEvent, type NapPrompt, type SessionPromptRequest } from '@babble/domain';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { BabbleClient } from '../client';
import { clock } from '../clock';
import { queryKeys } from '../queries';
import type { BabySettings } from '../types';
import { trackingSettingsFrom } from './tracking-settings';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type SessionPromptInput = DistributiveOmit<SessionPromptRequest, 'running' | 'latest' | 'nappyTiming' | 'at'> & {
  at?: string;
};

export function useSessionPrompts(_client: BabbleClient, babyId: string): (input: SessionPromptInput) => NapPrompt[] {
  const queryClient = useQueryClient();
  return useCallback(
    (input) => {
      const settings = queryClient.getQueryData<BabySettings>(queryKeys.babySettings(babyId));
      return promptsForSessionEvent({
        ...input,
        at: input.at ?? clock.now().toISOString(),
        running: queryClient.getQueryData<BabyEvent[]>(queryKeys.runningEvents(babyId)) ?? [],
        latest: queryClient.getQueryData<BabyEvent[]>(queryKeys.latestEvents(babyId)) ?? [],
        nappyTiming: trackingSettingsFrom(settings).nappyPrompt,
      } as SessionPromptRequest);
    },
    [queryClient, babyId],
  );
}
