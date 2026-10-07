import { babyChoices, familiesQuery, resolveOnboarding, type BabyChoice } from '@babble/api';
import { createFileRoute, Outlet, redirect, useRouter } from '@tanstack/react-router';
import { AppShell } from '#/components/shell/app-shell';
import { readStorage, storageKeys, writeStorage } from '#/lib/storage';
import { useRealtimeEvents } from '#/lib/use-events';

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
    const { data } = await context.babble.client.auth.getSession();
    const families = data.session
      ? await context.queryClient.ensureQueryData(familiesQuery(context.babble.client))
      : [];
    const state = resolveOnboarding({
      signedIn: Boolean(data.session),
      families,
      activeFamilyId: readStorage(storageKeys.activeFamily),
      activeBabyId: readStorage(storageKeys.activeBaby),
    });
    if (state.step === 'sign-in') throw redirect({ to: '/sign-in', search: { invite: undefined } });
    if (state.step === 'family') throw redirect({ to: '/onboarding/family' });
    if (state.step === 'baby') throw redirect({ to: '/onboarding/baby' });
    return { session: data.session!, family: state.family, baby: state.baby, families };
  },
  component: AppLayout,
});

function AppLayout() {
  const { family, baby, babble, families } = Route.useRouteContext();
  const router = useRouter();
  useRealtimeEvents(babble.client, baby.id);

  function selectBaby(choice: BabyChoice) {
    writeStorage(storageKeys.activeFamily, choice.familyId);
    writeStorage(storageKeys.activeBaby, choice.baby.id);
    void router.invalidate();
  }

  return (
    <AppShell family={family} baby={baby} choices={babyChoices(families)} onSelectBaby={selectBaby}>
      <Outlet />
    </AppShell>
  );
}
