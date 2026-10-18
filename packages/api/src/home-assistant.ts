import type { ActionStep, BabyEvent } from '@babble/domain';
import type { BabbleClient } from './client';
import { unwrap } from './errors';
import { getBabySettings } from './families';
import {
  deleteEvent,
  latestEvents,
  listEvents,
  runningEvents,
  runSessionAction,
  saveEvent,
  startSession,
} from './events';
import type { BabyRow, BabySettings } from './types';

export type HomeAssistantBaby = BabyRow & { family_name: string; plan: string };

export interface HomeAssistantData {
  babies(): Promise<HomeAssistantBaby[]>;
  settings(babyId: string): Promise<BabySettings>;
  events(babyId: string, since: string): Promise<BabyEvent[]>;
  running(babyId: string): Promise<BabyEvent[]>;
  perform(babyId: string, step: ActionStep): Promise<void>;
}

export function homeAssistantData(client: BabbleClient): HomeAssistantData {
  return {
    async babies() {
      const rows = unwrap(await client.from('babies').select('*, families(name, plan)').order('created_at'));
      return rows.map(({ families, ...baby }) => ({
        ...baby,
        family_name: families?.name ?? '',
        plan: families?.plan ?? 'free',
      }));
    },
    settings: (babyId) => getBabySettings(client, babyId),
    async events(babyId, since) {
      const [running, latest, recent] = await Promise.all([
        runningEvents(client, babyId),
        latestEvents(client, babyId),
        listEvents(client, babyId, { since, limit: 500 }),
      ]);
      return [...running, ...latest, ...recent];
    },
    running: (babyId) => runningEvents(client, babyId),
    async perform(babyId, step) {
      switch (step.kind) {
        case 'start':
          await startSession(client, babyId, step.type, step.side, step.startAt);
          return;
        case 'session':
          return runSessionAction(client, step.eventId, step.action);
        case 'delete':
          return deleteEvent(client, step.eventId);
        case 'save':
          await saveEvent(client, babyId, step.draft);
          return;
      }
    },
  };
}
