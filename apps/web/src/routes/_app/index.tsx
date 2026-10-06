import { createFileRoute } from '@tanstack/react-router';
import { HomeOverview } from '#/features/home-overview';

export const Route = createFileRoute('/_app/')({ component: HomePage });

function HomePage() {
  const { baby } = Route.useRouteContext();
  return <HomeOverview baby={baby} />;
}
