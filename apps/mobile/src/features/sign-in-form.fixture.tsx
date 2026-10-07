import { inviteOnlySignup, openSignup } from '@babble/api/fixtures';
import { SignInForm } from './sign-in-form';

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 800));
const handlers = { onPasswordSignIn: wait, onSignUp: wait, onMagicLink: wait, onGoogle: wait };

export default {
  'Sign in': <SignInForm settings={openSignup} googleEnabled {...handlers} />,
  'Create account with invite': (
    <SignInForm settings={inviteOnlySignup} googleEnabled={false} initialInviteCode="K7Q-4MD" {...handlers} />
  ),
  'Wrong password': (
    <SignInForm
      settings={inviteOnlySignup}
      googleEnabled={false}
      {...handlers}
      onPasswordSignIn={() => Promise.reject(new Error("That email and password don't match."))}
    />
  ),
};
