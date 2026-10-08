import { BabbleError } from '@babble/api';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { CheckEmail } from './check-email';

describe('CheckEmail', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('counts down before letting you resend the same link', async () => {
    const onResend = jest.fn().mockResolvedValue(undefined);
    await render(<CheckEmail email="jane@example.com" onResend={onResend} onUseDifferentEmail={() => {}} />);

    expect(screen.getByRole('button', { name: 'Resend in 1:00' })).toBeDisabled();
    await act(() => jest.advanceTimersByTime(18_000));
    expect(screen.getByRole('button', { name: 'Resend in 0:42' })).toBeDisabled();
    await act(() => jest.advanceTimersByTime(42_000));

    await fireEvent.press(screen.getByRole('button', { name: 'Resend link' }));
    expect(onResend).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Resend in 1:00' })).toBeDisabled();
  });

  it('shows why a resend failed', async () => {
    const onResend = jest.fn().mockRejectedValue(new BabbleError('Too many requests', 'rate_limited'));
    await render(<CheckEmail email="jane@example.com" onResend={onResend} onUseDifferentEmail={() => {}} />);
    await act(() => jest.advanceTimersByTime(60_000));
    await fireEvent.press(screen.getByRole('button', { name: 'Resend link' }));
    expect(await screen.findByText('Too many requests')).toBeTruthy();
  });

  it('goes back to change the email', async () => {
    const onUseDifferentEmail = jest.fn();
    await render(
      <CheckEmail email="jane@example.com" onResend={jest.fn()} onUseDifferentEmail={onUseDifferentEmail} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Use a different email' }));
    expect(onUseDifferentEmail).toHaveBeenCalled();
  });
});
