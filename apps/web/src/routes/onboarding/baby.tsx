import { addBaby, familiesQuery, queryKeys, resolveOnboarding, toBabbleError } from '@babble/api';
import { todayInTimeZone } from '@babble/domain';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useMemo, useState, type FormEvent } from 'react';
import { CenteredPage } from '#/components/shell/centered-page';
import { Button } from '#/components/ui/button';
import { SelectField, TextField } from '#/components/ui/field';
import { StatusMessage } from '#/components/ui/status';
import { readStorage, storageKeys, writeStorage } from '#/lib/storage';
import { detectTimeZone, listTimeZones } from '#/lib/timezones';

export const Route = createFileRoute('/onboarding/baby')({
  beforeLoad: async ({ context }) => {
    const families = await context.queryClient.ensureQueryData(familiesQuery(context.babble.client));
    const state = resolveOnboarding({
      signedIn: true,
      families,
      activeFamilyId: readStorage(storageKeys.activeFamily),
    });
    if (state.step === 'family') throw redirect({ to: '/onboarding/family' });
    if (state.step !== 'baby' && state.step !== 'ready') throw redirect({ to: '/' });
    return { family: state.family };
  },
  component: BabyStep,
});

function BabyStep() {
  const { babble, queryClient, family } = Route.useRouteContext();
  const navigate = useNavigate();
  const detected = useMemo(detectTimeZone, []);
  const timeZones = useMemo(listTimeZones, []);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [timezone, setTimezone] = useState(detected);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const baby = await addBaby(babble.client, {
        familyId: family.id,
        name,
        birthDate,
        timezone,
        dayStartMinutes: 0,
      });
      writeStorage(storageKeys.activeBaby, baby.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.families });
      await navigate({ to: '/onboarding/day-start' });
    } catch (caught) {
      setError(toBabbleError(caught).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CenteredPage step="Step 2 of 4">
      <h1 className="text-title font-bold">Add your baby</h1>
      <p className="mb-8 mt-2 text-body text-ink-2">You can add more babies later in Settings.</p>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <TextField
          label="Birth date"
          type="date"
          max={todayInTimeZone(timezone)}
          value={birthDate}
          onChange={(event) => setBirthDate(event.target.value)}
        />
        <SelectField
          label="Timezone"
          hint="Detected from this device. Times stay correct when you travel."
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
        >
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll('_', ' ')}
            </option>
          ))}
        </SelectField>
        {error && <StatusMessage tone="danger">{error}</StatusMessage>}
        <Button type="submit" size="lg" disabled={!name.trim() || !birthDate || submitting}>
          Continue
        </Button>
      </form>
    </CenteredPage>
  );
}
