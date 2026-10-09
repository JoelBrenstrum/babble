import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstallMode } from '#/lib/install';
import { InstallCard, InstallSettings } from './install-app';

const now = () => new Date('2026-10-09T12:00:00Z');
const install = (mode: InstallMode, outcome: 'accepted' | 'dismissed' = 'accepted') => ({
  mode,
  prompt: vi.fn(async () => outcome),
});

describe('InstallCard', () => {
  beforeEach(() => localStorage.clear());

  it('shows the Safari steps on iPhone', () => {
    render(<InstallCard install={install('ios-safari')} now={now} />);
    expect(screen.getByText('Install babble')).toBeInTheDocument();
    expect(screen.getByText(/so it opens full screen and can send feed reminders/)).toBeInTheDocument();
    expect(screen.getByText('Add to Home Screen')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Install' })).toBeNull();
  });

  it('asks other iPhone browsers to open babble in Safari', () => {
    render(<InstallCard install={install('ios-other')} now={now} />);
    expect(screen.getByText(/Open babble in/)).toHaveTextContent('Open babble in Safari to install it');
  });

  it('opens the browser install prompt', async () => {
    const value = install('prompt');
    render(<InstallCard install={value} now={now} />);
    await userEvent.click(screen.getByRole('button', { name: 'Install' }));
    expect(value.prompt).toHaveBeenCalledOnce();
    expect(localStorage.getItem('babble.installDismissedAt')).toBeNull();
  });

  it('snoozes when the browser prompt is declined', async () => {
    render(<InstallCard install={install('prompt', 'dismissed')} now={now} />);
    await userEvent.click(screen.getByRole('button', { name: 'Install' }));
    await waitFor(() => expect(screen.queryByText('Install babble')).toBeNull());
    expect(localStorage.getItem('babble.installDismissedAt')).toBe('2026-10-09T12:00:00.000Z');
  });

  it('hides and remembers the date on Not now', async () => {
    render(<InstallCard install={install('prompt')} now={now} />);
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByText('Install babble')).toBeNull();
    expect(localStorage.getItem('babble.installDismissedAt')).toBe('2026-10-09T12:00:00.000Z');
  });

  it('stays hidden within 14 days of a dismissal and returns after', () => {
    localStorage.setItem('babble.installDismissedAt', '2026-10-01T12:00:00.000Z');
    const { unmount } = render(<InstallCard install={install('ios-safari')} now={now} />);
    expect(screen.queryByText('Install babble')).toBeNull();
    unmount();
    localStorage.setItem('babble.installDismissedAt', '2026-09-20T12:00:00.000Z');
    render(<InstallCard install={install('ios-safari')} now={now} />);
    expect(screen.getByText('Install babble')).toBeInTheDocument();
  });

  it('shows nothing once installed or when the browser cannot install', () => {
    const { container, rerender } = render(<InstallCard install={install('installed')} now={now} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<InstallCard install={install('none')} now={now} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('InstallSettings', () => {
  it('says Installed when running from the home screen', () => {
    render(<InstallSettings install={install('installed')} />);
    expect(screen.getByText('Installed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Install app/ })).toBeDisabled();
  });

  it('shows the instructions on demand', async () => {
    const value = install('prompt');
    render(<InstallSettings install={value} />);
    expect(screen.queryByRole('button', { name: 'Install' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Install app/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Install' }));
    expect(value.prompt).toHaveBeenCalledOnce();
  });

  it('points to the browser menu when there is no install prompt', async () => {
    render(<InstallSettings install={install('none')} />);
    await userEvent.click(screen.getByRole('button', { name: /Install app/ }));
    expect(screen.getByText(/Use your browser's menu/)).toBeInTheDocument();
  });
});
