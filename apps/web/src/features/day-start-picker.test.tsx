import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DayStartPicker } from './day-start-picker';

describe('DayStartPicker', () => {
  it('selects midnight', async () => {
    const onChange = vi.fn();
    render(<DayStartPicker value={420} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /midnight/i }));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('defaults a custom day start to 7:00 am', async () => {
    const onChange = vi.fn();
    render(<DayStartPicker value={0} onChange={onChange} />);
    expect(screen.queryByLabelText('Day start time')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /custom time/i }));
    expect(onChange).toHaveBeenCalledWith(420);
  });

  it('shows the custom time', () => {
    render(<DayStartPicker value={390} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Day start time')).toHaveValue('06:30');
    expect(screen.getByText('6:30 am')).toBeInTheDocument();
  });
});
