import { inviteOnlySignup, openSignup } from '@babble/api/fixtures';
import { CenteredPage } from '#/components/shell/centered-page';
import { SignInForm } from './sign-in-form';

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 800));

function Page({ children }: { children: React.ReactNode }) {
  return (
    <CenteredPage>
      <h1 className="mb-8 text-title font-bold">Sign in</h1>
      {children}
    </CenteredPage>
  );
}

export default {
  'Open sign-up': (
    <Page>
      <SignInForm settings={openSignup} googleEnabled onMagicLink={wait} onGoogle={wait} />
    </Page>
  ),
  'Invite-only': (
    <Page>
      <SignInForm
        settings={inviteOnlySignup}
        googleEnabled={false}
        initialInviteCode="K7Q-4MD"
        onMagicLink={wait}
        onGoogle={wait}
      />
    </Page>
  ),
  'Server rejects sign-up': (
    <Page>
      <SignInForm
        settings={inviteOnlySignup}
        googleEnabled={false}
        onMagicLink={() =>
          Promise.reject(new Error('This Babble server is invite-only. Ask a family member for an invite code.'))
        }
        onGoogle={wait}
      />
    </Page>
  ),
};
