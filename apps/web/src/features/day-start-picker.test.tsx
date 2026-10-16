import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.queryByLabelText('Night end time')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /when the night ends/i }));
    expect(onChange).toHaveBeenCalledWith(405);
  });

  it('falls back to 7:00 am when the night ends at midnight', async () => {
    const onChange = vi.fn();
    render(<DayStartPicker value={0} nightEnd={0} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /when the night ends/i }));
    expect(onChange).toHaveBeenCalledWith(420);
  });

  it('shows when the night ends', () => {
    render(<DayStartPicker value={390} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Night end time')).toHaveValue('06:30');
    expect(screen.getByText('6:30 am')).toBeInTheDocument();
  });

  it('commits an edited time when the field is left', () => {
    const onChange = vi.fn();
    render(<DayStartPicker value={390} onChange={onChange} />);
    const input = screen.getByLabelText('Night end time');
    fireEvent.change(input, { target: { value: '08:15' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(495);
  });

  it('keeps midnight as its own option rather than a night end', () => {
    const onChange = vi.fn();
    render(<DayStartPicker value={390} onChange={onChange} />);
    const input = screen.getByLabelText('Night end time');
    fireEvent.change(input, { target: { value: '00:00' } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('06:30');
  });
});
