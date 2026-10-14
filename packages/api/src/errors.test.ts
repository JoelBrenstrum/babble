import { describe, expect, it } from 'vitest';
import { BabbleError, toBabbleError, unwrap, unwrapMaybe, unwrapVoid } from './errors';

describe('toBabbleError', () => {
  it.each([
    [{ code: 'PL003', message: 'Invite required' }, 'invite_required'],
    [{ code: 'P0001', message: 'Sign-up on this Babble server requires a valid invite code' }, 'invite_required'],
    [{ code: 'P0001', message: 'some other plpgsql exception' }, 'unknown'],
    [{ code: 'PL001', message: 'Adding more than one baby to a family needs Babble Plus' }, 'baby_limit'],
    [{ code: 'PL002', message: 'A free family can have two carers' }, 'carer_limit'],
    [{ code: 'PL004', message: 'A family needs at least one admin' }, 'last_admin'],
    [{ code: 'PL005', message: 'This code has expired' }, 'device_link_invalid'],
    [{ code: 'PL006', message: 'Too many sign-in codes' }, 'too_many_codes'],
    [{ message: 'Database error saving new user', status: 500 }, 'invite_required'],
    [{ code: 'P0002', message: 'This invite code is invalid, used or expired' }, 'invite_invalid'],
    [{ code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 }, 'invalid_credentials'],
    [{ message: 'User already registered', status: 422 }, 'already_registered'],
    [{ status: 429, code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }, 'rate_limited'],
    [{ code: 'weak_password', message: 'Password should be at least 8 characters.' }, 'weak_password'],
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

describe('unwrapVoid', () => {
  it('passes on success', () => expect(unwrapVoid({ error: null })).toBeUndefined());
  it('throws mapped errors', () => expect(() => unwrapVoid({ error: { code: '42501' } })).toThrow(BabbleError));
});

describe('unwrapMaybe', () => {
  it('returns null for no row', () => expect(unwrapMaybe({ data: null, error: null })).toBeNull());
  it('returns data', () => expect(unwrapMaybe({ data: 2, error: null })).toBe(2));
  it('throws mapped errors', () =>
    expect(() => unwrapMaybe({ data: null, error: { code: 'PL001' } })).toThrow(BabbleError));
});
