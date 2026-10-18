import type { EventOfType, PumpDetails } from '@babble/domain';
import { useEffect, useRef, useState } from 'react';
import type { BabbleClient } from '../client';
import type { PumpAmountChanges } from '../events';
import { useSavePumpAmounts } from './use-events';

export const PUMP_AMOUNT_SAVE_DELAY_MS = 600;

export function usePumpAmountsDraft(client: BabbleClient, babyId: string, event: EventOfType<'pump'>) {
  const save = useSavePumpAmounts(client, babyId);
  const [details, setDetails] = useState<PumpDetails>(event.details);
  const pending = useRef<PumpAmountChanges>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useRef(() => {});
  flush.current = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const changes = pending.current;
    pending.current = {};
    if (Object.keys(changes).length > 0) save.mutate({ eventId: event.id, changes });
  };

  useEffect(() => {
    if (timer.current === null) setDetails(event.details);
  }, [event.details]);

  useEffect(() => () => flush.current(), []);

  const change = (patch: PumpAmountChanges) => {
    setDetails((current) => ({ ...current, ...patch, totalMl: null }));
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flush.current(), PUMP_AMOUNT_SAVE_DELAY_MS);
  };

  return { details, change };
}
