export class BabbleError extends Error {
  constructor(
    message: string,
    readonly code: BabbleErrorCode,
    readonly cause?: unknown,
  ) {
    super(message);
  }
}

export type BabbleErrorCode =
  | 'invite_required'
  | 'invite_invalid'
  | 'not_signed_in'
  | 'forbidden'
  | 'session_conflict'
  | 'invalid_credentials'
  | 'already_registered'
  | 'weak_password'
  | 'rate_limited'
  | 'network'
  | 'unknown';

const MESSAGES: Record<BabbleErrorCode, string> = {
  invite_required: 'This Babble server is invite-only. Ask a family member for an invite code.',
  invite_invalid: 'That invite code is invalid, already used or expired.',
  not_signed_in: 'You need to sign in again.',
  forbidden: "You don't have permission to do that.",
  invalid_credentials: "That email and password don't match. Try again, or use a sign-in link instead.",
  already_registered: "There's already an account with that email. Sign in instead.",
  weak_password: 'Choose a longer password: at least 8 characters.',
  rate_limited: 'Too many sign-in emails have been sent recently. Try again later, or sign in with a password.',
  session_conflict: 'Another session of this kind is already running. Finish or discard it first.',
  network: "Couldn't reach the server. Check your connection and try again.",
  unknown: 'Something went wrong. Please try again.',
};

interface ErrorLike {
  code?: string;
  message?: string;
  status?: number;
  name?: string;
}

export function toBabbleError(error: unknown): BabbleError {
  if (error instanceof BabbleError) return error;
  const { code, message = '', status, name } = (error ?? {}) as ErrorLike;
  const resolved = classify(code, message, status, name);
  return new BabbleError(MESSAGES[resolved], resolved, error);
}

function classify(code: string | undefined, message: string, status: number | undefined, name: string | undefined) {
  if (code === 'P0001' || /requires a valid invite code/i.test(message)) return 'invite_required';
  // GoTrue hides trigger exceptions behind a generic message when a sign-up is rejected by the database.
  if (/database error saving new user/i.test(message)) return 'invite_required';
  if (code === 'P0002') return 'invite_invalid';
  if (status === 429 || code === 'over_email_send_rate_limit' || /rate limit/i.test(message)) return 'rate_limited';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) return 'invalid_credentials';
  if (code === 'user_already_exists' || /already registered/i.test(message)) return 'already_registered';
  if (code === 'weak_password' || /password should be at least/i.test(message)) return 'weak_password';
  if (code === '23505' && /events_one_running_per_type/.test(message)) return 'session_conflict';
  if (/not signed in/i.test(message) || status === 401) return 'not_signed_in';
  if (code === '42501' || status === 403) return 'forbidden';
  if (/failed to fetch|fetch failed|network request failed|load failed/i.test(message)) return 'network';
  if (name === 'AuthRetryableFetchError') return 'network';
  return 'unknown';
}

export function unwrap<T>(result: { data: T; error: unknown }): NonNullable<T> {
  if (result.error) throw toBabbleError(result.error);
  if (result.data === null || result.data === undefined) throw new BabbleError(MESSAGES.unknown, 'unknown');
  return result.data as NonNullable<T>;
}
