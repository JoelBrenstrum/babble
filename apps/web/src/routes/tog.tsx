import { createFileRoute } from '@tanstack/react-router';
import { TogPage } from '#/features/tog/tog-page';

export const Route = createFileRoute('/tog')({
  head: () => ({
    meta: [
      { title: 'TOG calculator · babble' },
      {
        name: 'description',
        content:
          'Enter the room temperature to get the right baby sleeping bag TOG, or enter a bag TOG to see the room temperature it suits. Free, no sign-in.',
      },
    ],
  }),
  loader: async ({ context }) => {
    const { data } = await context.babble.client.auth.getSession();
    return { signedIn: Boolean(data.session) };
  },
  component: TogRoute,
});

function TogRoute() {
  const { signedIn } = Route.useLoaderData();
  return <TogPage signedIn={signedIn} />;
}
