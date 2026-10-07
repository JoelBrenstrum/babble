import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SignInForm, type SignInFormProps } from './sign-in-form';

const openSettings = { signupMode: 'open', hasUsers: true } as const;
const inviteOnlySettings = { signupMode: 'invite_only', hasUsers: true } as const;

function setup(overrides: Partial<SignInFormProps> = {}) {
  const props: SignInFormProps = {
    settings: openSettings,
    googleEnabled: false,
    onPasswordSignIn: vi.fn().mockResolvedValue(undefined),
    onSignUp: vi.fn().mockResolvedValue(undefined),
    onMagicLink: vi.fn().mockResolvedValue(undefined),
    onGoogle: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  const view = render(<SignInForm {...props} />);
  return { props, ...view };
}

describe('SignInForm', () => {
  it('signs in with an email and password by default', async () => {
    const { props } = setup();
    await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'hunter22');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(props.onPasswordSignIn).toHaveBeenCalledWith({ email: 'john@example.com', password: 'hunter22' });
  });

  it('creates an account, requiring an 8-character password', async () => {
    const { props } = setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Create account' }));
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'short');
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Password'), 'enough');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(props.onSignUp).toHaveBeenCalledWith({
      email: 'jane@example.com',
      password: 'shortenough',
      inviteCode: undefined,
    });
  });

  it('asks for an invite code when creating an account on an invite-only server', async () => {
    setup({ settings: inviteOnlySettings });
    expect(screen.queryByLabelText('Invite code')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Create account' }));
    expect(screen.getByLabelText('Invite code')).toBeInTheDocument();
  });

  it('opens on create account with a prefilled invite code', async () => {
    const { props } = setup({ settings: inviteOnlySettings, initialInviteCode: 'K7Q-4MD' });
    expect(screen.getByLabelText('Invite code')).toHaveValue('K7Q-4MD');
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'correcthorse');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(props.onSignUp).toHaveBeenCalledWith({
      email: 'jane@example.com',
      password: 'correcthorse',
      inviteCode: 'K7Q-4MD',
    });
  });

  it('still offers a magic link', async () => {
    const { props } = setup();
    await userEvent.click(screen.getByRole('button', { name: /email me a sign-in link$/i }));
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link' }));
    expect(props.onMagicLink).toHaveBeenCalledWith({ email: 'john@example.com', inviteCode: undefined });
  });

  it('shows errors from the server', async () => {
    setup({ onPasswordSignIn: vi.fn().mockRejectedValue(new Error("That email and password don't match.")) });
    await userEvent.type(screen.getByLabelText('Email'), 'x@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("That email and password don't match.");
  });

  it('shows Google only when enabled', async () => {
    const { rerender, props } = setup();
    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
    rerender(<SignInForm {...props} googleEnabled />);
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(props.onGoogle).toHaveBeenCalled();
  });
});
