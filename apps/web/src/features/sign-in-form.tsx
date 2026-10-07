import { MIN_PASSWORD_LENGTH, type InstanceSettings } from '@babble/api';
import { Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '#/components/ui/button';
import { TextField } from '#/components/ui/field';
import { Segmented } from '#/components/ui/segmented';
import { StatusMessage } from '#/components/ui/status';

type Mode = 'signin' | 'signup' | 'link';

export interface SignInFormProps {
  settings: InstanceSettings;
  googleEnabled: boolean;
  initialInviteCode?: string;
  onPasswordSignIn: (values: { email: string; password: string }) => Promise<void>;
  onSignUp: (values: { email: string; password: string; inviteCode?: string }) => Promise<void>;
  onMagicLink: (values: { email: string; inviteCode?: string }) => Promise<void>;
  onGoogle: () => Promise<void>;
}

export function SignInForm({
  settings,
  googleEnabled,
  initialInviteCode,
  onPasswordSignIn,
  onSignUp,
  onMagicLink,
  onGoogle,
}: SignInFormProps) {
  const [mode, setMode] = useState<Mode>(initialInviteCode ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(initialInviteCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inviteOnly = settings.signupMode === 'invite_only' && settings.hasUsers;
  const askInvite = inviteOnly && mode !== 'signin';
  const passwordTooShort = mode === 'signup' && password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const canSubmit =
    email.includes('@') &&
    (mode === 'link' || (mode === 'signup' ? password.length >= MIN_PASSWORD_LENGTH : password.length > 0));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const invite = askInvite ? inviteCode.trim() || undefined : undefined;
    try {
      if (mode === 'signin') await onPasswordSignIn({ email, password });
      else if (mode === 'signup') await onSignUp({ email, password, inviteCode: invite });
      else await onMagicLink({ email, inviteCode: invite });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function google() {
    setError(null);
    try {
      await onGoogle();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {mode !== 'link' && (
        <Segmented
          label="Account"
          value={mode}
          onChange={(next) => {
            setMode(next);
            setError(null);
          }}
          options={[
            { value: 'signin', label: 'Sign in' },
            { value: 'signup', label: 'Create account' },
          ]}
        />
      )}
      <TextField
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      {mode !== 'link' && (
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          required
          value={password}
          hint={mode === 'signup' ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
          error={passwordTooShort ? `Use at least ${MIN_PASSWORD_LENGTH} characters.` : null}
          onChange={(event) => setPassword(event.target.value)}
        />
      )}
      {askInvite && (
        <TextField
          label="Invite code"
          name="invite"
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="K7Q4M-D2XPA"
          hint="Ask someone in your family for a code from Settings."
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value)}
        />
      )}
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
      <Button type="submit" size="lg" disabled={!canSubmit} loading={submitting}>
        {mode === 'link' && !submitting && <Mail className="size-5" strokeWidth={2.75} />}
        {mode === 'signin'
          ? 'Sign in'
          : mode === 'signup'
            ? 'Create account'
            : submitting
              ? 'Sending…'
              : 'Email me a sign-in link'}
      </Button>
      <button
        type="button"
        onClick={() => {
          setMode(mode === 'link' ? 'signin' : 'link');
          setError(null);
        }}
        className="self-center text-meta font-semibold text-primary underline-offset-4 hover:underline"
      >
        {mode === 'link' ? 'Use a password instead' : 'Forgot your password? Email me a sign-in link'}
      </button>
      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-meta text-ink-3">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          <Button variant="secondary" size="lg" onClick={google}>
            <span className="grid size-6 place-items-center rounded-full bg-surface text-label font-bold">G</span>
            Continue with Google
          </Button>
        </>
      )}
    </form>
  );
}
