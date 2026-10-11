import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseKeepAwake, serialiseKeepAwake } from '@babble/domain';
import { BatteryState } from 'expo-battery';

const KEY = 'babble.keepAwake';

export async function loadKeepAwake(): Promise<boolean> {
  return parseKeepAwake(await AsyncStorage.getItem(KEY).catch(() => null));
}

export async function saveKeepAwake(on: boolean): Promise<void> {
  const value = serialiseKeepAwake(on);
  await (value === null ? AsyncStorage.removeItem(KEY) : AsyncStorage.setItem(KEY, value)).catch(() => undefined);
}

export function isCharging(state: BatteryState): boolean | null {
  if (state === BatteryState.CHARGING || state === BatteryState.FULL) return true;
  if (state === BatteryState.UNPLUGGED) return false;
  return null;
}
