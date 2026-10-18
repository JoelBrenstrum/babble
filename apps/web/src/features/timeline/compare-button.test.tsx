import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompareButton } from './compare-button';

describe('CompareButton', () => {
  it('offers the comparison and presses through', async () => {
    const onPress = vi.fn();
    render(<CompareButton comparing={false} label="Compare with yesterday" locked={false} plus onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Compare with yesterday' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('reads as stop comparing while a comparison is shown', () => {
    render(<CompareButton comparing label="Compare with yesterday" locked={false} plus={false} onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Stop comparing' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('only badges a locked feature when billing is on', () => {
    const { container, rerender } = render(
      <CompareButton comparing={false} label="Compare" locked plus onPress={() => {}} />,
    );
    expect(container.querySelector('svg.lucide-sparkles')).toBeInTheDocument();
    rerender(<CompareButton comparing={false} label="Compare" locked plus={false} onPress={() => {}} />);
    expect(container.querySelector('svg.lucide-sparkles')).not.toBeInTheDocument();
  });
});
