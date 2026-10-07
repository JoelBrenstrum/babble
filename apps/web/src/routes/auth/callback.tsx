import { acceptLinkSession, completeAuthRedirect, toBabbleError, type LinkSession } from '@babble/api';
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { CenteredPage } from '#/components/shell/centered-page';
import { Button } from '#/components/ui/button';
import { StatusMessage } from '#/components/ui/status';

type CallbackData = { error: string } | { confirm: LinkSession; type: string | null; currentEmail: string | null };

export const Route = createFileRoute('/auth/callback')({
  loader: async ({ context }): Promise<CallbackData> => {
    const { client } = context.babble;
    let result: Awaited<ReturnType<typeof completeAuthRedirect>>;
    try {
      result = await completeAuthRedirect(client, window.location.href);
    } catch (error) {
      return { error: toBabbleError(error).message };
    }
    if (result.kind === 'signed-in') {
      throw redirect({ to: result.type === 'recovery' ? '/auth/new-password' : '/' });
    }
    window.history.replaceState(null, '', window.location.pathname);
    const { data } = await client.auth.getSession();
    return { confirm: result.session, type: result.type, currentEmail: data.session?.user.email ?? null };
  },
  component: Callback,
});

function Callback() {
  const data = Route.useLoaderData();
  return 'error' in data ? <CallbackError message={data.error} /> : <ConfirmAccount {...data} />;
}

function ConfirmAccount({ confirm, type, currentEmail }: Extract<CallbackData, { confirm: LinkSession }>) {
  const { babble } = Route.useRouteContext();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const account = confirm.email ?? 'this account';

  const accept = async () => {
    setBusy(true);
    try {
      await acceptLinkSession(babble.client, confirm);
      await navigate({ to: type === 'recovery' ? '/auth/new-password' : '/', replace: true });
    } catch (caught) {
      setError(toBabbleError(caught).message);
      setBusy(false);
    }
  };

  return (
    <CenteredPage>
      <h1 className="mb-2 text-title font-bold">Continue as {account}?</h1>
      <p className="mb-6 text-body text-ink-2">
        {currentEmail && currentEmail !== confirm.email
          ? `You're signed in as ${currentEmail}. This link signs you in as ${account} instead.`
          : 'Only continue if you asked for this sign-in link.'}
      </p>
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
      <div className="mt-4 flex flex-col gap-3">
        <Button onClick={() => void accept()} disabled={busy}>
          Continue
        </Button>
        <Link to="/sign-in" search={{ invite: undefined }} className="text-center font-semibold text-primary underline">
          Cancel
        </Link>
      </div>
    </CenteredPage>
  );
}

function CallbackError({ message }: { message: string }) {
  return (
    <CenteredPage>
      <h1 className="mb-4 text-title font-bold">Couldn't sign you in</h1>
      <StatusMessage tone="danger">{message}</StatusMessage>
      <Link to="/sign-in" search={{ invite: undefined }} className="mt-6 font-semibold text-primary underline">
        Back to sign in
      </Link>
    </CenteredPage>
  );
}
