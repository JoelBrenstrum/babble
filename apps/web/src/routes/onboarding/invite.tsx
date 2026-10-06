import { createInvite, familiesQuery, resolveOnboarding } from '@babble/api';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useCallback } from 'react';
import { CenteredPage } from '#/components/shell/centered-page';
import { Button } from '#/components/ui/button';
import { InvitePanel } from '#/features/invite-panel';
import { readStorage, storageKeys } from '#/lib/storage';

export const Route = createFileRoute('/onboarding/invite')({
  beforeLoad: async ({ context }) => {
    const families = await context.queryClient.ensureQueryData(familiesQuery(context.babble.client));
    const state = resolveOnboarding({
      signedIn: true,
      families,
      activeFamilyId: readStorage(storageKeys.activeFamily),
    });
    if (state.step !== 'ready') throw redirect({ to: '/' });
    return { family: state.family };
  },
  component: InviteStep,
});

function InviteStep() {
  const { family, babble } = Route.useRouteContext();
  const onCreate = useCallback(() => createInvite(babble.client, family.id), [babble, family.id]);
  return (
    <CenteredPage step="Step 4 of 4">
      <h1 className="text-title font-bold">Invite a caregiver</h1>
      <p className="mb-8 mt-2 text-body text-ink-2">
        They'll see the same timers and history live, and can log entries too.
      </p>
      <InvitePanel publicUrl={babble.config.publicUrl} onCreate={onCreate} />
      <Link to="/" className="mt-6">
        <Button variant="ghost" size="lg" className="w-full">
          Done
        </Button>
      </Link>
    </CenteredPage>
  );
}
