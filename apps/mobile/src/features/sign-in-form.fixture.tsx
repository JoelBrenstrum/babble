import { inviteOnlySignup, openSignup } from '@babble/api/fixtures';
import { SignInForm } from './sign-in-form';

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 800));

export default {
  'Open sign-up': <SignInForm settings={openSignup} googleEnabled onMagicLink={wait} onGoogle={wait} />,
  'Invite-only': (
    <SignInForm
      settings={inviteOnlySignup}
      googleEnabled={false}
      initialInviteCode="K7Q-4MD"
      onMagicLink={wait}
      onGoogle={wait}
    />
  ),
  'Server rejects sign-up': (
    <SignInForm
      settings={inviteOnlySignup}
      googleEnabled={false}
      onMagicLink={() =>
        Promise.reject(new Error('This Babble server is invite-only. Ask a family member for an invite code.'))
      }
      onGoogle={wait}
    />
  ),
};
