import type { BabbleClient } from './client';
import type { EventType } from '@babble/domain';
import { getEvent, latestEvents, listEvents, runningEvents } from './events';
import { checkInvite, getBabySettings, getInstanceSettings, listFamilies } from './families';

export const queryKeys = {
  instanceSettings: ['instance-settings'] as const,
  families: ['families'] as const,
  babySettings: (babyId: string) => ['baby-settings', babyId] as const,
  invite: (code: string) => ['invite', code] as const,
  events: (babyId: string) => ['events', babyId] as const,
  eventList: (babyId: string, types: readonly EventType[]) => ['events', babyId, 'list', ...types] as const,
  latestEvents: (babyId: string) => ['events', babyId, 'latest'] as const,
  runningEvents: (babyId: string) => ['events', babyId, 'running'] as const,
  eventsSince: (babyId: string, since: string) => ['events', babyId, 'since', since] as const,
  event: (babyId: string, id: string) => ['events', babyId, 'event', id] as const,
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

export function eventListQuery(client: BabbleClient, babyId: string, types: EventType[]) {
  return {
    queryKey: queryKeys.eventList(babyId, types),
    queryFn: () => listEvents(client, babyId, { types, limit: 100 }),
  };
}

export function latestEventsQuery(client: BabbleClient, babyId: string) {
  return { queryKey: queryKeys.latestEvents(babyId), queryFn: () => latestEvents(client, babyId) };
}

export function runningEventsQuery(client: BabbleClient, babyId: string) {
  return { queryKey: queryKeys.runningEvents(babyId), queryFn: () => runningEvents(client, babyId) };
}

export function eventsSinceQuery(client: BabbleClient, babyId: string, since: string) {
  return {
    queryKey: queryKeys.eventsSince(babyId, since),
    queryFn: () => listEvents(client, babyId, { since, limit: 500 }),
  };
}

export function eventQuery(client: BabbleClient, babyId: string, id: string) {
  return { queryKey: queryKeys.event(babyId, id), queryFn: () => getEvent(client, id) };
}
