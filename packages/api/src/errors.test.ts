import { describe, expect, it } from 'vitest';
import { BabbleError, toBabbleError, unwrap } from './errors';

describe('toBabbleError', () => {
  it.each([
    [{ code: 'P0001', message: 'Sign-up on this Babble server requires a valid invite code' }, 'invite_required'],
    [{ message: 'Database error saving new user', status: 500 }, 'invite_required'],
    [{ code: 'P0002', message: 'This invite code is invalid, used or expired' }, 'invite_invalid'],
    [
      { code: '23505', message: 'duplicate key value violates unique constraint "events_one_running_per_type"' },
      'session_conflict',
    ],
    [{ code: '42501', message: 'new row violates row-level security policy' }, 'forbidden'],
    [{ message: 'Not signed in' }, 'not_signed_in'],
    [{ status: 401, message: 'JWT expired' }, 'not_signed_in'],
    [{ name: 'TypeError', message: 'Failed to fetch' }, 'network'],
    [{ name: 'AuthRetryableFetchError', message: '' }, 'network'],
    [{ message: 'TypeError: Failed to fetch', code: '' }, 'network'],
    [{ message: 'Network request failed' }, 'network'],
    [{ message: 'weird' }, 'unknown'],
    [null, 'unknown'],
  ])('classifies %j as %s', (error, code) => {
    const result = toBabbleError(error);
    expect(result).toBeInstanceOf(BabbleError);
    expect(result.code).toBe(code);
    expect(result.message).not.toBe('');
  });

  it('passes BabbleErrors through', () => {
    const error = new BabbleError('x', 'forbidden');
    expect(toBabbleError(error)).toBe(error);
  });
});

describe('unwrap', () => {
  it('returns data', () => expect(unwrap({ data: 1, error: null })).toBe(1));
  it('throws mapped errors', () => expect(() => unwrap({ data: null, error: { code: 'P0002' } })).toThrow(BabbleError));
  it('throws on missing data', () => expect(() => unwrap({ data: null, error: null })).toThrow(BabbleError));
});
