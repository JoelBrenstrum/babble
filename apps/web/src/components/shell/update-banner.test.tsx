import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UpdateBanner } from './update-banner';

describe('UpdateBanner', () => {
  it('refreshes on request', async () => {
    const onRefresh = vi.fn();
    render(<UpdateBanner onRefresh={onRefresh} />);
    expect(screen.getByRole('status')).toHaveTextContent('A new version of babble is ready.');
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('can be put off until later', async () => {
    render(<UpdateBanner onRefresh={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
