import type { BabyRow, Family } from '@babble/api';
import { useEventsInRange } from '@babble/api/react';
import { familyHasFeature } from '@babble/config';
import { DAY_MS, predictAhead, predictionSince, type PredictedBlock } from '@babble/domain';
import { useMemo } from 'react';
import type { Babble } from './babble';

export function usePrediction(babble: Babble, baby: BabyRow, family: Family, now: Date): PredictedBlock[] | null {
  const enabled = familyHasFeature(babble.config.billingEnabled, family.plan, 'predictions');
  const events = useEventsInRange(babble.client, baby.id, {
    from: predictionSince(now),
    to: new Date(now.getTime() + DAY_MS).toISOString(),
    timeZone: baby.timezone,
    dayStartMinutes: baby.day_start_minutes,
    enabled,
  }).data;
  return useMemo(
    () => (enabled && events ? predictAhead(events, now, baby.timezone) : null),
    [enabled, events, now, baby.timezone],
  );
}
