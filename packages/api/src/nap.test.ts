import { describe, expect, it } from 'vitest';
import { isDataNapAction, runNapAction } from './nap';
import { fakeClient } from './test-utils';

describe('runNapAction', () => {
  it('ends a nap or feed at the given time', async () => {
    const { client, requests } = fakeClient(() => ({ status: 204, body: null }));
    await runNapAction(client, 'baby-1', { kind: 'end-nap', napId: 'nap-1', at: '2026-10-06T09:00:00Z' });
    await runNapAction(client, 'baby-1', { kind: 'end-feed', feedId: 'feed-1' });
    expect(requests.map((request) => [request.url.pathname, request.body])).toEqual([
      ['/rest/v1/rpc/end_session', { target_event_id: 'nap-1', end_at: '2026-10-06T09:00:00Z' }],
      ['/rest/v1/rpc/end_session', { target_event_id: 'feed-1' }],
    ]);
  });

  it('starts a nap', async () => {
    const { client, requests } = fakeClient(() => ({ body: 'nap-2' }));
    await runNapAction(client, 'baby-1', { kind: 'start-nap', at: '2026-10-06T09:00:00Z' });
    expect(requests[0]!.body).toEqual({
      target_baby_id: 'baby-1',
      session_type: 'sleep',
      start_side: 'left',
      start_at: '2026-10-06T09:00:00Z',
    });
  });

  it('tells data actions from navigation', () => {
    expect(isDataNapAction(null)).toBe(false);
    expect(isDataNapAction({ kind: 'log-nappy' })).toBe(false);
    expect(isDataNapAction({ kind: 'start-nap' })).toBe(true);
  });
});
