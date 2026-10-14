import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';
import { DeviceSignInView, useDeviceSignIn } from '#/features/device-sign-in';
import { safeReturnPath } from '#/lib/device-link';

export const Route = createFileRoute('/device-sign-in')({
  validateSearch: (search: Record<string, unknown>): { to?: string } => ({
    to: typeof search.to === 'string' ? safeReturnPath(search.to) : undefined,
  }),
  beforeLoad: async ({ context, search }) => {
    const { data } = await context.babble.client.auth.getSession();
    if (data.session) throw redirect({ href: search.to ?? '/' });
    if (!context.babble.config.deviceSignInEnabled) throw redirect({ to: '/sign-in', search: { invite: undefined } });
  },
  component: DeviceSignInPage,
});

function DeviceSignInPage() {
  const { babble } = Route.useRouteContext();
  const { to } = Route.useSearch();
  const router = useRouter();
  const onSignedIn = useCallback(() => void router.history.push(to ?? '/'), [router, to]);
  const state = useDeviceSignIn(babble.client, babble.config.publicUrl, onSignedIn);
  const title = to?.startsWith('/chair') ? 'Sign in to chair mode' : 'Sign in with your phone';
  return <DeviceSignInView state={state} title={title} publicUrl={babble.config.publicUrl} />;
}
