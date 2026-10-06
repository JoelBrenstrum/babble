import { createInvite, toBabbleError, type Invite } from '@babble/api';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Share, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { StatusMessage } from '@/components/status-message';
import { useBabble } from '@/lib/babble';

export function InvitePanel({ familyId }: { familyId: string }) {
  const { client, config } = useBabble();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createInvite(client, familyId)
      .then((created) => !cancelled && setInvite(created))
      .catch((caught) => !cancelled && setError(toBabbleError(caught).message));
    return () => {
      cancelled = true;
    };
  }, [client, familyId]);

  if (error) return <StatusMessage tone="danger">{error}</StatusMessage>;
  if (!invite) return <ActivityIndicator className="my-10" />;

  const link = `${config.publicUrl}/join/${invite.code}`;
  const days = Math.max(1, Math.round((Date.parse(invite.expiresAt) - Date.now()) / 86_400_000));

  return (
    <Card className="items-center gap-5 p-6">
      <View className="rounded-tile bg-white p-3">
        <QRCode value={link} size={168} />
      </View>
      <View className="items-center">
        <Text className="font-sans text-meta text-ink-2">Invite code</Text>
        <Text className="font-bold text-timer-md tracking-widest text-ink">{invite.code}</Text>
        <Text className="font-sans text-meta text-ink-3">{`Expires in ${days} ${days === 1 ? 'day' : 'days'} · one use`}</Text>
      </View>
      <Button
        className="self-stretch"
        onPress={() => Share.share({ message: `Join our family on Babble: ${link}`, url: link })}
      >
        Share invite link
      </Button>
    </Card>
  );
}
