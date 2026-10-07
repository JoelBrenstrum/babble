import { MIN_PASSWORD_LENGTH } from '@babble/api';
import { useState, type FormEvent } from 'react';
import { Button } from '#/components/ui/button';
import { TextField } from '#/components/ui/field';
import { StatusMessage } from '#/components/ui/status';

export function PasswordForm({
  submitLabel,
  onSubmit,
}: {
  submitLabel: string;
  onSubmit: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit(password);
      setPassword('');
      setConfirm('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        value={password}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        error={tooShort ? `Use at least ${MIN_PASSWORD_LENGTH} characters.` : null}
        onChange={(event) => setPassword(event.target.value)}
      />
      <TextField
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        error={mismatch ? "The passwords don't match." : null}
        onChange={(event) => setConfirm(event.target.value)}
      />
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
      <Button
        type="submit"
        size="lg"
        loading={saving}
        disabled={password.length < MIN_PASSWORD_LENGTH || confirm !== password}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
