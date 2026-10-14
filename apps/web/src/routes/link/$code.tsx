import { approveDeviceLink, formatDeviceLinkCode, getDeviceLinkDetails, normalizeDeviceLinkCode } from '@babble/api';
import { useAsyncAction } from '@babble/api/react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { CenteredPage } from '#/components/shell/centered-page';
import { Button } from '#/components/ui/button';
import { PageSpinner } from '#/components/ui/spinner';
import { StatusMessage } from '#/components/ui/status';

export const Route = createFileRoute('/link/$code')({
  loader: async ({ context, params }) => {
    const { data } = await context.babble.client.auth.getSession();
    return { email: data.session?.user.email ?? null, code: normalizeDeviceLinkCode(params.code) };
  },
  component: ApproveDevicePage,
});

function ApproveDevicePage() {
  const { email, code } = Route.useLoaderData();
  if (email === null) {
    return (
      <CenteredPage>
        <h1 className="text-title font-bold">Sign in a device</h1>
        <p className="mb-8 mt-2 text-body text-ink-2">
          Sign in to babble on this phone first, then scan the code on the other screen again.
        </p>
        <Link to="/sign-in" search={{ invite: undefined }}>
          <Button size="lg" className="w-full">
            Sign in
          </Button>
        </Link>
      </CenteredPage>
    );
  }
  return <ApproveDevice code={code} email={email} />;
}

function ApproveDevice({ code, email }: { code: string; email: string }) {
  const { babble } = Route.useRouteContext();
  const details = useQuery({
    queryKey: ['device-link', code],
    queryFn: () => getDeviceLinkDetails(babble.client, code),
    staleTime: Infinity,
  });
  const { run, busy, error } = useAsyncAction();
  const [approved, setApproved] = useState(false);

  if (details.isPending) return <PageSpinner label="Checking code" />;

  if (approved) {
    return (
      <CenteredPage>
        <h1 className="mb-4 text-title font-bold">Device signed in</h1>
        <StatusMessage tone="success">{details.data?.device ?? 'The other screen'} is signing in now.</StatusMessage>
        <Link to="/" className="mt-8">
          <Button variant="secondary" size="lg" className="w-full">
            Back to babble
          </Button>
        </Link>
      </CenteredPage>
    );
  }

  if (!details.data) {
    return (
      <CenteredPage>
        <h1 className="mb-4 text-title font-bold">Code not found</h1>
        <StatusMessage tone="danger">
          The code {formatDeviceLinkCode(code)} has expired or was already used.
        </StatusMessage>
        <p className="mt-4 text-body text-ink-2">The other screen makes a new code every few minutes. Scan that one.</p>
      </CenteredPage>
    );
  }

  return (
    <CenteredPage>
      <h1 className="text-title font-bold">Sign in a device?</h1>
      <p className="mb-6 mt-2 text-body text-ink-2">
        <strong className="text-ink">{details.data.device}</strong> will be signed in as{' '}
        <strong className="text-ink">{email}</strong>. It can see and log everything you can.
      </p>
      <StatusMessage tone="info">
        Only continue if the screen in front of you shows the code {formatDeviceLinkCode(code)}. Never approve a code
        someone sent you.
      </StatusMessage>
      {error && (
        <div className="mt-4">
          <StatusMessage tone="danger">{error}</StatusMessage>
        </div>
      )}
      <div className="mt-8 flex flex-col gap-3">
        <Button
          size="lg"
          loading={busy}
          onClick={() =>
            void run(async () => {
              await approveDeviceLink(babble.client, code);
              setApproved(true);
            })
          }
        >
          Sign in device
        </Button>
        <Link to="/">
          <Button variant="ghost" size="lg" className="w-full">
            Cancel
          </Button>
        </Link>
      </div>
    </CenteredPage>
  );
}
