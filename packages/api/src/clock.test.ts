import { afterEach, describe, expect, it, vi } from 'vitest';
import { clock, computeClockOffset, syncClock } from './clock';
import { fakeClient } from './test-utils';

afterEach(() => {
  clock.setOffset(0);
  vi.useRealTimers();
});

describe('computeClockOffset', () => {
  it('compares the server time with the middle of the round trip', () => {
    const sentAt = Date.parse('2026-10-06T10:00:00.000Z');
    const receivedAt = sentAt + 200;
    expect(computeClockOffset(sentAt, '2026-10-06T10:02:00.100Z', receivedAt)).toBe(120_000);
    expect(computeClockOffset(sentAt, '2026-10-06T09:59:00.100Z', receivedAt)).toBe(-60_000);
  });
});

describe('syncClock', () => {
  it('shifts clock.now() by the measured offset', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-06T10:00:00Z'), toFake: ['Date'] });
    const { client, requests } = fakeClient(() => ({ body: '2026-10-06T10:02:00Z' }));
    const offset = await syncClock(client);
    expect(requests[0]!.url.pathname).toBe('/rest/v1/rpc/server_time');
    expect(offset).toBe(120_000);
    expect(clock.now().toISOString()).toBe('2026-10-06T10:02:00.000Z');
  });

  it('keeps the previous offset when the request fails', async () => {
    clock.setOffset(5000);
    const { client } = fakeClient(() => ({ status: 500, body: { message: 'down' } }));
    expect(await syncClock(client)).toBe(5000);
  });
});
