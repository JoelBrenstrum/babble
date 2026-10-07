import type { BabyEvent, EventDraft, EventType, Side, TimedSegment } from '@babble/domain';
import type { BabbleClient } from './client';
import type { Database } from './database.types';
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
    startedAt: row.started_at,
    endedAt: row.ended_at,
    notes: row.notes,
  };
  const segments: TimedSegment[] = [...(row.segments ?? [])]
    .sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at))
    .map((segment) => ({ side: segment.side, startedAt: segment.started_at, endedAt: segment.ended_at }));

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
    case 'sleep':
      return {
        ...base,
        details: {
          locations: draft.details.locations,
          fall_asleep: draft.details.fallAsleep,
          start_moods: draft.details.startMoods,
          end_moods: draft.details.endMoods,
          woken_by_carer: draft.details.wokenByCarer,
        },
      };
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
  options: { types?: EventType[]; before?: string; since?: string; limit?: number } = {},
): Promise<BabyEvent[]> {
  let query = client.from('events').select(EVENT_SELECT).eq('baby_id', babyId).is('deleted_at', null);
  if (options.types?.length) query = query.in('type', options.types);
  if (options.before) query = query.lt('started_at', options.before);
  if (options.since) query = query.gte('started_at', options.since);
  const rows = unwrap(await query.order('started_at', { ascending: false }).limit(options.limit ?? 50));
  return (rows as unknown as EventRow[]).map(rowToEvent);
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
): Promise<string> {
  return unwrap(await client.rpc('start_session', { target_baby_id: babyId, session_type: type, start_side: side }));
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

export async function endSession(client: BabbleClient, eventId: string): Promise<void> {
  const { error } = await client.rpc('end_session', { target_event_id: eventId });
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
