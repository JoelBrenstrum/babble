import { familiesQuery, queryKeys, resolveOnboarding, toBabbleError, updateBaby } from '@babble/api';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { CenteredPage } from '#/components/shell/centered-page';
import { Button } from '#/components/ui/button';
import { StatusMessage } from '#/components/ui/status';
import { DayStartPicker } from '#/features/day-start-picker';
import { readStorage, storageKeys } from '#/lib/storage';

export const Route = createFileRoute('/onboarding/day-start')({
  beforeLoad: async ({ context }) => {
    const families = await context.queryClient.ensureQueryData(familiesQuery(context.babble.client));
    const state = resolveOnboarding({
      signedIn: true,
      families,
      activeFamilyId: readStorage(storageKeys.activeFamily),
      activeBabyId: readStorage(storageKeys.activeBaby),
    });
    if (state.step !== 'ready') throw redirect({ to: '/' });
    return { baby: state.baby };
  },
  component: DayStartStep,
});

function DayStartStep() {
  const { babble, queryClient, baby } = Route.useRouteContext();
  const navigate = useNavigate();
  const [minutes, setMinutes] = useState(baby.day_start_minutes);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    try {
      await updateBaby(babble.client, baby.id, { day_start_minutes: minutes });
      await queryClient.invalidateQueries({ queryKey: queryKeys.families });
      await navigate({ to: '/onboarding/invite' });
    } catch (caught) {
      setError(toBabbleError(caught).message);
    }
  }

  return (
    <CenteredPage step="Step 3 of 4">
      <h1 className="text-title font-bold">When does {baby.name}'s day start?</h1>
      <p className="mb-8 mt-2 text-body text-ink-2">
        Daily totals and history reset at this time. You can change it later in Settings.
      </p>
      <DayStartPicker value={minutes} onChange={setMinutes} />
      {error && (
        <div className="mt-5">
          <StatusMessage tone="danger">{error}</StatusMessage>
        </div>
      )}
      <Button size="lg" className="mt-8" onClick={save}>
        Continue
      </Button>
    </CenteredPage>
  );
}
