import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { KeepAwakeToggle } from './keep-awake-toggle';

const mockActivate = jest.fn(async (_tag: string) => undefined);
const mockDeactivate = jest.fn(async (_tag: string) => undefined);

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: (tag: string) => mockActivate(tag),
  deactivateKeepAwake: (tag: string) => mockDeactivate(tag),
}));

jest.mock('expo-battery', () => ({
  BatteryState: { UNKNOWN: 0, UNPLUGGED: 1, CHARGING: 2, FULL: 3 },
  useBatteryState: () => 2,
}));

afterEach(async () => {
  await AsyncStorage.clear();
  mockActivate.mockClear();
  mockDeactivate.mockClear();
});

describe('KeepAwakeToggle', () => {
  it('keeps the screen awake while on and remembers the choice', async () => {
    await render(<KeepAwakeToggle />);
    await fireEvent(screen.getByLabelText('Keep screen on'), 'valueChange', true);
    expect(mockActivate).toHaveBeenCalledWith('babble-session');
    expect(screen.getByText('Stays on while this screen is open. Plugged in.')).toBeTruthy();
    expect(await AsyncStorage.getItem('babble.keepAwake')).toBe('on');
    await fireEvent(screen.getByLabelText('Keep screen on'), 'valueChange', false);
    expect(mockDeactivate).toHaveBeenCalledWith('babble-session');
  });

  it('starts on when it was left on', async () => {
    await AsyncStorage.setItem('babble.keepAwake', 'on');
    await render(<KeepAwakeToggle />);
    expect(await screen.findByText('Stays on while this screen is open. Plugged in.')).toBeTruthy();
    expect(mockActivate).toHaveBeenCalled();
  });
});
