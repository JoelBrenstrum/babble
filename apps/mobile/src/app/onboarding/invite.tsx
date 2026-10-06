import { Redirect, router } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/components/button';
import { Screen, Title } from '@/components/screen';
import { InvitePanel } from '@/features/invite-panel';
import { useReadyState } from '@/lib/use-onboarding';

export default function InviteStep() {
  const ready = useReadyState();
  if (!ready) return <Redirect href="/" />;
  return (
    <Screen step="Step 4 of 4">
      <Title subtitle="They'll see the same timers and history live, and can log entries too.">
        Invite a caregiver
      </Title>
      <View className="gap-5">
        <InvitePanel familyId={ready.family.id} />
        <Button variant="ghost" size="lg" onPress={() => router.replace('/')}>
          Done
        </Button>
      </View>
    </Screen>
  );
}
