import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmPanel } from './confirm-panel';

describe('ConfirmPanel', () => {
  it('confirms or cancels and shows an error', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmPanel message="Sure?" confirmLabel="Do it" error="Nope" onConfirm={onConfirm} onCancel={onCancel} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Nope');
    await userEvent.click(screen.getByRole('button', { name: 'Do it' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('becomes an alert dialog when labelled', () => {
    render(
      <ConfirmPanel message="Sure?" confirmLabel="Do it" label="Confirm" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByRole('alertdialog', { name: 'Confirm' })).toBeInTheDocument();
  });
});
