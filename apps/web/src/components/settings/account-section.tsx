import { deleteMyAccount, signOut, type BabbleClient } from '@babble/api';
import { useAsyncAction } from '@babble/api/react';
import { useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { TextField } from '#/components/ui/field';
import { StatusMessage } from '#/components/ui/status';
import { ChangePassword } from './change-password';

export function AccountSection({ client, email }: { client: BabbleClient; email: string }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { run, error } = useAsyncAction();

  const leave = (action: () => Promise<void>) =>
    run(async () => {
      await action();
      await navigate({ to: '/sign-in', search: { invite: undefined } });
    });

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="text-body text-ink-2">
        Signed in as <span className="font-semibold text-ink">{email}</span>
      </div>
      <ChangePassword client={client} />
      <Button variant="secondary" className="self-start" onClick={() => leave(() => signOut(client))}>
        <LogOut className="size-5" strokeWidth={2.75} />
        Sign out
      </Button>
      {confirming ? (
        <div className="flex flex-col gap-4 rounded-tile bg-danger-soft p-4">
          <p className="text-meta text-on-danger">
            You'll be signed out on every device and your login is removed. Your family keeps its records while another
            member remains.
          </p>
          <TextField
            label="Type DELETE to confirm"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
          />
          <div className="flex gap-3">
            <Button
              variant="destructive"
              disabled={confirmText !== 'DELETE'}
              onClick={() => leave(() => deleteMyAccount(client))}
            >
              Delete account
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" className="self-start text-danger" onClick={() => setConfirming(true)}>
          Delete account
        </Button>
      )}
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
    </Card>
  );
}
