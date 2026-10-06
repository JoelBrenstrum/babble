import { createInvite } from '@babble/api';
import { Redirect, router } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/button';
import { Screen, Title } from '@/components/screen';
import { InvitePanel } from '@/features/invite-panel';
import { useBabble } from '@/lib/babble';
import { useReadyState } from '@/lib/use-onboarding';

export default function InviteStep() {
  const ready = useReadyState();
  const { client, config } = useBabble();
  const familyId = ready?.family.id;
  const onCreate = useCallback(() => createInvite(client, familyId!), [client, familyId]);
  if (!ready) return <Redirect href="/" />;
  return (
    <Screen step="Step 4 of 4">
      <Title subtitle="They'll see the same timers and history live, and can log entries too.">
        Invite a caregiver
      </Title>
      <View className="gap-5">
        <InvitePanel publicUrl={config.publicUrl} onCreate={onCreate} />
        <Button variant="ghost" size="lg" onPress={() => router.replace('/')}>
          Done
        </Button>
      </View>
    </Screen>
  );
}
