import { eventsSinceQuery, type BabyRow, type Family } from '@babble/api';
import { familyHasFeature } from '@babble/config';
import { predictAhead, predictionSince, type PredictedBlock } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { Babble } from './babble';

export function usePrediction(babble: Babble, baby: BabyRow, family: Family, now: Date): PredictedBlock[] | null {
  const enabled = familyHasFeature(babble.config.billingEnabled, family.plan, 'predictions');
  const events = useQuery({ ...eventsSinceQuery(babble.client, baby.id, predictionSince(now)), enabled }).data;
  return useMemo(
    () => (enabled && events ? predictAhead(events, now, baby.timezone) : null),
    [enabled, events, now, baby.timezone],
  );
}
