import { emptyDraft } from '@babble/domain';
import { describe, expect, it } from 'vitest';
import {
  deleteEvent,
  draftToPayload,
  EVENT_SELECT,
  latestEvents,
  listEvents,
  listEventsBetween,
  resumeFeed,
  rowToEvent,
  endSession,
  saveEvent,
  saveSleepDetails,
  startSession,
  switchSide,
  type EventRow,
} from './events';
import { fakeClient } from './test-utils';

const NOW = new Date('2026-10-06T10:00:00Z');

function row(overrides: Partial<EventRow>): EventRow {
  return {
    id: 'event-1',
    baby_id: 'baby-1',
    type: 'nappy',
    started_at: '2026-10-06T09:00:00Z',
    ended_at: '2026-10-06T09:00:00Z',
    notes: null,
    created_by: 'user-1',
    source: 'manual',
    source_ref: null,
    created_at: '2026-10-06T09:00:00Z',
    updated_at: '2026-10-06T09:00:00Z',
    deleted_at: null,
    sleep: null,
    bottle: null,
    nappy: null,
    pump: null,
    growth: null,
    custom: null,
    session: null,
    segments: [],
    ...overrides,
  };
}

describe('rowToEvent', () => {
  it('maps a breastfeed with sorted segments and session state', () => {
    const event = rowToEvent(
      row({
        type: 'breast_feed',
        ended_at: null,
        session: { event_id: 'event-1', state: 'running' },
        segments: [
          { id: 's2', event_id: 'event-1', side: 'right', started_at: '2026-10-06T09:12:00Z', ended_at: null },
          {
            id: 's1',
            event_id: 'event-1',
            side: 'left',
            started_at: '2026-10-06T09:00:00Z',
            ended_at: '2026-10-06T09:10:00Z',
          },
        ],
      }),
    );
    expect(event).toMatchObject({
      type: 'breast_feed',
      sessionState: 'running',
      endedAt: null,
      segments: [
        { side: 'left', startedAt: '2026-10-06T09:00:00Z', endedAt: '2026-10-06T09:10:00Z' },
        { side: 'right', startedAt: '2026-10-06T09:12:00Z', endedAt: null },
      ],
    });
  });

  it('maps nappy details', () => {
    const event = rowToEvent(
      row({
        nappy: {
          event_id: 'event-1',
          wet: true,
          dirty: true,
          wet_size: 'medium',
          poo_size: 'large',
          poo_colours: ['mustard', 'green'],
          poo_textures: ['seedy'],
          rash: true,
        },
      }),
    );
    expect(event.type === 'nappy' && event.details).toEqual({
      wet: true,
      dirty: true,
      wetSize: 'medium',
      pooSize: 'large',
      pooColours: ['mustard', 'green'],
      pooTextures: ['seedy'],
      rash: true,
    });
  });

  it('fills defaults when a detail row is missing', () => {
    const event = rowToEvent(row({ type: 'growth' }));
    expect(event.type === 'growth' && event.details).toEqual({
      weightG: null,
      lengthMm: null,
      headCircumferenceMm: null,
    });
  });

  it('round-trips every draft type through the payload', () => {
    for (const type of ['sleep', 'breast_feed', 'bottle', 'nappy', 'pump', 'growth', 'custom'] as const) {
      const payload = draftToPayload(emptyDraft(type, NOW), { babyId: 'baby-1' });
      expect(payload).toMatchObject({ baby_id: 'baby-1', type, started_at: NOW.toISOString() });
      expect(payload).not.toHaveProperty('id');
    }
  });
});

describe('draftToPayload', () => {
  it('converts details and segments to snake case', () => {
    const draft = {
      ...emptyDraft('pump', NOW),
      segments: [{ side: 'left' as const, startedAt: '2026-10-06T09:00:00Z', endedAt: '2026-10-06T09:10:00Z' }],
      details: { leftMl: 60, rightMl: 50, totalMl: null },
    };
    expect(draftToPayload(draft, { babyId: 'baby-1', id: 'event-9' })).toEqual({
      id: 'event-9',
      baby_id: 'baby-1',
      type: 'pump',
      started_at: NOW.toISOString(),
      ended_at: NOW.toISOString(),
      notes: null,
      segments: [{ side: 'left', started_at: '2026-10-06T09:00:00Z', ended_at: '2026-10-06T09:10:00Z' }],
      details: { left_ml: 60, right_ml: 50, total_ml: null },
    });
  });

  it('includes the import source when given', () => {
    expect(
      draftToPayload(emptyDraft('nappy', NOW), { babyId: 'b', source: 'huckleberry_csv', sourceRef: 'abc-0' }),
    ).toMatchObject({ source: 'huckleberry_csv', source_ref: 'abc-0' });
  });
});

