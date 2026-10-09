import {
  fitStretches,
  type BabyEvent,
  type EventDraft,
  type EventType,
  type Side,
  type SleepDetails,
  type TimedSegment,
} from '@babble/domain';
import type { BabbleClient } from './client';
import type { Database, Json } from './database.types';
import { toBabbleError, unwrap } from './errors';

type Tables = Database['public']['Tables'];

export const EVENT_SELECT =
  '*, sleep:sleep_details(*), bottle:bottle_details(*), nappy:nappy_details(*), pump:pump_details(*), growth:growth_details(*), custom:custom_details(*), session:session_details(*), segments:timed_segments(*)';

export type EventRow = Tables['events']['Row'] & {
  sleep: Tables['sleep_details']['Row'] | null;
  bottle: Tables['bottle_details']['Row'] | null;
  nappy: Tables['nappy_details']['Row'] | null;
  pump: Tables['pump_details']['Row'] | null;
  growth: Tables['growth_details']['Row'] | null;
  custom: Tables['custom_details']['Row'] | null;
  session: Tables['session_details']['Row'] | null;
  segments: Tables['timed_segments']['Row'][];
};

export function rowToEvent(row: EventRow): BabyEvent {
  const meta = {
    id: row.id,
    babyId: row.baby_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    source: row.source,
    sessionState: row.session?.state ?? null,
    endedBy: row.ended_by,
    endRecordedAt: row.end_recorded_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    notes: row.notes,
  };
  const ordered = [...(row.segments ?? [])].sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at));
  const segments: TimedSegment[] = ordered.flatMap((segment) =>
    segment.side ? [{ side: segment.side, startedAt: segment.started_at, endedAt: segment.ended_at }] : [],
  );
  const stretches = ordered.map((segment) => ({ startedAt: segment.started_at, endedAt: segment.ended_at }));

  switch (row.type) {
    case 'sleep':
      return {
        ...meta,
        type: 'sleep',
        details: {
          locations: row.sleep?.locations ?? [],
          fallAsleep: row.sleep?.fall_asleep ?? null,
          startMoods: row.sleep?.start_moods ?? [],
          endMoods: row.sleep?.end_moods ?? [],
          wokenByCarer: row.sleep?.woken_by_carer ?? false,
        },
        segments: stretches,
      };
    case 'breast_feed':
      return { ...meta, type: 'breast_feed', segments };
    case 'bottle':
      return {
        ...meta,
        type: 'bottle',
        details: {
          content: row.bottle?.content ?? 'breast_milk',
          amountMl: row.bottle?.amount_ml ?? null,
          amountLeftMl: row.bottle?.amount_left_ml ?? null,
        },
      };
    case 'nappy':
      return {
        ...meta,
        type: 'nappy',
        details: {
          wet: row.nappy?.wet ?? false,
          dirty: row.nappy?.dirty ?? false,
          wetSize: row.nappy?.wet_size ?? null,
          pooSize: row.nappy?.poo_size ?? null,
          pooColours: row.nappy?.poo_colours ?? [],
          pooTextures: row.nappy?.poo_textures ?? [],
          rash: row.nappy?.rash ?? false,
        },
      };
    case 'pump':
      return {
        ...meta,
        type: 'pump',
        segments,
        details: {
          leftMl: row.pump?.left_ml ?? null,
          rightMl: row.pump?.right_ml ?? null,
          totalMl: row.pump?.total_ml ?? null,
        },
      };
    case 'growth':
      return {
        ...meta,
        type: 'growth',
        details: {
          weightG: row.growth?.weight_g ?? null,
          lengthMm: row.growth?.length_mm ?? null,
          headCircumferenceMm: row.growth?.head_circumference_mm ?? null,
        },
      };
    case 'custom':
      return {
        ...meta,
        type: 'custom',
        details: { title: row.custom?.title ?? '', description: row.custom?.description ?? '' },
      };
  }
}

export function sleepDetailsPayload(details: SleepDetails) {
  return {
    locations: details.locations,
    fall_asleep: details.fallAsleep,
    start_moods: details.startMoods,
    end_moods: details.endMoods,
    woken_by_carer: details.wokenByCarer,
  };
}

export type SleepChanges = Partial<SleepDetails> & { notes?: string | null };

