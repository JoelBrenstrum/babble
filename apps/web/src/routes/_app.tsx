import {
  babyChoices,
  babySettingsQuery,
  canLog,
  familiesQuery,
  isAdmin,
  resolveOnboarding,
  runningEventsQuery,
} from '@babble/api';
import { canAddBaby } from '@babble/config';
import { runningIndicator } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Outlet, redirect, useLocation } from '@tanstack/react-router';
import { AppShell } from '#/components/shell/app-shell';
import { signedOutRedirect } from '#/lib/entry';
import { runningStandalone } from '#/lib/install-prompt';
import { ensureCurrentData, queryCacheRestored } from '#/lib/query-persistence';
import { readStorage, storageKeys } from '#/lib/storage';
import { DeviceNameProvider } from '#/features/device-name-context';
import { NapPromptProvider } from '#/features/nap-prompt';
import { useAutoEndStaleSessions, useRealtimeEvents } from '@babble/api/react';
import { useNightTheme } from '#/lib/use-night-theme';
import { useSelectBaby } from '#/lib/use-select-baby';

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    const { data } = await context.babble.client.auth.getSession();
    await queryCacheRestored();
    const families = data.session
      ? await ensureCurrentData(context.queryClient, familiesQuery(context.babble.client))
      : [];
    const state = resolveOnboarding({
      signedIn: Boolean(data.session),
      families,
      activeFamilyId: readStorage(storageKeys.activeFamily),
      activeBabyId: readStorage(storageKeys.activeBaby),
    });
    if (state.step === 'sign-in') {
      if (location.pathname === '/chair' && context.babble.config.deviceSignInEnabled) {
        throw redirect({ to: '/device-sign-in', search: { to: location.href } });
      }
      const destination = signedOutRedirect({
        signedIn: false,
        standalone: runningStandalone(),
        pendingInvite: readStorage(storageKeys.pendingInvite),
      });
      if (destination === '/welcome') throw redirect({ to: '/welcome' });
      throw redirect({ to: '/sign-in', search: { invite: undefined } });
    }
    if (state.step === 'family') throw redirect({ to: '/onboarding/family' });
    if (state.step === 'baby') throw redirect({ to: '/onboarding/baby' });
    const session = data.session!;
    return {
      session,
      family: state.family,
      baby: state.baby,
      families,
      canLog: canLog(state.family, session.user.id),
      admin: isAdmin(state.family, session.user.id),
    };
  },
  component: AppLayout,
});

function AppLayout() {
  const { family, baby, babble, families, canLog: loggable, admin } = Route.useRouteContext();
  const selectBaby = useSelectBaby();
  const pathname = useLocation({ select: (location) => location.pathname });
  useRealtimeEvents(babble.client, baby.id);
  useAutoEndStaleSessions(babble.client, baby.id, { enabled: loggable });
  const running = useQuery(runningEventsQuery(babble.client, baby.id)).data ?? [];
  const settings = useQuery(babySettingsQuery(babble.client, baby.id)).data;
  useNightTheme(
    settings ? { timeZone: baby.timezone, start: settings.night_start_minutes, end: settings.night_end_minutes } : null,
  );

  const page = (
    <DeviceNameProvider client={babble.client} familyId={family.id}>
      <NapPromptProvider client={babble.client} babyId={baby.id} babyName={baby.name} timeZone={baby.timezone}>
        <Outlet />
      </NapPromptProvider>
    </DeviceNameProvider>
  );
  if (pathname === '/chair') return page;

  return (
    <AppShell
      family={family}
      baby={baby}
      choices={babyChoices(families)}
      onSelectBaby={selectBaby}
      running={runningIndicator(running)}
      addBabyLocked={!canAddBaby(babble.config.billingEnabled, family.plan, family.babies.length)}
      canAddBaby={admin}
    >
      {page}
    </AppShell>
  );
}