describe('event requests', () => {
  it('sends only the sleep fields that changed', async () => {
    const { client, requests } = fakeClient(() => ({ status: 204, body: null }));
    await saveSleepDetails(client, 'sleep-1', { locations: ['cot'], fallAsleep: null });
    expect(requests[0]!.url.pathname).toBe('/rest/v1/rpc/save_sleep_details');
    expect(requests[0]!.body).toEqual({
      target_event_id: 'sleep-1',
      changes: { locations: ['cot'], fall_asleep: null },
    });
    await saveSleepDetails(client, 'sleep-1', { notes: 'Went down easily' });
    expect(requests[1]!.body).toEqual({ target_event_id: 'sleep-1', changes: { notes: 'Went down easily' } });
  });

  it('lists events newest first, filtered by type, excluding deleted', async () => {
    const { client, requests } = fakeClient(() => ({ body: [] }));
    await listEvents(client, 'baby-1', { types: ['bottle', 'breast_feed'], limit: 20 });
    const params = requests[0]!.url.searchParams;
    expect(requests[0]!.url.pathname).toBe('/rest/v1/events');
    expect(params.get('select')).toBe(EVENT_SELECT.replaceAll(' ', ''));
    expect(params.get('baby_id')).toBe('eq.baby-1');
    expect(params.get('deleted_at')).toBe('is.null');
    expect(params.get('type')).toBe('in.(bottle,breast_feed)');
    expect(params.get('order')).toBe('started_at.desc');
    expect(params.get('limit')).toBe('20');
  });

  it('reads a time range, reaching back a day for sessions that started earlier', async () => {
    const { client, requests } = fakeClient(() => ({ body: [] }));
    await listEventsBetween(client, 'baby-1', '2026-10-06T00:00:00.000Z', '2026-10-07T00:00:00.000Z');
    const params = requests[0]!.url.searchParams;
    expect(params.getAll('started_at')).toEqual(['lt.2026-10-07T00:00:00.000Z', 'gte.2026-10-05T00:00:00.000Z']);
    expect(params.get('offset')).toBe('0');
    expect(params.get('limit')).toBe('1000');
  });

  it('pages through ranges longer than one request', async () => {
    let call = 0;
    const { client, requests } = fakeClient(() => ({
      body: call++ === 0 ? Array.from({ length: 1000 }, () => row({})) : [row({})],
    }));
    const events = await listEventsBetween(client, 'baby-1', '2026-01-01T00:00:00.000Z', '2026-10-07T00:00:00.000Z');
    expect(events).toHaveLength(1001);
    expect(requests.map((request) => request.url.searchParams.get('offset'))).toEqual(['0', '1000']);
  });

  it('reads the latest events through the RPC with embedded details', async () => {
    const { client, requests } = fakeClient(() => ({ body: [row({})] }));
    const events = await latestEvents(client, 'baby-1');
    expect(requests[0]!.url.pathname).toBe('/rest/v1/rpc/latest_events');
    expect(requests[0]!.body).toEqual({ target_baby_id: 'baby-1' });
    expect(events).toHaveLength(1);
  });

  it('saves through save_event', async () => {
    const { client, requests } = fakeClient(() => ({ body: 'event-1' }));
    expect(await saveEvent(client, 'baby-1', emptyDraft('nappy', NOW))).toBe('event-1');
    expect(requests[0]!.url.pathname).toBe('/rest/v1/rpc/save_event');
    expect(requests[0]!.body).toMatchObject({ event: { baby_id: 'baby-1', type: 'nappy' } });
  });

  it('starts and switches sessions', async () => {
    const { client, requests } = fakeClient(() => ({ body: 'event-1' }));
    await startSession(client, 'baby-1', 'breast_feed', 'right');
    await switchSide(client, 'event-1', 'left');
    expect(requests.map((r) => [r.url.pathname, r.body])).toEqual([
      ['/rest/v1/rpc/start_session', { target_baby_id: 'baby-1', session_type: 'breast_feed', start_side: 'right' }],
      ['/rest/v1/rpc/switch_side', { target_event_id: 'event-1', new_side: 'left' }],
    ]);
  });

  it('ends a session at a chosen time and resumes a feed', async () => {
    const { client, requests } = fakeClient(() => ({ status: 204, body: null }));
    await endSession(client, 'nap-1', '2026-10-06T09:00:00Z');
    await resumeFeed(client, 'feed-1');
    expect(requests.map((r) => [r.url.pathname, r.body])).toEqual([
      ['/rest/v1/rpc/end_session', { target_event_id: 'nap-1', end_at: '2026-10-06T09:00:00Z' }],
      ['/rest/v1/rpc/resume_feed', { target_event_id: 'feed-1' }],
    ]);
  });

  it('soft deletes by setting deleted_at', async () => {
    const { client, requests } = fakeClient(() => ({ status: 204, body: null }));
    await deleteEvent(client, 'event-1');
    expect(requests[0]!.method).toBe('PATCH');
    expect(requests[0]!.url.searchParams.get('id')).toBe('eq.event-1');
    expect(requests[0]!.body).toHaveProperty('deleted_at');
  });
});
