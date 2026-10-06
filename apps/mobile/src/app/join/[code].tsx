import { acceptInvite, inviteQuery, normalizeInviteCode, queryKeys, toBabbleError } from '@babble/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Button } from '@/components/button';
import { Screen, Title } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { TextField } from '@/components/text-field';
import { useBabble } from '@/lib/babble';

export default function Join() {
  const { client, session } = useBabble();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ code: string }>();
  const code = normalizeInviteCode(params.code ?? '');
  const invite = useQuery(inviteQuery(client, code));
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (invite.isPending) return <ActivityIndicator className="flex-1" />;

  if (!invite.data) {
    return (
      <Screen>
        <Title>Invite not found</Title>
        <StatusMessage tone="danger">{`The invite code ${code} is invalid, already used or expired.`}</StatusMessage>
      </Screen>
    );
  }

  async function join() {
    setError(null);
    try {
      await acceptInvite(client, { code, displayName });
      await queryClient.invalidateQueries({ queryKey: queryKeys.families });
      router.replace('/');
    } catch (caught) {
      setError(toBabbleError(caught).message);
    }
  }

  return (
    <Screen>
      <Title subtitle="You'll see the same timers and history live, and can log entries too.">
        {`Join ${invite.data.familyName}`}
      </Title>
      {session ? (
        <View className="gap-5">
          <TextField label="Your name" value={displayName} onChangeText={setDisplayName} />
          {error && <StatusMessage tone="danger">{error}</StatusMessage>}
          <Button size="lg" onPress={join} disabled={!displayName.trim()}>
            Join family
          </Button>
        </View>
      ) : (
        <Button size="lg" onPress={() => router.push({ pathname: '/sign-in', params: { invite: code } })}>
          Sign in to join
        </Button>
      )}
    </Screen>
  );
}
