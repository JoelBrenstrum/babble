import { familiesQuery, resolveOnboarding } from '@babble/api';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AppShell } from '#/components/shell/app-shell';
import { readStorage, storageKeys } from '#/lib/storage';

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
    return { session: data.session!, family: state.family, baby: state.baby };
  },
  component: AppLayout,
});

function AppLayout() {
  const { family, baby } = Route.useRouteContext();
  return (
    <AppShell family={family} baby={baby}>
      <Outlet />
    </AppShell>
  );
}
