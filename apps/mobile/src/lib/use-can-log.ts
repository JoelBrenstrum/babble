import { canLog } from '@babble/api';
import { useBabble } from './babble';
import { useReadyState } from './use-onboarding';

export function useCanLog(): boolean {
  const ready = useReadyState();
  const { session } = useBabble();
  return ready && session ? canLog(ready.family, session.user.id) : false;
}
