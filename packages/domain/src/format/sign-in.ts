export type SignInMode = 'signin' | 'signup' | 'link';

export interface SignInFormInput {
  mode: SignInMode;
  email: string;
  password: string;
  inviteCode: string;
  settings: { signupMode: string; hasUsers: boolean };
  minPasswordLength: number;
}

export interface SignInFormState {
  askInvite: boolean;
  canSubmit: boolean;
  passwordTooShort: boolean;
  invite: string | undefined;
}

export function signInFormState(input: SignInFormInput): SignInFormState {
  const { mode, email, password, inviteCode, settings, minPasswordLength } = input;
  const askInvite = settings.signupMode === 'invite_only' && settings.hasUsers && mode !== 'signin';
  const signingUp = mode === 'signup';
  return {
    askInvite,
    passwordTooShort: signingUp && password.length > 0 && password.length < minPasswordLength,
    canSubmit:
      email.includes('@') &&
      (mode === 'link' || (signingUp ? password.length >= minPasswordLength : password.length > 0)),
    invite: askInvite ? inviteCode.trim() || undefined : undefined,
  };
}
