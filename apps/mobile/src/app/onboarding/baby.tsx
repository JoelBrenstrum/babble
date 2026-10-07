import { addBaby, queryKeys, toBabbleError } from '@babble/api';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/button';
import { PageSpinner } from '@/components/page-spinner';
import { Screen, Title } from '@/components/screen';
import { StatusMessage } from '@/components/status-message';
import { TextField } from '@/components/text-field';
import { DateField } from '@/features/date-field';
import { detectTimeZone, TimezoneField } from '@/features/timezone-field';
import { useActiveBaby } from '@/lib/active-baby';
import { useBabble } from '@/lib/babble';
import { useOnboarding } from '@/lib/use-onboarding';

export default function BabyStep() {
  const { client } = useBabble();
  const queryClient = useQueryClient();
  const { state, loading } = useOnboarding();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const adding = mode === 'add';
  const active = useActiveBaby();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [timezone, setTimezone] = useState(detectTimeZone);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <PageSpinner />;
  if (state?.step === 'family') return <Redirect href="/onboarding/family" />;
  if (state?.step !== 'baby' && state?.step !== 'ready') return <Redirect href="/" />;
  const family = state.family;

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const baby = await addBaby(client, { familyId: family.id, name, birthDate, timezone, dayStartMinutes: 0 });
      active.select({ familyId: family.id, babyId: baby.id });
      await queryClient.invalidateQueries({ queryKey: queryKeys.families, refetchType: 'all' });
      router.replace(adding ? '/' : '/onboarding/day-start');
    } catch (caught) {
      setError(toBabbleError(caught).message);
      setSubmitting(false);
    }
  }

  return (
    <Screen step={adding ? undefined : 'Step 2 of 4'}>
      <Title
        subtitle={adding ? 'Everyone in the family will see them straight away.' : 'You can add more babies later.'}
      >
        {adding ? `Add a baby to ${family.name}` : 'Add your baby'}
      </Title>
      <View className="gap-5">
        <TextField label="Name" value={name} onChangeText={setName} />
        <DateField label="Birth date" value={birthDate} onChange={setBirthDate} maximumDate={new Date()} />
        <TimezoneField value={timezone} onChange={setTimezone} />
        {error && <StatusMessage tone="danger">{error}</StatusMessage>}
        <Button size="lg" onPress={submit} loading={submitting} disabled={!name.trim() || !birthDate}>
          {submitting ? 'Adding baby…' : adding ? 'Add baby' : 'Continue'}
        </Button>
        {adding && (
          <Button variant="ghost" onPress={() => router.back()}>
            Cancel
          </Button>
        )}
      </View>
    </Screen>
  );
}
