import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InvitePanel } from './invite-panel';

const qr = vi.hoisted(() => ({ toString: vi.fn() }));
vi.mock('qrcode', () => ({ default: qr }));

const invite = (code = 'K7Q4M-D2XPA') => ({ code, expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString() });

describe('InvitePanel', () => {
  beforeEach(() => {
    qr.toString.mockReset();
    qr.toString.mockResolvedValue('<svg />');
  });

  afterEach(() => vi.useRealTimers());

  it('creates one invite even when effects run twice', async () => {
    const onCreate = vi.fn(async () => invite());
    render(
      <StrictMode>
        <InvitePanel publicUrl="https://babble.test" onCreate={onCreate} />
      </StrictMode>,
    );
    expect(await screen.findByText('K7Q4M-D2XPA')).toBeInTheDocument();
    expect(screen.getByText('Expires in 7 days · one use')).toBeInTheDocument();
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('creates a fresh invite when the creator changes', async () => {
    const first = vi.fn(async () => invite('AAAAA-AAAAA'));
    const second = vi.fn(async () => invite('BBBBB-BBBBB'));
    const { rerender } = render(<InvitePanel publicUrl="https://babble.test" onCreate={first} />);
    expect(await screen.findByText('AAAAA-AAAAA')).toBeInTheDocument();
    rerender(<InvitePanel publicUrl="https://babble.test" onCreate={second} />);
    expect(await screen.findByText('BBBBB-BBBBB')).toBeInTheDocument();
    expect(screen.queryByText('AAAAA-AAAAA')).not.toBeInTheDocument();
  });

  it('still shows the code when the QR code cannot be drawn', async () => {
    qr.toString.mockRejectedValue(new Error('too long'));
    render(<InvitePanel publicUrl="https://babble.test" onCreate={async () => invite()} />);
    expect(await screen.findByText('K7Q4M-D2XPA')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Invite QR code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains when the invite cannot be created', async () => {
    render(
      <InvitePanel
        publicUrl="https://babble.test"
        onCreate={() => Promise.reject({ code: '42501', message: 'nope' })}
      />,
    );
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('copies the code, then reverts the label', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<InvitePanel publicUrl="https://babble.test" onCreate={async () => invite()} />);
    vi.useFakeTimers();
    fireEvent.click(await vi.waitFor(() => screen.getByRole('button', { name: 'Copy code' })));
    await act(async () => undefined);
    expect(writeText).toHaveBeenCalledWith('K7Q4M-D2XPA');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
  });

  it('says so when the clipboard refuses', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    render(<InvitePanel publicUrl="https://babble.test" onCreate={async () => invite()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Copy code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't copy");
  });
});
