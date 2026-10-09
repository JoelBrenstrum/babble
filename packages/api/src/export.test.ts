import { describe, expect, it } from 'vitest';
import { buildExport, EXPORT_FORMAT, EXPORT_VERSION, exportFileName, listAllEvents } from './export';
import { sampleBaby, sampleEvents, sampleFamily } from './fixtures';
import { fakeClient } from './test-utils';
import type { BabySettingsRow } from './types';

const settings: BabySettingsRow = {
  baby_id: sampleBaby.id,
  units: 'metric',
  night_start_minutes: 1140,
  night_end_minutes: 420,
  downtime_merge_threshold_sec: 15,
  auto_end_paused_session_min: 30,
  feed_reminder_enabled: false,
  feed_reminder_interval_min: null,
  feed_reminder_at_night: true,
  updated_at: '2026-10-01T00:00:00Z',
};

describe('buildExport', () => {
  const now = new Date('2026-10-08T09:00:00Z');
  const events = sampleEvents(now);
  const deleted = { ...events[0]!, id: 'deleted-1', deletedAt: '2026-10-08T08:00:00Z' };
  const result = buildExport({
    family: sampleFamily,
    babies: [{ baby: sampleBaby, settings, events: [...events].reverse().concat(deleted) }],
    exportedAt: now.toISOString(),
  });

  it('is versioned so it can be imported again later', () => {
    expect(result).toMatchObject({
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: '2026-10-08T09:00:00.000Z',
      family: { id: sampleFamily.id, name: sampleFamily.name },
    });
  });

  it('describes the baby and settings in plain field names', () => {
    expect(result.babies[0]!.baby).toEqual({
      id: sampleBaby.id,
      name: sampleBaby.name,
      birthDate: sampleBaby.birth_date,
      sex: sampleBaby.sex,
      timezone: sampleBaby.timezone,
      dayStartMinutes: sampleBaby.day_start_minutes,
      createdAt: sampleBaby.created_at,
    });
    expect(result.babies[0]!.settings).toMatchObject({ units: 'metric', nightStartMinutes: 1140 });
  });

  it('keeps every event in time order, including deleted ones flagged as deleted', () => {
    const exported = result.babies[0]!.events;
    expect(exported).toHaveLength(events.length + 1);
    expect(exported.map((event) => event.startedAt)).toEqual([...exported.map((event) => event.startedAt)].sort());
    expect(exported.find((event) => event.id === 'deleted-1')!.deletedAt).toBe('2026-10-08T08:00:00Z');
  });

  it('survives a round trip through JSON', () => {
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});

describe('exportFileName', () => {
  it('names the file after who it covers and the day', () => {
    expect(exportFileName('Olivia', '2026-10-08T09:00:00.000Z')).toBe('babble-olivia-2026-10-08.json');
    expect(exportFileName('The Smiths', '2026-10-08T09:00:00.000Z')).toBe('babble-the-smiths-2026-10-08.json');
    expect(exportFileName('🍼', '2026-10-08T09:00:00.000Z')).toBe('babble-export-2026-10-08.json');
  });
});

describe('listAllEvents', () => {
  it('includes deleted events', async () => {
    const { client, requests } = fakeClient(() => ({ body: [] }));
    await expect(listAllEvents(client, 'baby-1')).resolves.toEqual([]);
    const params = requests[0]!.url.searchParams;
    expect(params.get('baby_id')).toBe('eq.baby-1');
    expect(params.get('deleted_at')).toBeNull();
    expect(params.get('limit')).toBe('1000');
  });
});
