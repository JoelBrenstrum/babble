import { toBabbleError } from '@babble/api';
import { resendState } from '@babble/domain';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/button';
import { Screen, Title, Wordmark } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';

export function CheckEmail({
  email,
  onResend,
  onUseDifferentEmail,
}: {
  email: string;
  onResend: () => Promise<void>;
  onUseDifferentEmail: () => void;
}) {
  const [sentAt, setSentAt] = useState(() => Date.now());
  const [now, setNow] = useState(sentAt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resend = resendState(sentAt, now);

  useEffect(() => {
    if (resend.ready) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [resend.ready]);

  async function run() {
    setPending(true);
    setError(null);
    try {
      await onResend();
      const at = Date.now();
      setSentAt(at);
      setNow(at);
    } catch (caught) {
      setError(toBabbleError(caught).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen>
      <Wordmark />
      <View className="mt-10 gap-3">
        <Title subtitle={`We sent a sign-in link to ${email}. Open it on this phone.`}>Check your email</Title>
        {error && <StatusMessage tone="danger">{error}</StatusMessage>}
        <Button variant="secondary" disabled={!resend.ready} loading={pending} onPress={run}>
          {resend.label}
        </Button>
        <Button variant="ghost" onPress={onUseDifferentEmail}>
          Use a different email
        </Button>
      </View>
    </Screen>
  );
}
