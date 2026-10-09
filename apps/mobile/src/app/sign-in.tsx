import {
  exchangeAuthCode,
  instanceSettingsQuery,
  requestMagicLink,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from '@babble/api';
import { useQuery } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';
import { Screen, Title, Wordmark } from '@/components/screen';
import { CheckEmail } from '@/features/check-email';
import { DevSignIn } from '@/features/dev-sign-in';
import { AgreementNote } from '@/features/legal-links';
import { SignInForm } from '@/features/sign-in-form';
import { useBabble } from '@/lib/babble';
import { AUTH_REDIRECT } from '@/lib/config';

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  const { client, config, session } = useBabble();
  const params = useLocalSearchParams<{ invite?: string }>();
  const settings = useQuery(instanceSettingsQuery(client));
  const [sent, setSent] = useState<{ email: string; resend: () => Promise<void> } | null>(null);

  if (session) return <Redirect href="/" />;

  if (sent) {
    return <CheckEmail email={sent.email} onResend={sent.resend} onUseDifferentEmail={() => setSent(null)} />;
  }

  return (
    <Screen>
      <Wordmark />
      <View className="mt-10">
        <Title subtitle="Track your baby's day together with your family.">Sign in</Title>
        <SignInForm
          settings={settings.data}
          googleEnabled={config.googleAuthEnabled}
          initialInviteCode={params.invite}
          onPasswordSignIn={(credentials) => signInWithPassword(client, credentials)}
          onSignUp={async ({ email, password, inviteCode }) => {
            const signUp = () => signUpWithPassword(client, { email, password, redirectTo: AUTH_REDIRECT, inviteCode });
            const { needsConfirmation } = await signUp();
            if (needsConfirmation) setSent({ email: email.trim(), resend: async () => void (await signUp()) });
          }}
          onMagicLink={async ({ email, inviteCode }) => {
            const request = () => requestMagicLink(client, { email, redirectTo: AUTH_REDIRECT, inviteCode });
            await request();
            setSent({ email: email.trim(), resend: request });
          }}
          onGoogle={async () => {
            const url = await signInWithGoogle(client, { redirectTo: AUTH_REDIRECT, skipBrowserRedirect: true });
            if (!url) return;
            const result = await WebBrowser.openAuthSessionAsync(url, AUTH_REDIRECT);
            if (result.type !== 'success') return;
            const code = new URL(result.url).searchParams.get('code');
            if (code) await exchangeAuthCode(client, code);
          }}
        />
        <AgreementNote publicUrl={config.publicUrl} />
        {__DEV__ && <DevSignIn onSignIn={(credentials) => signInWithPassword(client, credentials)} />}
      </View>
    </Screen>
  );
}
