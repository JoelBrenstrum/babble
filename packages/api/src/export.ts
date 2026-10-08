import type { BabyEvent } from '@babble/domain';
import type { BabbleClient } from './client';
import { listEvents } from './events';
import { getBabySettings } from './families';
import type { BabyRow, BabySettingsRow, Family, FamilyRow } from './types';

export const EXPORT_FORMAT = 'babble-export';
export const EXPORT_VERSION = 1;

export interface BabyExport {
  baby: {
    id: string;
    name: string;
    birthDate: string;
    sex: BabyRow['sex'];
    timezone: string;
    dayStartMinutes: number;
    createdAt: string;
  };
  settings: {
    units: BabySettingsRow['units'];
    nightStartMinutes: number;
    nightEndMinutes: number;
    downtimeMergeThresholdSec: number;
    autoEndPausedSessionMin: number;
    feedReminderEnabled: boolean;
    feedReminderIntervalMin: number | null;
  } | null;
  events: BabyEvent[];
}

export interface BabbleExport {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  family: { id: string; name: string };
  babies: BabyExport[];
}

export function buildExport(input: {
  family: Pick<FamilyRow, 'id' | 'name'>;
  babies: { baby: BabyRow; settings: BabySettingsRow | null; events: readonly BabyEvent[] }[];
  exportedAt: string;
}): BabbleExport {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: input.exportedAt,
    family: { id: input.family.id, name: input.family.name },
    babies: input.babies.map(({ baby, settings, events }) => ({
      baby: {
        id: baby.id,
        name: baby.name,
        birthDate: baby.birth_date,
        sex: baby.sex,
        timezone: baby.timezone,
        dayStartMinutes: baby.day_start_minutes,
        createdAt: baby.created_at,
      },
      settings: settings && {
        units: settings.units,
        nightStartMinutes: settings.night_start_minutes,
        nightEndMinutes: settings.night_end_minutes,
        downtimeMergeThresholdSec: settings.downtime_merge_threshold_sec,
        autoEndPausedSessionMin: settings.auto_end_paused_session_min,
        feedReminderEnabled: settings.feed_reminder_enabled,
        feedReminderIntervalMin: settings.feed_reminder_interval_min,
      },
      events: [...events].sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id)),
    })),
  };
}

export function exportFileName(subject: string, exportedAt: string): string {
  const slug = subject
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `babble-${slug || 'export'}-${exportedAt.slice(0, 10)}.json`;
}

export async function listAllEvents(client: BabbleClient, babyId: string): Promise<BabyEvent[]> {
  const pageSize = 1000;
  const events: BabyEvent[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await listEvents(client, babyId, { includeDeleted: true, limit: pageSize, offset });
    events.push(...page);
    if (page.length < pageSize) return events;
  }
}

export async function exportData(
  client: BabbleClient,
  family: Family,
  babyIds: readonly string[],
  now: Date,
): Promise<BabbleExport> {
  const babies = await Promise.all(
    family.babies
      .filter((baby) => babyIds.includes(baby.id))
      .map(async (baby) => ({
        baby,
        settings: await getBabySettings(client, baby.id).catch(() => null),
        events: await listAllEvents(client, baby.id),
      })),
  );
  return buildExport({ family, babies, exportedAt: now.toISOString() });
}
