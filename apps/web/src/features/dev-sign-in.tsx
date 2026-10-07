import { DEV_ACCOUNTS, DEV_PASSWORD, toBabbleError } from '@babble/api';
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
  const [error, setError] = useState<string | null>(null);

  async function signIn(email: string) {
    setError(null);
    setPending(email);
    try {
      await onSignIn({ email, password: DEV_PASSWORD });
    } catch (caught) {
      setError(`${toBabbleError(caught).message} Run \`pnpm --filter @babble/db reset\` to reseed the dev accounts.`);
      setPending(null);
    }
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
      <div className="grid grid-cols-2 gap-3">
        {DEV_ACCOUNTS.map((account) => (
          <Button
            key={account.email}
            variant="secondary"
            loading={pending === account.email}
            disabled={pending !== null && pending !== account.email}
            onClick={() => signIn(account.email)}
          >
            Sign in as {account.name}
          </Button>
        ))}
      </div>
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
    </section>
  );
}
