import { clock } from '@babble/api';
import { useAsyncAction } from '@babble/api/react';
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
  const [sentAt, setSentAt] = useState(() => clock.now().getTime());
  const [now, setNow] = useState(sentAt);
  const { run, busy: pending, error } = useAsyncAction();
  const resend = resendState(sentAt, now);

  useEffect(() => {
    if (resend.ready) return;
    const id = setInterval(() => setNow(clock.now().getTime()), 1000);
    return () => clearInterval(id);
  }, [resend.ready]);

  async function resendLink() {
    const resent = await run(onResend);
    if (!resent) return;
    const at = clock.now().getTime();
    setSentAt(at);
    setNow(at);
  }

  return (
    <Screen>
      <Wordmark />
      <View className="mt-10 gap-3">
        <Title subtitle={`We sent a sign-in link to ${email}. Open it on this phone.`}>Check your email</Title>
        {error && <StatusMessage tone="danger">{error}</StatusMessage>}
        <Button variant="secondary" disabled={!resend.ready} loading={pending} onPress={resendLink}>
          {resend.label}
        </Button>
        <Button variant="ghost" onPress={onUseDifferentEmail}>
          Use a different email
        </Button>
      </View>
    </Screen>
  );
}
