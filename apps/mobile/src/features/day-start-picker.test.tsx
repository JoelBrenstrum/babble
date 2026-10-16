import { fireEvent, render, screen } from '@testing-library/react-native';
import { DayStartPicker } from './day-start-picker';

describe('DayStartPicker', () => {
  it('selects midnight', async () => {
    const onChange = jest.fn();
    await render(<DayStartPicker value={420} onChange={onChange} />);
    await fireEvent.press(screen.getByLabelText('Midnight'));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('starts the day when the night currently ends', async () => {
    const onChange = jest.fn();
    await render(<DayStartPicker value={0} nightEnd={405} onChange={onChange} />);
    await fireEvent.press(screen.getByLabelText('When the night ends'));
    expect(onChange).toHaveBeenCalledWith(405);
  });

  it('shows when the night ends', async () => {
    await render(<DayStartPicker value={390} onChange={jest.fn()} />);
    expect(screen.getByText(/Each day starts at 6:30 am/)).toBeTruthy();
  });
});
