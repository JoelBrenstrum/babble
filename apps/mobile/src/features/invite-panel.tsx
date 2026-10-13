import { clock, toBabbleError, type Invite } from '@babble/api';
import { formatExpiry, inviteLink } from '@babble/domain';
import { useEffect, useRef, useState } from 'react';
import { useTokenColor } from '@/lib/theme';
import { ActivityIndicator, Share, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { StatusMessage } from '@/components/status-message';

export function InvitePanel({ publicUrl, onCreate }: { publicUrl: string; onCreate: () => Promise<Invite> }) {
  const spinnerColor = useTokenColor('--primary');
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const creating = useRef<Promise<Invite> | null>(null);

  useEffect(() => {
    let cancelled = false;
    creating.current ??= onCreate();
    creating.current
      .then((created) => !cancelled && setInvite(created))
      .catch((caught) => !cancelled && setError(toBabbleError(caught).message));
    return () => {
      cancelled = true;
    };
  }, [onCreate]);

  if (error) return <StatusMessage tone="danger">{error}</StatusMessage>;
  if (!invite) {
    return (
      <Card className="h-80 items-center justify-center gap-3">
        <ActivityIndicator size="large" color={spinnerColor} />
        <Text className="font-sans text-meta text-ink-2">Creating invite…</Text>
      </Card>
    );
  }

  const link = inviteLink(publicUrl, invite.code);

  return (
    <Card className="items-center gap-5 p-6">
      <View className="rounded-tile bg-white p-3">
        <QRCode value={link} size={168} />
      </View>
      <View className="items-center">
        <Text className="font-sans text-meta text-ink-2">Invite code</Text>
        <Text className="font-bold text-timer-md tracking-widest text-ink">{invite.code}</Text>
        <Text className="font-sans text-meta text-ink-3">{formatExpiry(invite.expiresAt, clock.now())}</Text>
      </View>
      <Button
        className="self-stretch"
        onPress={() => Share.share({ message: `Join our family on babble: ${link}`, url: link })}
      >
        Share invite link
      </Button>
    </Card>
  );
}
