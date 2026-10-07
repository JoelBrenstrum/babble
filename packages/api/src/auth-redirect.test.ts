import { describe, expect, it } from 'vitest';
import { completeAuthRedirect, parseAuthRedirect } from './auth';
import { fakeClient } from './test-utils';

describe('parseAuthRedirect', () => {
  it('reads a PKCE code from the query', () => {
    expect(parseAuthRedirect('https://babble.test/auth/callback?code=abc')).toMatchObject({
      code: 'abc',
      accessToken: null,
    });
  });

  it('reads implicit-flow tokens and the link type from the hash', () => {
    expect(
      parseAuthRedirect(
        'https://babble.test/auth/callback#access_token=a.b.c&refresh_token=r1&type=recovery&expires_in=3600',
      ),
    ).toEqual({ code: null, accessToken: 'a.b.c', refreshToken: 'r1', type: 'recovery', error: null });
  });

  it('reads errors from either place', () => {
    expect(parseAuthRedirect('https://babble.test/auth/callback?error_description=Link+expired').error).toBe(
      'Link expired',
    );
    expect(parseAuthRedirect('https://babble.test/auth/callback#error=access_denied').error).toBe('access_denied');
  });
});

describe('completeAuthRedirect', () => {
  it('rejects a link with nothing usable', async () => {
    const { client } = fakeClient(() => ({ body: {} }));
    await expect(completeAuthRedirect(client, 'https://babble.test/auth/callback')).rejects.toThrow('missing its code');
  });

  it('surfaces errors in the link', async () => {
    const { client } = fakeClient(() => ({ body: {} }));
    await expect(
      completeAuthRedirect(client, 'https://babble.test/auth/callback?error_description=Email+link+is+invalid'),
    ).rejects.toThrow('Email link is invalid');
  });
});
