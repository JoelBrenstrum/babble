import type { NapAction } from '@babble/domain';
import type { BabbleClient } from './client';
import { endSession, startSession } from './events';

export type DataNapAction = Exclude<NapAction, { kind: 'log-nappy' } | null>;

export function isDataNapAction(action: NapAction): action is DataNapAction {
  return action !== null && action.kind !== 'log-nappy';
}

export async function runNapAction(client: BabbleClient, babyId: string, action: DataNapAction): Promise<void> {
  switch (action.kind) {
    case 'end-nap':
      return endSession(client, action.napId, action.at);
    case 'end-feed':
      return endSession(client, action.feedId, action.at);
    case 'start-nap':
      await startSession(client, babyId, 'sleep', 'left', action.at);
  }
}
