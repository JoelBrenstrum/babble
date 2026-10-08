import { describe, expect, it } from 'vitest';
import { resendState } from './resend';

describe('resendState', () => {
  const sentAt = 1_000_000;

  it.each([
    [0, 'Resend in 1:00'],
    [18_000, 'Resend in 0:42'],
    [18_500, 'Resend in 0:42'],
    [59_001, 'Resend in 0:01'],
  ])('counts down after %ims → %s', (elapsed, label) => {
    expect(resendState(sentAt, sentAt + elapsed)).toEqual({ ready: false, label });
  });

  it('offers a resend once the cooldown has passed', () => {
    expect(resendState(sentAt, sentAt + 60_000)).toEqual({ ready: true, label: 'Resend link' });
    expect(resendState(sentAt, sentAt + 120_000)).toEqual({ ready: true, label: 'Resend link' });
  });

  it('never shows more than the full cooldown when the clock lags the send time', () => {
    expect(resendState(sentAt, sentAt - 5_000)).toEqual({ ready: false, label: 'Resend in 1:00' });
  });
});
