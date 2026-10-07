import { authLinkErrorMessage, exchangeAuthCode, toBabbleError } from '@babble/api';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { PageSpinner } from '@/components/page-spinner';
import { Screen, Title } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { useBabble } from '@/lib/babble';
import { router } from 'expo-router';

export default function AuthCallback() {
  const { client } = useBabble();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_code?: string;
    error_description?: string;
  }>();
  const { code } = params;
  const linkFailed = Boolean(params.error || params.error_code || params.error_description);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(
    linkFailed ? authLinkErrorMessage(params.error_code ?? params.error) : null,
  );

  useEffect(() => {
    if (!code || linkFailed) {
      if (!code) setError((current) => current ?? 'This sign-in link is missing its code. Try signing in again.');
      return;
    }
    exchangeAuthCode(client, code)
      .then(() => setDone(true))
      .catch((caught) => setError(toBabbleError(caught).message));
  }, [client, code, linkFailed]);

  if (done) return <Redirect href="/" />;
  if (!error) return <PageSpinner label="Signing you in" />;

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
