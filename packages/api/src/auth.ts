import type { BabbleClient } from './client';
import { toBabbleError } from './errors';
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
