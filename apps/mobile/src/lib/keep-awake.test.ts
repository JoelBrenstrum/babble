import AsyncStorage from '@react-native-async-storage/async-storage';
import { BatteryState } from 'expo-battery';
import { isCharging, loadKeepAwake, saveKeepAwake } from './keep-awake';

describe('keep awake storage', () => {
  afterEach(() => AsyncStorage.clear());

  it('round-trips and defaults to off', async () => {
    expect(await loadKeepAwake()).toBe(false);
    await saveKeepAwake(true);
    expect(await loadKeepAwake()).toBe(true);
    await saveKeepAwake(false);
    expect(await loadKeepAwake()).toBe(false);
  });
});

describe('isCharging', () => {
  it('treats full as plugged in and unknown as unknown', () => {
    expect(isCharging(BatteryState.CHARGING)).toBe(true);
    expect(isCharging(BatteryState.FULL)).toBe(true);
    expect(isCharging(BatteryState.UNPLUGGED)).toBe(false);
    expect(isCharging(BatteryState.UNKNOWN)).toBeNull();
  });
});
