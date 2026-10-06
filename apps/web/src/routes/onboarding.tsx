import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireSession } from '#/lib/session';

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async ({ context }) => ({ session: await requireSession(context.babble.client) }),
  component: Outlet,
});
