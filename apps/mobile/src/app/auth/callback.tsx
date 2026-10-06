import { exchangeAuthCode, toBabbleError } from '@babble/api';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/button';
import { Screen, Title } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { useBabble } from '@/lib/babble';
import { router } from 'expo-router';

export default function AuthCallback() {
  const { client } = useBabble();
  const { code, error_description } = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(error_description ?? null);

  useEffect(() => {
    if (!code || error_description) {
      if (!code) setError((current) => current ?? 'This sign-in link is missing its code. Try signing in again.');
      return;
    }
    exchangeAuthCode(client, code)
      .then(() => setDone(true))
      .catch((caught) => setError(toBabbleError(caught).message));
  }, [client, code, error_description]);

  if (done) return <Redirect href="/" />;
  if (!error) return <View className="flex-1 bg-bg" />;

  return (
    <Screen>
      <Title>Couldn't sign you in</Title>
      <StatusMessage tone="danger">{error}</StatusMessage>
      <Button variant="ghost" className="mt-6" onPress={() => router.replace('/sign-in')}>
        Back to sign in
      </Button>
    </Screen>
  );
}
