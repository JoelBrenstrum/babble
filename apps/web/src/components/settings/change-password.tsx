import { updatePassword, type BabbleClient } from '@babble/api';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { StatusMessage } from '#/components/ui/status';
import { PasswordForm } from '#/features/password-form';

export function ChangePassword({ client }: { client: BabbleClient }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="secondary" className="self-start" onClick={() => setOpen(true)}>
          Change password
        </Button>
        {saved && <StatusMessage tone="success">Password saved.</StatusMessage>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-tile border border-line p-4">
      <PasswordForm
        submitLabel="Save password"
        onSubmit={async (password) => {
          await updatePassword(client, password);
          setOpen(false);
          setSaved(true);
        }}
      />
      <Button variant="ghost" className="self-start" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}
