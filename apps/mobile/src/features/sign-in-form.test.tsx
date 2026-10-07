import { fireEvent, render, screen } from '@testing-library/react-native';
import { SignInForm, type SignInFormProps } from './sign-in-form';

async function setup(overrides: Partial<SignInFormProps> = {}) {
  const props: SignInFormProps = {
    settings: { signupMode: 'invite_only', hasUsers: true },
    googleEnabled: false,
    onPasswordSignIn: jest.fn().mockResolvedValue(undefined),
    onSignUp: jest.fn().mockResolvedValue(undefined),
    onMagicLink: jest.fn().mockResolvedValue(undefined),
    onGoogle: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  await render(<SignInForm {...props} />);
  return props;
}

describe('SignInForm', () => {
  it('signs in with a password', async () => {
    const props = await setup();
    await fireEvent.changeText(screen.getByLabelText('Email'), 'john@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'hunter22');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(props.onPasswordSignIn).toHaveBeenCalledWith({ email: 'john@example.com', password: 'hunter22' });
  });

  it('creates an account with an invite code on invite-only servers', async () => {
    const props = await setup();
    await fireEvent.press(screen.getByRole('radio', { name: 'Create account' }));
    await fireEvent.changeText(screen.getByLabelText('Email'), 'jane@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'correcthorse');
    await fireEvent.changeText(screen.getByLabelText('Invite code'), 'K7Q-4MD');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(props.onSignUp).toHaveBeenCalledWith({
      email: 'jane@example.com',
      password: 'correcthorse',
      inviteCode: 'K7Q-4MD',
    });
  });
});
