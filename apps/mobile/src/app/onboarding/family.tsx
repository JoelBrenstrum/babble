import { acceptInvite, createFamily, queryKeys, toBabbleError } from '@babble/api';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/button';
import { Screen, Title } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { StatusMessage } from '@/components/status-message';
import { TextField } from '@/components/text-field';
import { useBabble } from '@/lib/babble';

type Mode = 'create' | 'join';

export default function FamilyStep() {
  const { client, session } = useBabble();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ invite?: string }>();
  const [mode, setMode] = useState<Mode>(params.invite ? 'join' : 'create');
  const [displayName, setDisplayName] = useState(
    (session?.user.user_metadata.full_name as string | undefined)?.split(' ')[0] ?? '',
  );
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState(params.invite ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'create') await createFamily(client, { familyName, displayName });
      else await acceptInvite(client, { code: inviteCode, displayName });
      await queryClient.invalidateQueries({ queryKey: queryKeys.families, refetchType: 'all' });
      router.replace(mode === 'create' ? '/onboarding/baby' : '/');
    } catch (caught) {
      setError(toBabbleError(caught).message);
      setSubmitting(false);
    }
  }

  const valid = Boolean(displayName.trim() && (mode === 'create' ? familyName.trim() : inviteCode.trim()));

  return (
    <Screen step="Step 1 of 4">
      <Title subtitle="Everyone in a family shares the same babies, timers and history.">Set up your family</Title>
      <View className="gap-5">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'create', label: 'Create a family' },
            { value: 'join', label: 'Join with a code' },
          ]}
        />
        <TextField label="Your name" value={displayName} onChangeText={setDisplayName} hint="Shown to your family." />
        {mode === 'create' ? (
          <TextField label="Family name" value={familyName} onChangeText={setFamilyName} placeholder="The Smiths" />
        ) : (
          <TextField
            label="Invite code"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            placeholder="K7Q4M-D2XPA"
          />
        )}
        {error && <StatusMessage tone="danger">{error}</StatusMessage>}
        <Button size="lg" onPress={submit} loading={submitting} disabled={!valid}>
          {submitting
            ? mode === 'create'
              ? 'Creating family…'
              : 'Joining…'
            : mode === 'create'
              ? 'Continue'
              : 'Join family'}
        </Button>
      </View>
    </Screen>
  );
}
