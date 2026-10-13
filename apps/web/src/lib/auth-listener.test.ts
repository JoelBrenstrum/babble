import { describe, expect, it } from 'vitest';
import { authEffects } from './auth-listener';

describe('authEffects', () => {
  it('does nothing for the first session event', () => {
    expect(authEffects('INITIAL_SESSION', undefined, 'u1')).toEqual({ accountChanged: false, refresh: false });
  });

  it('refreshes without clearing on a repeated sign-in of the same account', () => {
    expect(authEffects('SIGNED_IN', 'u1', 'u1')).toEqual({ accountChanged: false, refresh: true });
  });

  it('clears and refreshes when a different account signs in', () => {
    expect(authEffects('SIGNED_IN', 'u1', 'u2')).toEqual({ accountChanged: true, refresh: true });
    expect(authEffects('SIGNED_IN', null, 'u2')).toEqual({ accountChanged: true, refresh: true });
  });

  it('refreshes when a magic link signs in before any account was known', () => {
    expect(authEffects('SIGNED_IN', undefined, 'u1')).toEqual({ accountChanged: false, refresh: true });
  });

  it('clears and refreshes on sign-out', () => {
    expect(authEffects('SIGNED_OUT', 'u1', null)).toEqual({ accountChanged: true, refresh: true });
  });

  it('refreshes on a sign-out even when no account was known', () => {
    expect(authEffects('SIGNED_OUT', undefined, null)).toEqual({ accountChanged: false, refresh: true });
  });
});
