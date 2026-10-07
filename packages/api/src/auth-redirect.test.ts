import { describe, expect, it } from 'vitest';
import { accountChanged, authLinkErrorMessage, completeAuthRedirect, parseAuthRedirect, tokenEmail } from './auth';
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

  it('turns errors from either place into fixed wording', () => {
    expect(
      parseAuthRedirect('https://babble.test/auth/callback?error_code=otp_expired&error_description=whatever').error,
    ).toBe('This sign-in link has expired. Ask for a new one.');
    expect(parseAuthRedirect('https://babble.test/auth/callback#error=access_denied').error).toBe(
      "This sign-in link isn't valid any more. Ask for a new one.",
    );
  });

  it('never shows text taken from the link', () => {
    const redirect = parseAuthRedirect('https://babble.test/auth/callback?error_description=Call+0800+123+456');
    expect(redirect.error).toBe("This sign-in link didn't work. Try signing in again.");
    expect(authLinkErrorMessage('something_new')).toBe(redirect.error);
  });
});

const jwt = (claims: object) =>
  `e30.${btoa(JSON.stringify(claims)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.sig`;

describe('tokenEmail', () => {
  it('reads the email from an access token and tolerates junk', () => {
    expect(tokenEmail(jwt({ email: 'jane@example.com' }))).toBe('jane@example.com');
    expect(tokenEmail('not-a-token')).toBeNull();
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
    ).rejects.toThrow("didn't work");
  });

  it('asks before using a session from the link', async () => {
    const { client, requests } = fakeClient(() => ({ body: {} }));
    const token = jwt({ email: 'jane@example.com' });
    await expect(
      completeAuthRedirect(
        client,
        `https://babble.test/auth/callback#access_token=${token}&refresh_token=r1&type=recovery`,
      ),
    ).resolves.toEqual({
      kind: 'confirm',
      type: 'recovery',
      session: { accessToken: token, refreshToken: 'r1', email: 'jane@example.com' },
    });
    expect(requests).toHaveLength(0);
  });
});

describe('accountChanged', () => {
  it('is true when someone signs out or a different person signs in', () => {
    expect(accountChanged('a', null)).toBe(true);
    expect(accountChanged('a', 'b')).toBe(true);
    expect(accountChanged(null, 'a')).toBe(true);
  });

  it('is false on first load and token refreshes', () => {
    expect(accountChanged(undefined, 'a')).toBe(false);
    expect(accountChanged('a', 'a')).toBe(false);
  });
});
