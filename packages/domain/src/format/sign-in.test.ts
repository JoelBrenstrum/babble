import { describe, expect, it } from 'vitest';
import { signInFormState, type SignInFormInput } from './sign-in';

const base: SignInFormInput = {
  mode: 'signin',
  email: 'a@b.co',
  password: 'secret',
  inviteCode: '',
  settings: { signupMode: 'open', hasUsers: true },
  minPasswordLength: 8,
};
const state = (patch: Partial<SignInFormInput>) => signInFormState({ ...base, ...patch });

describe('signInFormState', () => {
  it('needs an email and a password to sign in', () => {
    expect(state({}).canSubmit).toBe(true);
    expect(state({ email: 'nope' }).canSubmit).toBe(false);
    expect(state({ password: '' }).canSubmit).toBe(false);
  });

  it('enforces the minimum length only when signing up', () => {
    expect(state({ mode: 'signup', password: 'short' })).toMatchObject({ canSubmit: false, passwordTooShort: true });
    expect(state({ mode: 'signup', password: 'longenough' })).toMatchObject({
      canSubmit: true,
      passwordTooShort: false,
    });
    expect(state({ mode: 'signup', password: '' })).toMatchObject({ canSubmit: false, passwordTooShort: false });
    expect(state({ mode: 'signin', password: 'short' })).toMatchObject({ canSubmit: true, passwordTooShort: false });
  });

  it('does not need a password for a sign-in link', () => {
    expect(state({ mode: 'link', password: '' }).canSubmit).toBe(true);
    expect(state({ mode: 'link', password: '', email: '' }).canSubmit).toBe(false);
  });

  it('asks for an invite only on an invite-only instance that already has users, outside sign-in', () => {
    const inviteOnly = { signupMode: 'invite_only', hasUsers: true };
    expect(state({ settings: inviteOnly, mode: 'signup' }).askInvite).toBe(true);
    expect(state({ settings: inviteOnly, mode: 'link' }).askInvite).toBe(true);
    expect(state({ settings: inviteOnly, mode: 'signin' }).askInvite).toBe(false);
    expect(state({ settings: { signupMode: 'invite_only', hasUsers: false }, mode: 'signup' }).askInvite).toBe(false);
    expect(state({ mode: 'signup' }).askInvite).toBe(false);
  });

  it('trims the invite code, and drops it when empty or not asked for', () => {
    const inviteOnly = { signupMode: 'invite_only', hasUsers: true };
    expect(state({ settings: inviteOnly, mode: 'signup', inviteCode: '  K7Q4M  ' }).invite).toBe('K7Q4M');
    expect(state({ settings: inviteOnly, mode: 'signup', inviteCode: '   ' }).invite).toBeUndefined();
    expect(state({ mode: 'signup', inviteCode: 'K7Q4M' }).invite).toBeUndefined();
  });
});
