import { acceptInvite, inviteQuery, normalizeInviteCode, queryKeys, toBabbleError } from '@babble/api';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { CenteredPage } from '#/components/shell/centered-page';
import { Button } from '#/components/ui/button';
import { TextField } from '#/components/ui/field';
import { StatusMessage } from '#/components/ui/status';
import { storageKeys, writeStorage } from '#/lib/storage';

export const Route = createFileRoute('/join/$code')({
  loader: async ({ context, params }) => {
    const { data } = await context.babble.client.auth.getSession();
    return { signedIn: Boolean(data.session), code: normalizeInviteCode(params.code) };
  },
  component: JoinPage,
});

function JoinPage() {
  const { babble, queryClient } = Route.useRouteContext();
  const { signedIn, code } = Route.useLoaderData();
  const navigate = useNavigate();
  const invite = useQuery(inviteQuery(babble.client, code));
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    writeStorage(storageKeys.pendingInvite, code);
  }, [code]);

  async function join(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const familyId = await acceptInvite(babble.client, { code, displayName });
      writeStorage(storageKeys.pendingInvite, null);
      writeStorage(storageKeys.activeFamily, familyId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.families });
      await navigate({ to: '/' });
    } catch (caught) {
      setError(toBabbleError(caught).message);
    }
  }

  if (invite.isPending) return <CenteredPage>{null}</CenteredPage>;

  if (!invite.data) {
    return (
      <CenteredPage>
        <h1 className="mb-4 text-title font-bold">Invite not found</h1>
        <StatusMessage tone="danger">The invite code {code} is invalid, already used or expired.</StatusMessage>
        <p className="mt-4 text-body text-ink-2">Ask whoever invited you to send a new one.</p>
      </CenteredPage>
    );
  }

  return (
    <CenteredPage>
      <h1 className="text-title font-bold">Join {invite.data.familyName}</h1>
      <p className="mb-8 mt-2 text-body text-ink-2">
        You'll see the same timers and history live, and can log entries too.
      </p>
      {signedIn ? (
        <form onSubmit={join} className="flex flex-col gap-5">
          <TextField
            label="Your name"
            autoComplete="given-name"
            hint="Shown to your family, e.g. on timers you start."
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
          {error && <StatusMessage tone="danger">{error}</StatusMessage>}
          <Button type="submit" size="lg" disabled={!displayName.trim()}>
            Join family
          </Button>
        </form>
      ) : (
        <Link to="/sign-in" search={{ invite: code }}>
          <Button size="lg" className="w-full">
            Sign in to join
          </Button>
        </Link>
      )}
    </CenteredPage>
  );
}
