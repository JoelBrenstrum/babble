import { createFileRoute } from '@tanstack/react-router';
import { LandingPage } from '#/features/landing/landing-page';

export const Route = createFileRoute('/welcome')({
  head: () => ({
    meta: [
      { title: 'babble · a calm baby tracker for the whole family' },
      {
        name: 'description',
        content:
          'Track feeds, sleep, nappies and more, shared live with everyone who helps. Free, private and open source.',
      },
    ],
  }),
  loader: async ({ context }) => {
    const { data } = await context.babble.client.auth.getSession();
    return { signedIn: Boolean(data.session) };
  },
  component: WelcomePage,
});

function WelcomePage() {
  const { signedIn } = Route.useLoaderData();
  return <LandingPage signedIn={signedIn} />;
}
