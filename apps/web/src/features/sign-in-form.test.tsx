import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SignInForm } from './sign-in-form';

const openSettings = { signupMode: 'open', hasUsers: true } as const;
const inviteOnlySettings = { signupMode: 'invite_only', hasUsers: true } as const;

describe('SignInForm', () => {
  it('sends a magic link for the entered email', async () => {
    const onMagicLink = vi.fn().mockResolvedValue(undefined);
    render(<SignInForm settings={openSettings} googleEnabled={false} onMagicLink={onMagicLink} onGoogle={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Email'), 'joel@example.com');
    await userEvent.click(screen.getByRole('button', { name: /email me a sign-in link/i }));
    expect(onMagicLink).toHaveBeenCalledWith({ email: 'joel@example.com', inviteCode: undefined });
  });

  it('only asks for an invite code on invite-only servers', () => {
    const { rerender } = render(
      <SignInForm settings={openSettings} googleEnabled={false} onMagicLink={vi.fn()} onGoogle={vi.fn()} />,
    );
    expect(screen.queryByLabelText('Invite code')).not.toBeInTheDocument();
    rerender(
      <SignInForm settings={inviteOnlySettings} googleEnabled={false} onMagicLink={vi.fn()} onGoogle={vi.fn()} />,
    );
    expect(screen.getByLabelText('Invite code')).toBeInTheDocument();
  });

  it('does not ask for an invite code before the first account exists', () => {
    render(
      <SignInForm
        settings={{ signupMode: 'invite_only', hasUsers: false }}
        googleEnabled={false}
        onMagicLink={vi.fn()}
        onGoogle={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('Invite code')).not.toBeInTheDocument();
  });

  it('passes a prefilled invite code through', async () => {
    const onMagicLink = vi.fn().mockResolvedValue(undefined);
    render(
      <SignInForm
        settings={inviteOnlySettings}
        googleEnabled={false}
        initialInviteCode="K7Q-4MD"
        onMagicLink={onMagicLink}
        onGoogle={vi.fn()}
      />,
    );
    await userEvent.type(screen.getByLabelText('Email'), 'jaimi@example.com');
    await userEvent.click(screen.getByRole('button', { name: /email me a sign-in link/i }));
    expect(onMagicLink).toHaveBeenCalledWith({ email: 'jaimi@example.com', inviteCode: 'K7Q-4MD' });
  });

  it('shows errors from the server', async () => {
    const onMagicLink = vi.fn().mockRejectedValue(new Error('This Babble server is invite-only.'));
    render(<SignInForm settings={openSettings} googleEnabled={false} onMagicLink={onMagicLink} onGoogle={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Email'), 'x@example.com');
    await userEvent.click(screen.getByRole('button', { name: /email me a sign-in link/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This Babble server is invite-only.');
  });

  it('shows Google only when enabled', async () => {
    const onGoogle = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <SignInForm settings={openSettings} googleEnabled={false} onMagicLink={vi.fn()} onGoogle={onGoogle} />,
    );
    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
    rerender(<SignInForm settings={openSettings} googleEnabled onMagicLink={vi.fn()} onGoogle={onGoogle} />);
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(onGoogle).toHaveBeenCalled();
  });
});
