import { describe, expect, it } from 'vitest';
import {
  automaticDeviceName,
  currentSessionId,
  deviceDetail,
  deviceNameError,
  deviceNameSync,
  familyDeviceLabel,
  listFamilyDevices,
  renameDevice,
  shownDevices,
  signOutDevice,
  signOutDeviceMessage,
} from './devices';
import { fakeClient } from './test-utils';

const token = (claims: object) => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;

describe('currentSessionId', () => {
  it('reads the session id from an access token', () => {
    expect(currentSessionId(token({ sub: 'user', session_id: 'session-1' }))).toBe('session-1');
  });

  it('has no session for missing or broken tokens', () => {
    expect(currentSessionId(null)).toBeNull();
    expect(currentSessionId('not-a-token')).toBeNull();
    expect(currentSessionId(token({ sub: 'user' }))).toBeNull();
  });
});

describe('device names', () => {
  it.each([
    ['Mozilla/5.0 (X11; Linux aarch64) Chromium/126.0 Chrome/126.0 Safari/537.36', 'Linux (Chromium)'],
    ['babble/1 CFNetwork/1568.100.1 Darwin/24.0.0', 'iPhone app'],
    ['okhttp/4.12.0', 'Android app'],
    [null, 'Web browser'],
  ])('names %s automatically as %s', (agent, expected) => expect(automaticDeviceName(agent)).toBe(expected));

  it('prefers the saved name', () => {
    expect(familyDeviceLabel({ name: 'Chair', userAgent: 'okhttp/4' })).toEqual({ text: 'Chair', named: true });
    expect(familyDeviceLabel({ name: null, userAgent: 'okhttp/4' })).toEqual({ text: 'Android app', named: false });
  });

  it('limits names to 60 characters', () => {
    expect(deviceNameError('x'.repeat(60))).toBeNull();
    expect(deviceNameError('x'.repeat(61))).toBe('Use 60 characters or fewer for the name.');
  });
});

describe('devices API', () => {
  it('lists a family’s devices', async () => {
    const { client, requests } = fakeClient(() => ({
      body: [
        {
          session_id: 's1',
          user_id: 'u1',
          member_name: 'Joel',
          name: null,
          user_agent: 'okhttp/4',
          created_at: '2026-10-14T00:00:00Z',
          last_active: '2026-10-15T00:00:00Z',
          is_current: true,
        },
      ],
    }));
    expect(await listFamilyDevices(client, 'family-1')).toEqual([
      {
        sessionId: 's1',
        userId: 'u1',
        memberName: 'Joel',
        name: null,
        userAgent: 'okhttp/4',
        createdAt: '2026-10-14T00:00:00Z',
        lastActive: '2026-10-15T00:00:00Z',
        current: true,
      },
    ]);
    expect(requests[0]!.url.pathname).toBe('/rest/v1/rpc/family_devices');
    expect(requests[0]!.body).toEqual({ target_family_id: 'family-1' });
  });

  it('renames a device with a trimmed name', async () => {
    const { client, requests } = fakeClient(() => ({ status: 204, body: null }));
    await renameDevice(client, 's1', '  Chair ');
    expect(requests[0]!.url.pathname).toBe('/rest/v1/rpc/rename_device');
    expect(requests[0]!.body).toEqual({ target_session_id: 's1', new_name: 'Chair' });
  });
});

describe('deviceNameSync', () => {
  it('uploads a name saved on the device when the server has none', () => {
    expect(deviceNameSync(null, ' Chair ')).toEqual({ kind: 'upload', name: 'Chair' });
    expect(deviceNameSync(null, '')).toEqual({ kind: 'none' });
  });

  it('keeps the server name on the device', () => {
    expect(deviceNameSync('Nursery', 'Chair')).toEqual({ kind: 'store', name: 'Nursery' });
    expect(deviceNameSync('Chair', 'Chair')).toEqual({ kind: 'none' });
  });
});

describe('deviceDetail', () => {
  const now = new Date('2026-10-15T12:00:00Z');
  it('says who it belongs to and when it was last used', () => {
    expect(deviceDetail({ memberName: 'Jaimi', lastActive: '2026-10-15T11:55:00Z', current: false }, now)).toBe(
      'Jaimi · Active 5m ago',
    );
    expect(deviceDetail({ memberName: 'Joel', lastActive: '2026-10-13T11:00:00Z', current: false }, now)).toBe(
      'Joel · Active 2 days ago',
    );
  });

  it('marks the device you are using', () => {
    expect(deviceDetail({ memberName: 'Joel', lastActive: '2026-10-15T11:00:00Z', current: true }, now)).toBe(
      'Joel · This device',
    );
  });
});

describe('shownDevices', () => {
  it('shows at most eight until expanded', () => {
    const many = Array.from({ length: 11 }, (_, index) => index);
    expect(shownDevices(many, false)).toEqual({ shown: many.slice(0, 8), hidden: 3 });
    expect(shownDevices(many, true)).toEqual({ shown: many, hidden: 0 });
    expect(shownDevices([1, 2], false)).toEqual({ shown: [1, 2], hidden: 0 });
  });
});

describe('signing devices out', () => {
  it('asks before signing out another device, or this one', () => {
    expect(signOutDeviceMessage({ name: 'Chair', userAgent: null, memberName: 'Jane', current: false })).toBe(
      'Sign out Chair (Jane)? It stops working within the hour.',
    );
    expect(signOutDeviceMessage({ name: null, userAgent: null, memberName: 'Joel', current: true })).toBe(
      'Sign out of babble on this device?',
    );
  });

  it('calls the sign-out function', async () => {
    const { client, requests } = fakeClient(() => ({ status: 204, body: null }));
    await signOutDevice(client, 's1');
    expect(requests[0]!.url.pathname).toBe('/rest/v1/rpc/sign_out_device');
    expect(requests[0]!.body).toEqual({ target_session_id: 's1' });
  });
});
