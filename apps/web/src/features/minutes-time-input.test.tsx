import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MinutesTimeInput } from './minutes-time-input';

describe('MinutesTimeInput', () => {
  it('shows the time and commits a new one on blur', () => {
    const onChange = vi.fn();
    render(<MinutesTimeInput label="Night starts" minutes={1140} onChange={onChange} />);
    const input = screen.getByLabelText('Night starts');
    expect(input).toHaveValue('19:00');
    fireEvent.change(input, { target: { value: '20:15' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(1215);
  });

  it('does not commit an unchanged or cleared time', () => {
    const onChange = vi.fn();
    render(<MinutesTimeInput label="Night starts" minutes={1140} onChange={onChange} />);
    const input = screen.getByLabelText('Night starts');
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('19:00');
  });

  it('puts back a time that was not accepted', () => {
    const onChange = vi.fn();
    render(<MinutesTimeInput label="Start" minutes={420} onChange={onChange} accept={(next) => next !== 0} />);
    const input = screen.getByLabelText('Start');
    fireEvent.change(input, { target: { value: '00:00' } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('07:00');
  });

  it('follows the value when it changes from outside', () => {
    const { rerender } = render(<MinutesTimeInput label="Start" minutes={420} onChange={vi.fn()} />);
    rerender(<MinutesTimeInput label="Start" minutes={450} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Start')).toHaveValue('07:30');
  });
});
