import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DevSignIn } from './dev-sign-in';

describe('DevSignIn', () => {
  it('signs in as a seeded account with the dev password', async () => {
    const onSignIn = vi.fn().mockResolvedValue(undefined);
    render(<DevSignIn onSignIn={onSignIn} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in as Jane' }));
    expect(onSignIn).toHaveBeenCalledWith({ email: 'jane@babble.dev', password: 'password' });
  });

  it('explains how to reseed when sign-in fails', async () => {
    const onSignIn = vi.fn().mockRejectedValue({ message: 'Invalid login credentials', status: 400 });
    render(<DevSignIn onSignIn={onSignIn} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in as John' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('pnpm --filter @babble/db reset');
  });
});
