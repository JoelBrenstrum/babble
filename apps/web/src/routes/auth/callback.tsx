import { exchangeAuthCode, toBabbleError } from '@babble/api';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { CenteredPage } from '#/components/shell/centered-page';
import { StatusMessage } from '#/components/ui/status';

export const Route = createFileRoute('/auth/callback')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === 'string' ? search.code : undefined,
    error_description: typeof search.error_description === 'string' ? search.error_description : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    if (deps.error_description) return { error: deps.error_description };
    if (!deps.code) return { error: 'This sign-in link is missing its code. Try signing in again.' };
    try {
      await exchangeAuthCode(context.babble.client, deps.code);
    } catch (error) {
      return { error: toBabbleError(error).message };
    }
    throw redirect({ to: '/' });
  },
  component: CallbackError,
});

function CallbackError() {
  const { error } = Route.useLoaderData();
  return (
    <CenteredPage>
      <h1 className="mb-4 text-title font-bold">Couldn't sign you in</h1>
      <StatusMessage tone="danger">{error}</StatusMessage>
      <Link to="/sign-in" search={{ invite: undefined }} className="mt-6 font-semibold text-primary underline">
        Back to sign in
      </Link>
    </CenteredPage>
  );
}
