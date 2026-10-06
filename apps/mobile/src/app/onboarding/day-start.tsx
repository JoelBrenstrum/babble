import { queryKeys, toBabbleError, updateBaby } from '@babble/api';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/button';
import { Screen, Title } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { DayStartPicker } from '@/features/day-start-picker';
import { useBabble } from '@/lib/babble';
import { useReadyState } from '@/lib/use-onboarding';

export default function DayStartStep() {
  const ready = useReadyState();
  if (!ready) return <Redirect href="/" />;
  return <DayStartForm babyId={ready.baby.id} babyName={ready.baby.name} initial={ready.baby.day_start_minutes} />;
}

function DayStartForm({ babyId, babyName, initial }: { babyId: string; babyName: string; initial: number }) {
  const { client } = useBabble();
  const queryClient = useQueryClient();
  const [minutes, setMinutes] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    try {
      await updateBaby(client, babyId, { day_start_minutes: minutes });
      await queryClient.invalidateQueries({ queryKey: queryKeys.families });
      router.replace('/onboarding/invite');
    } catch (caught) {
      setError(toBabbleError(caught).message);
    }
  }

  return (
    <Screen step="Step 3 of 4">
      <Title subtitle="Daily totals and history reset at this time. You can change it later in Settings.">
        {`When does ${babyName}'s day start?`}
      </Title>
      <View className="gap-5">
        <DayStartPicker value={minutes} onChange={setMinutes} />
        {error && <StatusMessage tone="danger">{error}</StatusMessage>}
        <Button size="lg" onPress={save}>
          Continue
        </Button>
      </View>
    </Screen>
  );
}
