import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlusDialog } from './plus-dialog';

describe('PlusDialog', () => {
  it('explains the locked feature and closes', () => {
    const onClose = vi.fn();
    render(<PlusDialog feature="multiple_babies" onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'Babble Plus' })).toBeInTheDocument();
    expect(screen.getByText('Adding more than one baby to a family is part of Babble Plus.')).toBeInTheDocument();
    expect(screen.getByText('More than one baby in a family')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subscribe to Plus' })).toBeDisabled();
    expect(screen.getByText('Upgrading is coming soon.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onClose).toHaveBeenCalled();
  });
});