const SLEEP_CHANGE_KEYS = {
  locations: 'locations',
  fallAsleep: 'fall_asleep',
  startMoods: 'start_moods',
  endMoods: 'end_moods',
  wokenByCarer: 'woken_by_carer',
  notes: 'notes',
} as const;

export function sleepChangesPayload(changes: SleepChanges): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(SLEEP_CHANGE_KEYS)
      .filter(([key]) => key in changes)
      .map(([key, column]) => [column, changes[key as keyof SleepChanges] ?? null]),
  );
}

export async function saveSleepDetails(client: BabbleClient, eventId: string, changes: SleepChanges): Promise<void> {
  const { error } = await client.rpc('save_sleep_details', {
    target_event_id: eventId,
    changes: sleepChangesPayload(changes) as Json,
  });
  if (error) throw toBabbleError(error);
}

export function draftToPayload(
  draft: EventDraft,
  options: { babyId: string; id?: string; source?: 'manual' | 'huckleberry_csv'; sourceRef?: string },
) {
  const base = {
    ...(options.id ? { id: options.id } : {}),
    baby_id: options.babyId,
    type: draft.type,
    started_at: draft.startedAt,
    ended_at: draft.endedAt,
    notes: draft.notes,
    ...(options.source ? { source: options.source } : {}),
    ...(options.sourceRef ? { source_ref: options.sourceRef } : {}),
  };
  const segments = (list: TimedSegment[]) =>
    list.map((segment) => ({ side: segment.side, started_at: segment.startedAt, ended_at: segment.endedAt }));

  switch (draft.type) {
    case 'sleep': {
      const stretches = fitStretches(draft.segments, draft.startedAt, draft.endedAt);
      return {
        ...base,
        details: sleepDetailsPayload(draft.details),
        ...(stretches.length > 0
          ? {
              segments: stretches.map((stretch) => ({
                side: null,
                started_at: stretch.startedAt,
                ended_at: stretch.endedAt,
              })),
            }
          : {}),
      };
    }
    case 'breast_feed':
      return { ...base, segments: segments(draft.segments) };
    case 'bottle':
      return {
        ...base,
        details: {
          content: draft.details.content,
          amount_ml: draft.details.amountMl,
          amount_left_ml: draft.details.amountLeftMl,
        },
      };
    case 'nappy':
      return {
        ...base,
        details: {
          wet: draft.details.wet,
          dirty: draft.details.dirty,
          wet_size: draft.details.wetSize,
          poo_size: draft.details.pooSize,
          poo_colours: draft.details.pooColours,
          poo_textures: draft.details.pooTextures,
          rash: draft.details.rash,
        },
      };
    case 'pump':
      return {
        ...base,
        segments: segments(draft.segments),
        details: { left_ml: draft.details.leftMl, right_ml: draft.details.rightMl, total_ml: draft.details.totalMl },
      };
    case 'growth':
      return {
        ...base,
        details: {
          weight_g: draft.details.weightG,
          length_mm: draft.details.lengthMm,
          head_circumference_mm: draft.details.headCircumferenceMm,
        },
      };
    case 'custom':
      return { ...base, details: { title: draft.details.title, description: draft.details.description } };
  }
}

export async function listEvents(
  client: BabbleClient,
  babyId: string,
  options: {
    types?: EventType[];
    before?: string;
    since?: string;
    limit?: number;
    offset?: number;
    includeDeleted?: boolean;
  } = {},
): Promise<BabyEvent[]> {
  let query = client.from('events').select(EVENT_SELECT).eq('baby_id', babyId);
  if (!options.includeDeleted) query = query.is('deleted_at', null);
  if (options.types?.length) query = query.in('type', options.types);
  if (options.before) query = query.lt('started_at', options.before);
  if (options.since) query = query.gte('started_at', options.since);
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  const rows = unwrap(await query.order('started_at', { ascending: false }).range(offset, offset + limit - 1));
  return (rows as unknown as EventRow[]).map(rowToEvent);
}

export const LONGEST_SESSION_MS = 24 * 3_600_000;

export function eventRangeBounds(from: string, to: string): { since: string; before: string } {
  return { since: new Date(Date.parse(from) - LONGEST_SESSION_MS).toISOString(), before: to };
}

