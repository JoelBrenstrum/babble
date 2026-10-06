import {
  instanceSettingsQuery,
  requestMagicLink,
  signInWithGoogle,
  exchangeAuthCode,
  toBabbleError,
} from '@babble/api';
import { useQuery } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Screen, Title, Wordmark } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { TextField } from '@/components/text-field';
import { useBabble } from '@/lib/babble';
import { AUTH_REDIRECT } from '@/lib/config';

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  const { client, config, session } = useBabble();
  const params = useLocalSearchParams<{ invite?: string }>();
  const settings = useQuery(instanceSettingsQuery(client));
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState(params.invite ?? '');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session) return <Redirect href="/" />;

  const inviteOnly = settings.data?.signupMode === 'invite_only' && settings.data.hasUsers;

  async function sendLink() {
    setError(null);
    setSubmitting(true);
    try {
      await requestMagicLink(client, { email, redirectTo: AUTH_REDIRECT, inviteCode: inviteCode.trim() || undefined });
      setSentTo(email.trim());
    } catch (caught) {
      setError(toBabbleError(caught).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function google() {
    setError(null);
    try {
      const url = await signInWithGoogle(client, { redirectTo: AUTH_REDIRECT, skipBrowserRedirect: true });
      if (!url) return;
      const result = await WebBrowser.openAuthSessionAsync(url, AUTH_REDIRECT);
      if (result.type !== 'success') return;
      const code = new URL(result.url).searchParams.get('code');
      if (code) await exchangeAuthCode(client, code);
    } catch (caught) {
      setError(toBabbleError(caught).message);
    }
  }

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
      <View className="mt-10 gap-5">
        <Title subtitle="Track your baby's day together with your family.">Sign in</Title>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        {inviteOnly && (
          <TextField
            label="Invite code"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            placeholder="K7Q-4MD"
            hint="Only needed the first time you sign in."
          />
        )}
        {error && <StatusMessage tone="danger">{error}</StatusMessage>}
        <Button size="lg" onPress={sendLink} loading={submitting} disabled={!email.includes('@')}>
          Email me a sign-in link
        </Button>
        {config.googleAuthEnabled && (
          <>
            <Text className="text-center font-sans text-meta text-ink-3">or</Text>
            <Button size="lg" variant="secondary" onPress={google}>
              Continue with Google
            </Button>
          </>
        )}
      </View>
    </Screen>
  );
}
