import type { InstanceSettings } from '@babble/api';
import { Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '#/components/ui/button';
import { TextField } from '#/components/ui/field';
import { StatusMessage } from '#/components/ui/status';

export interface SignInFormProps {
  settings: InstanceSettings;
  googleEnabled: boolean;
  initialInviteCode?: string;
  onMagicLink: (values: { email: string; inviteCode?: string }) => Promise<void>;
  onGoogle: () => Promise<void>;
}

export function SignInForm({ settings, googleEnabled, initialInviteCode, onMagicLink, onGoogle }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState(initialInviteCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inviteOnly = settings.signupMode === 'invite_only' && settings.hasUsers;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onMagicLink({ email, inviteCode: inviteCode.trim() || undefined });
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
      {inviteOnly && (
        <TextField
          label="Invite code"
          name="invite"
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="K7Q-4MD"
          hint="Only needed the first time you sign in."
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value)}
        />
      )}
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
      <Button type="submit" size="lg" disabled={!email.includes('@')} loading={submitting}>
        {!submitting && <Mail className="size-5" strokeWidth={2.75} />}
        {submitting ? 'Sending…' : 'Email me a sign-in link'}
      </Button>
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
