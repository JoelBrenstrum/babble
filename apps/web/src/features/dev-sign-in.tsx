import { DEV_ACCOUNTS, DEV_PASSWORD } from '@babble/api/dev';
import { useAsyncAction } from '@babble/api/react';
import { Wrench } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { StatusMessage } from '#/components/ui/status';

export function DevSignIn({
  onSignIn,
}: {
  onSignIn: (credentials: { email: string; password: string }) => Promise<void>;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const { run, busy, error } = useAsyncAction();

  function signIn(email: string) {
    setPending(email);
    void run(() => onSignIn({ email, password: DEV_PASSWORD }));
  }

  return (
    <section
      aria-label="Development sign-in"
      className="mt-10 flex flex-col gap-3 rounded-card border border-dashed border-line-strong p-4"
    >
      <p className="flex items-center gap-2 text-meta font-semibold text-ink-2">
        <Wrench className="size-4" strokeWidth={2.75} />
        Development only
      </p>
      <p className="text-meta text-ink-2">John and Jane share a Plus family. Sam has a free family.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {DEV_ACCOUNTS.map((account) => (
          <Button
            key={account.email}
            variant="secondary"
            loading={busy && pending === account.email}
            disabled={busy && pending !== account.email}
            onClick={() => signIn(account.email)}
          >
            Sign in as {account.name}
          </Button>
        ))}
      </div>
      {error && (
        <StatusMessage tone="danger">
          {error} Run `pnpm --filter @babble/db reset` to reseed the dev accounts.
        </StatusMessage>
      )}
    </section>
  );
}
