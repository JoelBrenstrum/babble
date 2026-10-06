import { instanceSettingsQuery, requestMagicLink, signInWithGoogle } from '@babble/api';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { CenteredPage } from '#/components/shell/centered-page';
import { Button } from '#/components/ui/button';
import { SignInForm } from '#/features/sign-in-form';
import { readStorage, storageKeys, writeStorage } from '#/lib/storage';

export const Route = createFileRoute('/sign-in')({
  validateSearch: (search: Record<string, unknown>) => ({
    invite: typeof search.invite === 'string' ? search.invite : undefined,
  }),
  beforeLoad: async ({ context }) => {
    const { data } = await context.babble.client.auth.getSession();
    if (data.session) throw redirect({ to: '/' });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(instanceSettingsQuery(context.babble.client)),
  component: SignInPage,
});

function SignInPage() {
  const { babble } = Route.useRouteContext();
  const { invite } = Route.useSearch();
  const { data: settings } = useSuspenseQuery(instanceSettingsQuery(babble.client));
  const [sentTo, setSentTo] = useState<string | null>(null);
  const redirectTo = `${babble.config.publicUrl}/auth/callback`;
  const initialInviteCode = invite ?? readStorage(storageKeys.pendingInvite) ?? undefined;

  if (sentTo) {
    return (
      <CenteredPage>
        <h1 className="text-title font-bold">Check your email</h1>
        <p className="mt-3 text-body text-ink-2">
          We sent a sign-in link to <strong className="text-ink">{sentTo}</strong>. Open it on this device. It expires
          soon, so use it within the hour.
        </p>
        <Button variant="ghost" className="mt-8 self-start" onClick={() => setSentTo(null)}>
          Use a different email
        </Button>
      </CenteredPage>
    );
  }

  return (
    <CenteredPage>
      <h1 className="text-title font-bold">Sign in</h1>
      <p className="mb-8 mt-2 text-body text-ink-2">Track your baby's day together with your family.</p>
      <SignInForm
        settings={settings}
        googleEnabled={babble.config.googleAuthEnabled}
        initialInviteCode={initialInviteCode}
        onMagicLink={async ({ email, inviteCode }) => {
          if (inviteCode) writeStorage(storageKeys.pendingInvite, inviteCode);
          await requestMagicLink(babble.client, { email, redirectTo, inviteCode });
          setSentTo(email.trim());
        }}
        onGoogle={async () => {
          await signInWithGoogle(babble.client, { redirectTo });
        }}
      />
    </CenteredPage>
  );
}
