import { createFileRoute } from '@tanstack/react-router';
import { GuidePage } from '#/features/guide/guide-page';

export const Route = createFileRoute('/guide')({
  head: () => ({
    meta: [
      { title: 'Reports and the dashboard · babble' },
      {
        name: 'description',
        content:
          'How to build your own baby tracking charts in babble: measures, splits, filters, nine chart types, templates, saving, and the family dashboard.',
      },
    ],
  }),
  loader: async ({ context }) => {
    const { data } = await context.babble.client.auth.getSession();
    return { signedIn: Boolean(data.session) };
  },
  component: GuideRoute,
});

function GuideRoute() {
  const { signedIn } = Route.useLoaderData();
  const { babble } = Route.useRouteContext();
  return <GuidePage signedIn={signedIn} billingEnabled={babble.config.billingEnabled} />;
}
