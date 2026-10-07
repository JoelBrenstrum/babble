import { updatePassword } from '@babble/api';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CenteredPage } from '#/components/shell/centered-page';
import { PasswordForm } from '#/features/password-form';
import { requireSession } from '#/lib/session';

export const Route = createFileRoute('/auth/new-password')({
  beforeLoad: async ({ context }) => ({ session: await requireSession(context.babble.client) }),
  component: NewPassword,
});

function NewPassword() {
  const { babble, session } = Route.useRouteContext();
  const navigate = useNavigate();
  return (
    <CenteredPage>
      <h1 className="text-title font-bold">Choose a new password</h1>
      <p className="mb-8 mt-2 text-body text-ink-2">For {session.user.email}.</p>
      <PasswordForm
        submitLabel="Save password"
        onSubmit={async (password) => {
          await updatePassword(babble.client, password);
          await navigate({ to: '/' });
        }}
      />
    </CenteredPage>
  );
}
