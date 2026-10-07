import { inviteOnlySignup, openSignup } from '@babble/api/fixtures';
import { CenteredPage } from '#/components/shell/centered-page';
import { SignInForm } from './sign-in-form';

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 800));
const handlers = { onPasswordSignIn: wait, onSignUp: wait, onMagicLink: wait, onGoogle: wait };

function Page({ children }: { children: React.ReactNode }) {
  return (
    <CenteredPage>
      <h1 className="mb-8 text-title font-bold">Sign in</h1>
      {children}
    </CenteredPage>
  );
}

export default {
  'Sign in': (
    <Page>
      <SignInForm settings={openSignup} googleEnabled {...handlers} />
    </Page>
  ),
  'Create account with invite': (
    <Page>
      <SignInForm settings={inviteOnlySignup} googleEnabled={false} initialInviteCode="K7Q-4MD" {...handlers} />
    </Page>
  ),
  'Wrong password': (
    <Page>
      <SignInForm
        settings={inviteOnlySignup}
        googleEnabled={false}
        {...handlers}
        onPasswordSignIn={() =>
          Promise.reject(new Error("That email and password don't match. Try again, or use a sign-in link instead."))
        }
      />
    </Page>
  ),
};
