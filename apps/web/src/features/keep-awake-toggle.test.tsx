import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeepAwakeToggle } from './keep-awake-toggle';

const request = vi.fn(async () => ({ released: false, release: vi.fn(async () => undefined) }));

beforeEach(() => {
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock');
  localStorage.clear();
  request.mockClear();
});

describe('KeepAwakeToggle', () => {
  it('turns the wake lock on and remembers it', async () => {
    render(<KeepAwakeToggle />);
    const toggle = screen.getByRole('switch', { name: 'Keep screen on' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(request).toHaveBeenCalledWith('screen');
    expect(localStorage.getItem('babble.keepAwake')).toBe('on');
    expect(screen.getByText('Stays on while this screen is open.')).toBeInTheDocument();
  });

  it('starts on when it was left on', () => {
    localStorage.setItem('babble.keepAwake', 'on');
    render(<KeepAwakeToggle />);
    expect(screen.getByRole('switch', { name: 'Keep screen on' })).toHaveAttribute('aria-checked', 'true');
  });

  it('hides itself when the browser cannot keep the screen on', () => {
    Reflect.deleteProperty(navigator, 'wakeLock');
    render(<KeepAwakeToggle />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
});
