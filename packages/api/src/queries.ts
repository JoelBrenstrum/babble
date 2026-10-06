import type { BabbleClient } from './client';
import { checkInvite, getBabySettings, getInstanceSettings, listFamilies } from './families';

export const queryKeys = {
  instanceSettings: ['instance-settings'] as const,
  families: ['families'] as const,
  babySettings: (babyId: string) => ['baby-settings', babyId] as const,
  invite: (code: string) => ['invite', code] as const,
};

export function instanceSettingsQuery(client: BabbleClient) {
  return {
    queryKey: queryKeys.instanceSettings,
    queryFn: () => getInstanceSettings(client),
    staleTime: 5 * 60_000,
  };
}

export function familiesQuery(client: BabbleClient) {
  return { queryKey: queryKeys.families, queryFn: () => listFamilies(client) };
}

export function babySettingsQuery(client: BabbleClient, babyId: string) {
  return { queryKey: queryKeys.babySettings(babyId), queryFn: () => getBabySettings(client, babyId) };
}

export function inviteQuery(client: BabbleClient, code: string) {
  return { queryKey: queryKeys.invite(code), queryFn: () => checkInvite(client, code), retry: false };
}
