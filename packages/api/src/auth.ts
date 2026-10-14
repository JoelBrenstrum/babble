import type { BabbleClient } from './client';
import { BabbleError, toBabbleError, unwrapVoid } from './errors';
import { normalizeInviteCode } from './invite-code';

export function inviteMetadata(inviteCode: string | undefined): { data?: { invite_code: string } } {
  const code = inviteCode?.trim() ? normalizeInviteCode(inviteCode) : undefined;
  return code ? { data: { invite_code: code } } : {};
}

export async function requestMagicLink(
  client: BabbleClient,
  options: { email: string; redirectTo: string; inviteCode?: string },
): Promise<void> {
  unwrapVoid(
    await client.auth.signInWithOtp({
      email: options.email.trim(),
      options: {
        emailRedirectTo: options.redirectTo,
        shouldCreateUser: true,
        ...inviteMetadata(options.inviteCode),
      },
    }),
  );
}

export async function signInWithGoogle(
  client: BabbleClient,
  options: { redirectTo: string; skipBrowserRedirect?: boolean },
): Promise<string | null> {
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: options.redirectTo, skipBrowserRedirect: options.skipBrowserRedirect ?? false },
  });
  if (error) throw toBabbleError(error);
  return data.url;
}

export interface AuthRedirect {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
  error: string | null;
}

const LINK_ERRORS: Record<string, string> = {
  otp_expired: 'This sign-in link has expired. Ask for a new one.',
  access_denied: "This sign-in link isn't valid any more. Ask for a new one.",
};
const DEFAULT_LINK_ERROR = "This sign-in link didn't work. Try signing in again.";

export function authLinkErrorMessage(errorCode: string | null | undefined): string {
  return (errorCode && LINK_ERRORS[errorCode]) || DEFAULT_LINK_ERROR;
}

export function parseAuthRedirect(href: string): AuthRedirect {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const read = (key: string) => url.searchParams.get(key) ?? hash.get(key);
  const failed = read('error') ?? read('error_code') ?? read('error_description');
  return {
    code: url.searchParams.get('code'),
    accessToken: hash.get('access_token'),
    refreshToken: hash.get('refresh_token'),
    type: read('type'),
    error: failed ? authLinkErrorMessage(read('error_code') ?? read('error')) : null,
  };
}

export function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return decodeURIComponent(
    Array.from(binary, (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
  );
}

export function tokenEmail(accessToken: string): string | null {
  try {
    const claims = JSON.parse(decodeBase64Url(accessToken.split('.')[1]!)) as { email?: unknown };
    return typeof claims.email === 'string' ? claims.email : null;
  } catch {
    return null;
  }
}

export interface LinkSession {
  accessToken: string;
  refreshToken: string;
  email: string | null;
}

export type AuthRedirectResult =
  | { kind: 'signed-in'; type: string | null }
  | { kind: 'confirm'; type: string | null; session: LinkSession };

// Dashboard links carry a session in the URL hash; anyone can craft one, so the account is confirmed before use.
export async function completeAuthRedirect(client: BabbleClient, href: string): Promise<AuthRedirectResult> {
  const redirect = parseAuthRedirect(href);
  if (redirect.error) throw new BabbleError(redirect.error, 'unknown');
  if (redirect.code) {
    await exchangeAuthCode(client, redirect.code);
    return { kind: 'signed-in', type: redirect.type };
  }
  if (redirect.accessToken && redirect.refreshToken) {
    return {
      kind: 'confirm',
      type: redirect.type,
      session: {
        accessToken: redirect.accessToken,
        refreshToken: redirect.refreshToken,
        email: tokenEmail(redirect.accessToken),
      },
    };
  }
  throw new BabbleError('This sign-in link is missing its code. Try signing in again.', 'unknown');
}

export async function acceptLinkSession(client: BabbleClient, session: LinkSession): Promise<void> {
  unwrapVoid(
    await client.auth.setSession({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    }),
  );
}

export async function updatePassword(client: BabbleClient, password: string): Promise<void> {
  unwrapVoid(await client.auth.updateUser({ password }));
}

export async function exchangeAuthCode(client: BabbleClient, code: string): Promise<void> {
  unwrapVoid(await client.auth.exchangeCodeForSession(code));
}

export async function signOut(client: BabbleClient): Promise<void> {
  const { error } = await client.auth.signOut();
  if (error) await client.auth.signOut({ scope: 'local' });
}

export function accountChanged(previousUserId: string | null | undefined, nextUserId: string | null): boolean {
  return previousUserId !== undefined && previousUserId !== nextUserId;
}

export async function signInWithPassword(
  client: BabbleClient,
  options: { email: string; password: string },
): Promise<void> {
  unwrapVoid(await client.auth.signInWithPassword({ email: options.email.trim(), password: options.password }));
}

export const MIN_PASSWORD_LENGTH = 8;

export async function signUpWithPassword(
  client: BabbleClient,
  options: { email: string; password: string; redirectTo: string; inviteCode?: string },
): Promise<{ needsConfirmation: boolean }> {
  if (options.password.length < MIN_PASSWORD_LENGTH) throw toBabbleError({ code: 'weak_password' });
  const { data, error } = await client.auth.signUp({
    email: options.email.trim(),
    password: options.password,
    options: { emailRedirectTo: options.redirectTo, ...inviteMetadata(options.inviteCode) },
  });
  unwrapVoid({ error });
  return { needsConfirmation: !data.session };
}
