import { babySettingsQuery, eventsBetweenQuery, type BabyRow, type Family } from '@babble/api';
import { familyHasFeature } from '@babble/config';
import { dayKeyFor, dayWindow, insightsReport, insightsSince, type InsightsReport } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useBabble } from './babble';

export type InsightsState = { locked: true } | { locked: false; report: InsightsReport | null };

export function useInsights(baby: BabyRow, family: Family, now: Date): InsightsState {
  const { client, config } = useBabble();
  const enabled = familyHasFeature(config.billingEnabled, family.plan, 'insights');
  const settings = useQuery(babySettingsQuery(client, baby.id)).data;
  const todayKey = dayKeyFor(now.toISOString(), baby.timezone, baby.day_start_minutes);
  const from = insightsSince(todayKey, {
    timeZone: baby.timezone,
    dayStartMinutes: baby.day_start_minutes,
    nightStartMinutes: settings?.night_start_minutes ?? 1140,
    nightEndMinutes: settings?.night_end_minutes ?? 420,
  });
  const to = dayWindow(todayKey, baby.timezone, baby.day_start_minutes).end.toISOString();
  const events = useQuery({ ...eventsBetweenQuery(client, baby.id, from, to), enabled }).data;
  const report = useMemo(
    () =>
      enabled && events && settings
        ? insightsReport(events, todayKey, now, {
            timeZone: baby.timezone,
            dayStartMinutes: baby.day_start_minutes,
            nightStartMinutes: settings.night_start_minutes,
            nightEndMinutes: settings.night_end_minutes,
            mergeGapMs: settings.downtime_merge_threshold_sec * 1000,
          })
        : null,
    [enabled, events, settings, todayKey, now, baby.timezone, baby.day_start_minutes],
  );
  return enabled ? { locked: false, report } : { locked: true };
}
