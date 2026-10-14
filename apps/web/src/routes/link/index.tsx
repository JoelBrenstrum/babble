import { isValidDeviceLinkCode, normalizeDeviceLinkCode } from '@babble/api';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { CenteredPage } from '#/components/shell/centered-page';
import { Button } from '#/components/ui/button';
import { TextField } from '#/components/ui/field';

export const Route = createFileRoute('/link/')({
  component: EnterDeviceCodePage,
});

function EnterDeviceCodePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!isValidDeviceLinkCode(code)) {
      setError('Enter the 8-character code shown on the other screen.');
      return;
    }
    void navigate({ to: '/link/$code', params: { code: normalizeDeviceLinkCode(code) } });
  }

  return (
    <CenteredPage>
      <h1 className="text-title font-bold">Sign in a device</h1>
      <p className="mb-8 mt-2 text-body text-ink-2">Enter the code shown on the screen you want to sign in.</p>
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <TextField
          label="Code"
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="KX7M-42PQ"
          value={code}
          error={error ?? undefined}
          onChange={(event) => {
            setCode(event.target.value);
            setError(null);
          }}
        />
        <Button type="submit" size="lg">
          Continue
        </Button>
      </form>
    </CenteredPage>
  );
}
