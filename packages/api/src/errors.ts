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
  'invite_required' | 'invite_invalid' | 'not_signed_in' | 'forbidden' | 'network' | 'unknown';

const MESSAGES: Record<BabbleErrorCode, string> = {
  invite_required: 'This Babble server is invite-only. Ask a family member for an invite code.',
  invite_invalid: 'That invite code is invalid, already used or expired.',
  not_signed_in: 'You need to sign in again.',
  forbidden: "You don't have permission to do that.",
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
  if (/not signed in/i.test(message) || status === 401) return 'not_signed_in';
  if (code === '42501' || status === 403) return 'forbidden';
  if (name === 'TypeError' && /fetch/i.test(message)) return 'network';
  if (name === 'AuthRetryableFetchError') return 'network';
  return 'unknown';
}

export function unwrap<T>(result: { data: T; error: unknown }): NonNullable<T> {
  if (result.error) throw toBabbleError(result.error);
  if (result.data === null || result.data === undefined) throw new BabbleError(MESSAGES.unknown, 'unknown');
  return result.data as NonNullable<T>;
}
