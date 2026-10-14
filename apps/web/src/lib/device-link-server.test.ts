import type { BabbleClient } from '@babble/api';
import { describe, expect, it, vi } from 'vitest';
import { hashSecret, pollDeviceLink, requesterAddress, startDeviceLink } from './device-link-server';
import { safeReturnPath } from './device-link';

const ID = '3f1a2b4c-1111-4222-8333-444455556666';
const SECRET = 'a'.repeat(64);

function fakeClient(rpc: (name: string, args: Record<string, unknown>) => unknown, hashedToken = 'token-hash') {
  const generateLink = vi.fn(async () => ({ data: { properties: { hashed_token: hashedToken } }, error: null }));
  const client = {
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) => rpc(name, args)),
    auth: { admin: { generateLink } },
  };
  return { client: client as unknown as BabbleClient, rpc: client.rpc, generateLink };
}

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/device-link/poll', { method: 'POST', body: JSON.stringify(body), headers });

describe('startDeviceLink', () => {
  it('is unavailable without a service role key', async () => {
    expect((await startDeviceLink(null, post({}))).status).toBe(503);
  });

  it('stores a hash of the secret and names the device', async () => {
    const { client, rpc } = fakeClient(() => ({ data: [{ id: ID, expires_at: 'soon' }], error: null }));
    const response = await startDeviceLink(
      client,
      post(
        {},
        { 'user-agent': 'Mozilla/5.0 (X11; Linux aarch64) Chromium/126.0 Chrome/126.0', 'fly-client-ip': '1.2.3.4' },
      ),
    );
    const body = (await response.json()) as { id: string; code: string; secret: string };
    expect(body.id).toBe(ID);
    expect(body.secret).toMatch(/^[0-9a-f]{64}$/);
    expect(rpc).toHaveBeenCalledWith('start_device_link', {
      new_code: body.code,
      new_secret_hash: await hashSecret(body.secret),
      new_device: 'Chromium on Linux',
      new_requested_from: '1.2.3.4',
    });
  });

  it('tries another code when one is taken', async () => {
    let calls = 0;
    const { client } = fakeClient(() =>
      ++calls === 1
        ? { data: null, error: { code: '23505' } }
        : { data: [{ id: ID, expires_at: 'soon' }], error: null },
    );
    expect((await startDeviceLink(client, post({}))).status).toBe(200);
    expect(calls).toBe(2);
  });

  it('refuses when too many codes were made', async () => {
    const { client } = fakeClient(() => ({ data: null, error: { code: 'PL006', message: 'Too many' } }));
    expect((await startDeviceLink(client, post({}))).status).toBe(429);
  });
});

describe('pollDeviceLink', () => {
  it('rejects malformed requests', async () => {
    const { client, rpc } = fakeClient(() => ({ data: [], error: null }));
    expect((await pollDeviceLink(client, post({ id: 'nope', secret: SECRET }))).status).toBe(400);
    expect((await pollDeviceLink(client, post({ id: ID, secret: 'short' }))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('keeps waiting until someone approves', async () => {
    const { client, generateLink } = fakeClient(() => ({ data: [{ status: 'pending', email: null }], error: null }));
    expect(await (await pollDeviceLink(client, post({ id: ID, secret: SECRET }))).json()).toEqual({
      status: 'pending',
    });
    expect(generateLink).not.toHaveBeenCalled();
  });

  it('hands over a one-time sign-in for whoever approved', async () => {
    const { client, rpc, generateLink } = fakeClient(() => ({
      data: [{ status: 'approved', email: 'joel@example.com' }],
      error: null,
    }));
    const body = await (await pollDeviceLink(client, post({ id: ID, secret: SECRET }))).json();
    expect(body).toEqual({ status: 'approved', tokenHash: 'token-hash' });
    expect(rpc).toHaveBeenCalledWith('claim_device_link', { link_id: ID, link_secret_hash: await hashSecret(SECRET) });
    expect(generateLink).toHaveBeenCalledWith({ type: 'magiclink', email: 'joel@example.com' });
  });

  it('treats unknown links as expired', async () => {
    const { client } = fakeClient(() => ({ data: [], error: null }));
    expect(await (await pollDeviceLink(client, post({ id: ID, secret: SECRET }))).json()).toEqual({
      status: 'expired',
    });
  });
});

describe('requesterAddress', () => {
  it('prefers the Fly client address', () => {
    expect(requesterAddress(new Headers({ 'fly-client-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' }))).toBe('1.1.1.1');
    expect(requesterAddress(new Headers({ 'x-forwarded-for': '2.2.2.2, 3.3.3.3' }))).toBe('2.2.2.2');
    expect(requesterAddress(new Headers())).toBeNull();
  });
});

describe('safeReturnPath', () => {
  it.each([
    ['/chair?screenOff=30', '/chair?screenOff=30'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['https://evil.example', '/'],
    [undefined, '/'],
  ])('%s → %s', (input, expected) => expect(safeReturnPath(input)).toBe(expected));
});
