import { fireEvent, render, screen } from '@testing-library/react-native';
import { DayStartPicker } from './day-start-picker';

describe('DayStartPicker', () => {
  it('selects midnight', async () => {
    const onChange = jest.fn();
    await render(<DayStartPicker value={420} onChange={onChange} />);
    await fireEvent.press(screen.getByLabelText('Midnight'));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('defaults a custom day start to 7:00 am', async () => {
    const onChange = jest.fn();
    await render(<DayStartPicker value={0} onChange={onChange} />);
    expect(screen.queryByLabelText('Day start time')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Custom time'));
    expect(onChange).toHaveBeenCalledWith(420);
  });

  it('shows the custom time', async () => {
    await render(<DayStartPicker value={390} onChange={jest.fn()} />);
    expect(screen.getByText('6:30 am')).toBeTruthy();
  });
});
