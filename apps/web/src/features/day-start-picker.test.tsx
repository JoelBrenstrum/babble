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

  it('starts the day when the night currently ends', async () => {
    const onChange = vi.fn();
    render(<DayStartPicker value={0} nightEnd={405} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /when the night ends/i }));
    expect(onChange).toHaveBeenCalledWith(405);
  });

  it('falls back to 7:00 am when the night ends at midnight', async () => {
    const onChange = vi.fn();
    render(<DayStartPicker value={0} nightEnd={0} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /when the night ends/i }));
    expect(onChange).toHaveBeenCalledWith(420);
  });

  it('shows when the night ends without letting it be edited here', () => {
    render(<DayStartPicker value={390} onChange={vi.fn()} />);
    expect(screen.getByText(/Each day starts at 6:30 am/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows the current night end before it is picked', () => {
    render(<DayStartPicker value={0} nightEnd={405} onChange={vi.fn()} />);
    expect(screen.getByText(/Each day starts at 6:45 am/)).toBeInTheDocument();
  });
});
