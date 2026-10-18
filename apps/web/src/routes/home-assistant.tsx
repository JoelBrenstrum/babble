import { createFileRoute } from '@tanstack/react-router';
import { HomeAssistantPage } from '#/features/home-assistant/home-assistant-page';

export const Route = createFileRoute('/home-assistant')({
  head: () => ({
    meta: [
      { title: 'Home Assistant · babble' },
      {
        name: 'description',
        content: 'Show naps and the next feed on a Home Assistant dashboard, and automate around them.',
      },
    ],
  }),
  component: HomeAssistantRoute,
});

function HomeAssistantRoute() {
  const { babble } = Route.useRouteContext();
  return <HomeAssistantPage serverUrl={babble.config.publicUrl} billingEnabled={babble.config.billingEnabled} />;
}
