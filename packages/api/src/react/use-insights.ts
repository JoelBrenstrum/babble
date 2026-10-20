import { familyHasFeature } from '@babble/config';
import {
  DEFAULT_NIGHT_END_MINUTES,
  DEFAULT_NIGHT_START_MINUTES,
  dayKeyFor,
  dayWindow,
  insightsReport,
  insightsSince,
  mergeGapMsFrom,
  nightSettingsFrom,
  predictAhead,
  predictionSince,
  type InsightsReport,
  type PredictedBlock,
} from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { BabbleClient } from '../client';
import { babySettingsQuery, eventsBetweenQuery, eventsSinceQuery } from '../queries';
import type { BabyRow, BabySettings, Family } from '../types';

export type InsightsState = { locked: true } | { locked: false; report: InsightsReport | null };

type InsightsBaby = Pick<BabyRow, 'id' | 'timezone' | 'day_start_minutes'>;
type PlanHolder = Pick<Family, 'plan'>;

function insightsScope(baby: InsightsBaby, settings: BabySettings | undefined) {
  return {
    timeZone: baby.timezone,
    dayStartMinutes: baby.day_start_minutes,
    ...(settings
      ? nightSettingsFrom(settings)
      : { nightStartMinutes: DEFAULT_NIGHT_START_MINUTES, nightEndMinutes: DEFAULT_NIGHT_END_MINUTES }),
  };
}

export function useInsights(
  client: BabbleClient,
  billingEnabled: boolean,
  baby: InsightsBaby,
  family: PlanHolder,
  now: Date,
): InsightsState {
  const enabled = familyHasFeature(billingEnabled, family.plan, 'insights');
  const settings = useQuery(babySettingsQuery(client, baby.id)).data;
  const todayKey = dayKeyFor(now.toISOString(), baby.timezone, baby.day_start_minutes);
  const scope = useMemo(() => insightsScope(baby, settings), [baby, settings]);
  const from = insightsSince(todayKey, scope);
  const to = dayWindow(todayKey, baby.timezone, baby.day_start_minutes).end.toISOString();
  const events = useQuery({ ...eventsBetweenQuery(client, baby.id, from, to), enabled }).data;
  const report = useMemo(
    () =>
      enabled && events && settings
        ? insightsReport(events, todayKey, now, { ...scope, mergeGapMs: mergeGapMsFrom(settings) })
        : null,
    [enabled, events, settings, todayKey, now, scope],
  );
  return enabled ? { locked: false, report } : { locked: true };
}

export function usePrediction(
  client: BabbleClient,
  billingEnabled: boolean,
  baby: Pick<BabyRow, 'id' | 'timezone' | 'birth_date'>,
  family: PlanHolder,
  now: Date,
): PredictedBlock[] | null {
  const enabled = familyHasFeature(billingEnabled, family.plan, 'predictions');
  const events = useQuery({ ...eventsSinceQuery(client, baby.id, predictionSince(now)), enabled }).data;
  return useMemo(
    () =>
      enabled && events ? predictAhead(events, now, { timeZone: baby.timezone, birthDate: baby.birth_date }) : null,
    [enabled, events, now, baby.timezone, baby.birth_date],
  );
}
