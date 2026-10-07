import type { BabbleClient } from './client';
import { BabbleError, toBabbleError } from './errors';
import { normalizeInviteCode } from './invite-code';

export async function requestMagicLink(
  client: BabbleClient,
  options: { email: string; redirectTo: string; inviteCode?: string },
): Promise<void> {
  const inviteCode = options.inviteCode?.trim() ? normalizeInviteCode(options.inviteCode) : undefined;
  const { error } = await client.auth.signInWithOtp({
    email: options.email.trim(),
    options: {
      emailRedirectTo: options.redirectTo,
      shouldCreateUser: true,
      ...(inviteCode ? { data: { invite_code: inviteCode } } : {}),
    },
  });
  if (error) throw toBabbleError(error);
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

export function parseAuthRedirect(href: string): AuthRedirect {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const read = (key: string) => url.searchParams.get(key) ?? hash.get(key);
  return {
    code: url.searchParams.get('code'),
    accessToken: hash.get('access_token'),
    refreshToken: hash.get('refresh_token'),
    type: read('type'),
    error: read('error_description') ?? read('error'),
  };
}

// Links sent from the Supabase dashboard (e.g. password recovery) use the implicit flow and put the session in the URL hash.
export async function completeAuthRedirect(client: BabbleClient, href: string): Promise<{ type: string | null }> {
  const redirect = parseAuthRedirect(href);
  if (redirect.error) throw new BabbleError(redirect.error, 'unknown');
  if (redirect.code) {
    await exchangeAuthCode(client, redirect.code);
  } else if (redirect.accessToken && redirect.refreshToken) {
    const { error } = await client.auth.setSession({
      access_token: redirect.accessToken,
      refresh_token: redirect.refreshToken,
    });
    if (error) throw toBabbleError(error);
  } else {
    throw new BabbleError('This sign-in link is missing its code. Try signing in again.', 'unknown');
  }
  return { type: redirect.type };
}

export async function updatePassword(client: BabbleClient, password: string): Promise<void> {
  const { error } = await client.auth.updateUser({ password });
  if (error) throw toBabbleError(error);
}

export async function exchangeAuthCode(client: BabbleClient, code: string): Promise<void> {
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) throw toBabbleError(error);
}

export async function signOut(client: BabbleClient): Promise<void> {
  const { error } = await client.auth.signOut();
  if (error) throw toBabbleError(error);
}

export async function signInWithPassword(
  client: BabbleClient,
  options: { email: string; password: string },
): Promise<void> {
  const { error } = await client.auth.signInWithPassword({ email: options.email.trim(), password: options.password });
  if (error) throw toBabbleError(error);
}

export const MIN_PASSWORD_LENGTH = 8;

export async function signUpWithPassword(
  client: BabbleClient,
  options: { email: string; password: string; redirectTo: string; inviteCode?: string },
): Promise<{ needsConfirmation: boolean }> {
  const inviteCode = options.inviteCode?.trim() ? normalizeInviteCode(options.inviteCode) : undefined;
  const { data, error } = await client.auth.signUp({
    email: options.email.trim(),
    password: options.password,
    options: { emailRedirectTo: options.redirectTo, ...(inviteCode ? { data: { invite_code: inviteCode } } : {}) },
  });
  if (error) throw toBabbleError(error);
  return { needsConfirmation: !data.session };
}

// Seeded by packages/db/supabase/seed.sql into the local database only.
export const DEV_ACCOUNTS = [
  { name: 'John', role: 'owner', email: 'john@babble.dev' },
  { name: 'Jane', role: 'caregiver', email: 'jane@babble.dev' },
] as const;

export const DEV_PASSWORD = 'password';
