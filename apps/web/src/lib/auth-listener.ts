import { accountChanged } from '@babble/api';

export interface AuthEffects {
  accountChanged: boolean;
  refresh: boolean;
}

export function authEffects(
  event: string,
  previousUserId: string | null | undefined,
  nextUserId: string | null,
): AuthEffects {
  const changed = accountChanged(previousUserId, nextUserId);
  return { accountChanged: changed, refresh: changed || event === 'SIGNED_IN' || event === 'SIGNED_OUT' };
}
