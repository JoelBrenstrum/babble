import {
  DEFAULT_NIGHT_END_MINUTES,
  DEFAULT_NIGHT_START_MINUTES,
  dayKeyFor,
  dayWindow,
  nightSettingsFrom,
  reportDays,
  runReport,
  shiftDay,
  type ReportResult,
  type ReportSettings,
  type ReportSpec,
} from '@babble/domain';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import type { BabbleClient } from '../client';
import { babySettingsQuery, eventsBetweenQuery, queryKeys, reportsQuery } from '../queries';
import { createReport, deleteReport, subscribeToReports, updateReport, type SavedReport } from '../reports';
import type { BabyRow, BabySettings, Family } from '../types';
import { trackingSettingsFrom } from './tracking-settings';

export function useReports(client: BabbleClient, familyId: string) {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      subscribeToReports(
        client,
        familyId,
        () => void queryClient.invalidateQueries({ queryKey: queryKeys.reports(familyId) }),
      ),
    [client, familyId, queryClient],
  );
  return useQuery(reportsQuery(client, familyId));
}

export function useReportMutations(client: BabbleClient, familyId: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.reports(familyId) });
  const create = useMutation({
    mutationFn: (report: { name: string; spec: ReportSpec }) => createReport(client, { familyId, ...report }),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({ id, ...changes }: { id: string; name?: string; spec?: ReportSpec }) =>
      updateReport(client, id, changes),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: (id: string) => deleteReport(client, id), onSuccess: refresh });
  return { create, update, remove };
}

type ReportBaby = Pick<BabyRow, 'id' | 'timezone' | 'day_start_minutes' | 'birth_date'>;
type ReportFamily = Pick<Family, 'members' | 'former_members'>;

export function reportSettingsFor(
  baby: ReportBaby,
  family: ReportFamily,
  settings: BabySettings | undefined,
): ReportSettings {
  const tracking = trackingSettingsFrom(settings);
  const carers: Record<string, string> = {};
  for (const member of family.former_members) carers[member.user_id] = member.display_name;
  for (const member of family.members) carers[member.user_id] = member.display_name;
  return {
    timeZone: baby.timezone,
    dayStartMinutes: baby.day_start_minutes,
    ...(settings
      ? nightSettingsFrom(settings)
      : { nightStartMinutes: DEFAULT_NIGHT_START_MINUTES, nightEndMinutes: DEFAULT_NIGHT_END_MINUTES }),
    mergeGapMs: tracking.mergeGapMs,
    units: tracking.units,
    birthDate: baby.birth_date,
    carers,
  };
}

export function reportWindow(
  spec: ReportSpec,
  baby: ReportBaby,
  now: Date,
): { todayKey: string; from: string; to: string } {
  const todayKey = dayKeyFor(now.toISOString(), baby.timezone, baby.day_start_minutes);
  const dayKeys = reportDays(spec.range, todayKey, baby.birth_date);
  const first = spec.compare === 'previous' ? shiftDay(dayKeys[0]!, -dayKeys.length) : dayKeys[0]!;
  return {
    todayKey,
    from: dayWindow(first, baby.timezone, baby.day_start_minutes).start.toISOString(),
    to: dayWindow(todayKey, baby.timezone, baby.day_start_minutes).end.toISOString(),
  };
}

export interface ReportData {
  result: ReportResult | null;
  settings: ReportSettings;
  loading: boolean;
  error: unknown;
}

export function useReportData(
  client: BabbleClient,
  baby: ReportBaby,
  family: ReportFamily,
  spec: ReportSpec,
  now: Date,
  options: { enabled?: boolean } = {},
): ReportData {
  const enabled = options.enabled ?? true;
  const babySettings = useQuery(babySettingsQuery(client, baby.id)).data;
  const settings = useMemo(() => reportSettingsFor(baby, family, babySettings), [baby, family, babySettings]);
  const { todayKey, from, to } = reportWindow(spec, baby, now);
  const events = useQuery({
    ...eventsBetweenQuery(client, baby.id, from, to),
    enabled,
    placeholderData: keepPreviousData,
  });
  const result = useMemo(
    () => (enabled && events.data && babySettings ? runReport(spec, events.data, todayKey, now, settings) : null),
    [enabled, events.data, babySettings, spec, todayKey, now, settings],
  );
  return { result, settings, loading: enabled && (events.isPending || events.isPlaceholderData), error: events.error };
}

export type { SavedReport };
