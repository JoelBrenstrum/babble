import { BabbleError } from '@babble/api';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckEmail } from './check-email';

describe('CheckEmail', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('counts down before letting you resend the same link', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onResend = vi.fn().mockResolvedValue(undefined);
    render(<CheckEmail email="jane@example.com" onResend={onResend} onUseDifferentEmail={() => {}} />);

    expect(screen.getByRole('button', { name: 'Resend in 1:00' })).toBeDisabled();
    act(() => vi.advanceTimersByTime(18_000));
    expect(screen.getByRole('button', { name: 'Resend in 0:42' })).toBeDisabled();
    act(() => vi.advanceTimersByTime(42_000));

    await user.click(screen.getByRole('button', { name: 'Resend link' }));
    expect(onResend).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Resend in 1:00' })).toBeDisabled();
  });

  it('shows why a resend failed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onResend = vi.fn().mockRejectedValue(new BabbleError('Too many requests', 'rate_limited'));
    render(<CheckEmail email="jane@example.com" onResend={onResend} onUseDifferentEmail={() => {}} />);
    act(() => vi.advanceTimersByTime(60_000));
    await user.click(screen.getByRole('button', { name: 'Resend link' }));
    expect(await screen.findByText('Too many requests')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend link' })).toBeEnabled();
  });

  it('goes back to change the email', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onUseDifferentEmail = vi.fn();
    render(<CheckEmail email="jane@example.com" onResend={vi.fn()} onUseDifferentEmail={onUseDifferentEmail} />);
    await user.click(screen.getByRole('button', { name: 'Use a different email' }));
    expect(onUseDifferentEmail).toHaveBeenCalled();
  });
});