export async function listEventsBetween(
  client: BabbleClient,
  babyId: string,
  from: string,
  to: string,
): Promise<BabyEvent[]> {
  const pageSize = 1000;
  const events: BabyEvent[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await listEvents(client, babyId, { ...eventRangeBounds(from, to), limit: pageSize, offset });
    events.push(...page);
    if (page.length < pageSize) return events;
  }
}

export async function getEvent(client: BabbleClient, id: string): Promise<BabyEvent> {
  const row = unwrap(await client.from('events').select(EVENT_SELECT).eq('id', id).single());
  return rowToEvent(row as unknown as EventRow);
}

export async function latestEvents(client: BabbleClient, babyId: string): Promise<BabyEvent[]> {
  const rows = unwrap(await client.rpc('latest_events', { target_baby_id: babyId }).select(EVENT_SELECT));
  return (rows as unknown as EventRow[]).map(rowToEvent);
}

export async function runningEvents(client: BabbleClient, babyId: string): Promise<BabyEvent[]> {
  const rows = unwrap(
    await client
      .from('events')
      .select(EVENT_SELECT)
      .eq('baby_id', babyId)
      .is('ended_at', null)
      .is('deleted_at', null)
      .order('started_at'),
  );
  return (rows as unknown as EventRow[]).map(rowToEvent);
}

export async function saveEvent(client: BabbleClient, babyId: string, draft: EventDraft, id?: string): Promise<string> {
  return unwrap(await client.rpc('save_event', { event: draftToPayload(draft, { babyId, id }) }));
}

export async function startSession(
  client: BabbleClient,
  babyId: string,
  type: 'breast_feed' | 'pump' | 'sleep',
  side: Side = 'left',
  startAt?: string,
): Promise<string> {
  return unwrap(
    await client.rpc('start_session', {
      target_baby_id: babyId,
      session_type: type,
      start_side: side,
      ...(startAt ? { start_at: startAt } : {}),
    }),
  );
}

export async function switchSide(client: BabbleClient, eventId: string, side: Side): Promise<void> {
  const { error } = await client.rpc('switch_side', { target_event_id: eventId, new_side: side });
  if (error) throw toBabbleError(error);
}

export async function pauseSession(client: BabbleClient, eventId: string): Promise<void> {
  const { error } = await client.rpc('pause_session', { target_event_id: eventId });
  if (error) throw toBabbleError(error);
}

export async function resumeSession(client: BabbleClient, eventId: string, side?: Side): Promise<void> {
  const { error } = await client.rpc('resume_session', {
    target_event_id: eventId,
    ...(side ? { resume_side: side } : {}),
  });
  if (error) throw toBabbleError(error);
}

export async function endSession(client: BabbleClient, eventId: string, endAt?: string): Promise<void> {
  const { error } = await client.rpc('end_session', { target_event_id: eventId, ...(endAt ? { end_at: endAt } : {}) });
  if (error) throw toBabbleError(error);
}

export async function setSwitchTime(client: BabbleClient, eventId: string, switchAt: string): Promise<void> {
  const { error } = await client.rpc('set_switch_time', { target_event_id: eventId, switch_at: switchAt });
  if (error) throw toBabbleError(error);
}

export async function setSessionStart(client: BabbleClient, eventId: string, startAt: string): Promise<void> {
  const { error } = await client.rpc('set_session_start', { target_event_id: eventId, start_at: startAt });
  if (error) throw toBabbleError(error);
}

export async function resumeFeed(client: BabbleClient, eventId: string, side?: Side): Promise<void> {
  const { error } = await client.rpc('resume_feed', {
    target_event_id: eventId,
    ...(side ? { resume_side: side } : {}),
  });
  if (error) throw toBabbleError(error);
}

export async function deleteEvent(client: BabbleClient, eventId: string): Promise<void> {
  const { error } = await client.from('events').update({ deleted_at: new Date().toISOString() }).eq('id', eventId);
  if (error) throw toBabbleError(error);
}

export async function restoreEvent(client: BabbleClient, eventId: string): Promise<void> {
  const { error } = await client.from('events').update({ deleted_at: null }).eq('id', eventId);
  if (error) throw toBabbleError(error);
}

export function subscribeToBabyEvents(client: BabbleClient, babyId: string, onChange: () => void): () => void {
  const channel = client
    .channel(`events:${babyId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `baby_id=eq.${babyId}` }, onChange)
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
