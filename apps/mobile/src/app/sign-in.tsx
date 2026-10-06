import {
  exchangeAuthCode,
  instanceSettingsQuery,
  requestMagicLink,
  signInWithGoogle,
  toBabbleError,
} from '@babble/api';
import { useQuery } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/button';
import { Screen, Title, Wordmark } from '@/components/screen';
import { SignInForm } from '@/features/sign-in-form';
import { useBabble } from '@/lib/babble';
import { AUTH_REDIRECT } from '@/lib/config';

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  const { client, config, session } = useBabble();
  const params = useLocalSearchParams<{ invite?: string }>();
  const settings = useQuery(instanceSettingsQuery(client));
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (session) return <Redirect href="/" />;

  if (sentTo) {
    return (
      <Screen>
        <Wordmark />
        <View className="mt-10">
          <Title subtitle={`We sent a sign-in link to ${sentTo}. Open it on this phone.`}>Check your email</Title>
          <Button variant="ghost" onPress={() => setSentTo(null)}>
            Use a different email
          </Button>
        </View>
      </Screen>
    );
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
          onMagicLink={async ({ email, inviteCode }) => {
            try {
              await requestMagicLink(client, { email, redirectTo: AUTH_REDIRECT, inviteCode });
            } catch (caught) {
              throw toBabbleError(caught);
            }
            setSentTo(email.trim());
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
      </View>
    </Screen>
  );
}
