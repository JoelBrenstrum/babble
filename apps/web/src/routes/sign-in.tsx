import {
  instanceSettingsQuery,
  requestMagicLink,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from '@babble/api';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { CenteredPage } from '#/components/shell/centered-page';
import { CheckEmail } from '#/features/check-email';
import { DevSignIn } from '#/features/dev-sign-in';
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
  const [sent, setSent] = useState<{ email: string; resend: () => Promise<void> } | null>(null);
  const navigate = useNavigate();
  const redirectTo = `${babble.config.publicUrl}/auth/callback`;
  const initialInviteCode = invite ?? readStorage(storageKeys.pendingInvite) ?? undefined;

  if (sent) {
    return <CheckEmail email={sent.email} onResend={sent.resend} onUseDifferentEmail={() => setSent(null)} />;
  }

  return (
    <CenteredPage>
      <h1 className="text-title font-bold">Sign in</h1>
      <p className="mb-8 mt-2 text-body text-ink-2">Track your baby's day together with your family.</p>
      <SignInForm
        settings={settings}
        googleEnabled={babble.config.googleAuthEnabled}
        initialInviteCode={initialInviteCode}
        onPasswordSignIn={async (credentials) => {
          await signInWithPassword(babble.client, credentials);
          await navigate({ to: '/' });
        }}
        onSignUp={async ({ email, password, inviteCode }) => {
          if (inviteCode) writeStorage(storageKeys.pendingInvite, inviteCode);
          const signUp = () => signUpWithPassword(babble.client, { email, password, redirectTo, inviteCode });
          const { needsConfirmation } = await signUp();
          if (needsConfirmation) setSent({ email: email.trim(), resend: async () => void (await signUp()) });
          else await navigate({ to: '/' });
        }}
        onMagicLink={async ({ email, inviteCode }) => {
          if (inviteCode) writeStorage(storageKeys.pendingInvite, inviteCode);
          const request = () => requestMagicLink(babble.client, { email, redirectTo, inviteCode });
          await request();
          setSent({ email: email.trim(), resend: request });
        }}
        onGoogle={async () => {
          await signInWithGoogle(babble.client, { redirectTo });
        }}
      />
      {import.meta.env.DEV && (
        <DevSignIn
          onSignIn={async (credentials) => {
            await signInWithPassword(babble.client, credentials);
            await navigate({ to: '/' });
          }}
        />
      )}
    </CenteredPage>
  );
}
