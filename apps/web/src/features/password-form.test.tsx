import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PasswordForm } from './password-form';

describe('PasswordForm', () => {
  it('requires a long enough, matching password', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PasswordForm submitLabel="Save password" onSubmit={onSubmit} />);
    const save = screen.getByRole('button', { name: 'Save password' });
    await userEvent.type(screen.getByLabelText('New password'), 'short');
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('New password'), 'enough');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'shortenougx');
    expect(screen.getByText("The passwords don't match.")).toBeInTheDocument();
    expect(save).toBeDisabled();
    await userEvent.clear(screen.getByLabelText('Confirm password'));
    await userEvent.type(screen.getByLabelText('Confirm password'), 'shortenough');
    await userEvent.click(save);
    expect(onSubmit).toHaveBeenCalledWith('shortenough');
  });
});
