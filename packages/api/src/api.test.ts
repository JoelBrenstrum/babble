import { describe, expect, it } from 'vitest';
import { DEV_ACCOUNTS, DEV_PASSWORD, requestMagicLink, signInWithPassword, signUpWithPassword } from './auth';
import { BabbleError } from './errors';
import {
  acceptInvite,
  addBaby,
  checkInvite,
  createFamily,
  createInvite,
  getInstanceSettings,
  listFamilies,
} from './families';
import { fakeClient } from './test-utils';

describe('requestMagicLink', () => {
  it('sends a normalised invite code as sign-up metadata', async () => {
    const { client, requests } = fakeClient(() => ({ body: {} }));
    await requestMagicLink(client, {
      email: ' jane@example.com ',
      redirectTo: 'https://babble.test/auth/callback',
      inviteCode: 'k7q4md',
    });
    const [request] = requests;
    expect(request!.url.pathname).toBe('/auth/v1/otp');
    expect(request!.url.searchParams.get('redirect_to')).toBe('https://babble.test/auth/callback');
    expect(request!.body).toMatchObject({
      email: 'jane@example.com',
      create_user: true,
      data: { invite_code: 'K7Q-4MD' },
    });
  });

  it('omits metadata without an invite code', async () => {
    const { client, requests } = fakeClient(() => ({ body: {} }));
    await requestMagicLink(client, { email: 'john@example.com', redirectTo: 'https://babble.test', inviteCode: ' ' });
    expect((requests[0]!.body as Record<string, unknown>).data).toEqual({});
  });

  it('maps rejected sign-ups to an invite_required error', async () => {
    const { client } = fakeClient(() => ({
      status: 500,
      body: { code: 500, error_code: 'unexpected_failure', msg: 'Database error saving new user' },
    }));
    await expect(
      requestMagicLink(client, { email: 'x@example.com', redirectTo: 'https://babble.test' }),
    ).rejects.toMatchObject({
      code: 'invite_required',
    });
  });
});

describe('signInWithPassword', () => {
  it('signs in a dev account with the password grant', async () => {
    const { client, requests } = fakeClient(() => ({
      body: { access_token: 'a', refresh_token: 'r', expires_in: 3600, token_type: 'bearer', user: { id: 'u' } },
    }));
    await signInWithPassword(client, { email: DEV_ACCOUNTS[0].email, password: DEV_PASSWORD });
    expect(requests[0]!.url.pathname).toBe('/auth/v1/token');
    expect(requests[0]!.url.searchParams.get('grant_type')).toBe('password');
    expect(requests[0]!.body).toEqual({ email: 'john@babble.dev', password: 'password', gotrue_meta_security: {} });
  });

  it('maps a bad password to an error', async () => {
    const { client } = fakeClient(() => ({
      status: 400,
      body: { error: 'invalid_grant', error_description: 'Invalid login credentials' },
    }));
    await expect(signInWithPassword(client, { email: 'x@example.com', password: 'nope' })).rejects.toThrow();
  });
});

describe('signUpWithPassword', () => {
  it('signs up with the invite code as metadata and reports when no session came back', async () => {
    const { client, requests } = fakeClient(() => ({ body: { id: 'u', email: 'jane@example.com' } }));
    const result = await signUpWithPassword(client, {
      email: ' jane@example.com ',
      password: 'correct horse',
      redirectTo: 'https://babble.test/auth/callback',
      inviteCode: 'k7q4md',
    });
    expect(requests[0]!.url.pathname).toBe('/auth/v1/signup');
    expect(requests[0]!.body).toMatchObject({
      email: 'jane@example.com',
      password: 'correct horse',
      data: { invite_code: 'K7Q-4MD' },
    });
    expect(result).toEqual({ needsConfirmation: true });
  });

  it('reports an immediate session when confirmation is off', async () => {
    const { client } = fakeClient(() => ({
      body: { access_token: 'a', refresh_token: 'r', expires_in: 3600, token_type: 'bearer', user: { id: 'u' } },
    }));
    expect(
      await signUpWithPassword(client, {
        email: 'x@example.com',
        password: 'longenough',
        redirectTo: 'https://b.test',
      }),
    ).toEqual({
      needsConfirmation: false,
    });
  });
});

describe('families API', () => {
  it('reads instance settings', async () => {
    const { client, requests } = fakeClient(() => ({ body: [{ signup_mode: 'invite_only', has_users: true }] }));
    expect(await getInstanceSettings(client)).toEqual({ signupMode: 'invite_only', hasUsers: true });
    expect(requests[0]!.url.pathname).toBe('/rest/v1/rpc/get_instance_settings');
  });

  it('checks an invite and returns null for unknown codes', async () => {
    const { client, requests } = fakeClient(() => ({ body: [] }));
    expect(await checkInvite(client, 'k7q4md')).toBeNull();
    expect(requests[0]!.body).toEqual({ invite_code: 'K7Q-4MD' });
  });

  it('creates a family with trimmed names', async () => {
    const { client, requests } = fakeClient(() => ({ body: 'family-1' }));
    expect(await createFamily(client, { familyName: ' Smith ', displayName: ' John ' })).toBe('family-1');
    expect(requests[0]!.url.pathname).toBe('/rest/v1/rpc/create_family');
    expect(requests[0]!.body).toEqual({ family_name: 'Smith', display_name: 'John' });
  });

  it('lists families with members and babies embedded', async () => {
    const { client, requests } = fakeClient(() => ({ body: [] }));
    await listFamilies(client);
    expect(requests[0]!.url.pathname).toBe('/rest/v1/families');
    expect(requests[0]!.url.searchParams.get('select')).toBe('*,members:family_members(*),babies(*)');
  });

  it('adds a baby', async () => {
    const baby = { id: 'baby-1', name: 'Olivia' };
    const { client, requests } = fakeClient(() => ({ body: baby }));
    expect(
      await addBaby(client, {
        familyId: 'family-1',
        name: ' Olivia ',
        birthDate: '2026-09-26',
        timezone: 'Pacific/Auckland',
        dayStartMinutes: 420,
        sex: 'female',
      }),
    ).toEqual(baby);
    expect(requests[0]!.method).toBe('POST');
    expect(requests[0]!.body).toEqual({
      family_id: 'family-1',
      name: 'Olivia',
      birth_date: '2026-09-26',
      timezone: 'Pacific/Auckland',
      day_start_minutes: 420,
      sex: 'female',
    });
  });

  it('creates an invite', async () => {
    const { client, requests } = fakeClient(() => ({
      body: [{ code: 'K7Q-4MD', expires_at: '2026-10-14T00:00:00Z' }],
    }));
    expect(await createInvite(client, 'family-1')).toEqual({ code: 'K7Q-4MD', expiresAt: '2026-10-14T00:00:00Z' });
    expect(requests[0]!.body).toEqual({ target_family_id: 'family-1', invite_role: 'caregiver' });
  });

  it('maps an invalid invite to invite_invalid', async () => {
    const { client } = fakeClient(() => ({
      status: 400,
      body: { code: 'P0002', message: 'This invite code is invalid, used or expired' },
    }));
    const result = acceptInvite(client, { code: 'K7Q-4MD', displayName: 'Jane' });
    await expect(result).rejects.toBeInstanceOf(BabbleError);
    await expect(result).rejects.toMatchObject({ code: 'invite_invalid' });
  });
});
