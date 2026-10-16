import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LaneToggles } from './lane-toggles';

describe('LaneToggles', () => {
  it('turns a lane off and keeps the last one on', () => {
    const onChange = vi.fn();
    const { rerender } = render(<LaneToggles show={undefined} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sleep' }));
    expect(onChange).toHaveBeenCalledWith('feeds,nappies,pumps');

    rerender(<LaneToggles show="nappies" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Nappies' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Nappies' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Feeds' })).toHaveAttribute('aria-pressed', 'false');
  });
});
