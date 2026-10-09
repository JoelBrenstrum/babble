import { fireEvent, render, screen } from '@testing-library/react-native';
import { AppearanceSettings } from './appearance-settings';

const night = { timeZone: 'Pacific/Auckland', start: 1140, end: 420 };

describe('AppearanceSettings', () => {
  it('offers dark at night', async () => {
    const onChange = jest.fn();
    await render(<AppearanceSettings value="system" babyName="Olivia" night={night} onChange={onChange} />);
    expect(screen.queryByText(/Dark between/)).toBeNull();
    await fireEvent.press(screen.getByText('Dark at night'));
    expect(onChange).toHaveBeenCalledWith('night');
  });

  it('explains the night window when chosen', async () => {
    await render(<AppearanceSettings value="night" babyName="Olivia" night={night} onChange={jest.fn()} />);
    expect(screen.getByText("Dark between 7:00 pm and 7:00 am, from Olivia's night settings.")).toBeTruthy();
  });
});
