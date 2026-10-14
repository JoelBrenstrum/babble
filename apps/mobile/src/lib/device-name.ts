import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEY = 'babble.deviceName';

let saved = '';

export interface PlatformInfo {
  os: string;
  constants: { interfaceIdiom?: string; Brand?: string; Model?: string };
}

export function platformDeviceName({ os, constants }: PlatformInfo): string {
  if (os === 'ios') return constants.interfaceIdiom === 'pad' ? 'iPad' : 'iPhone';
  if (os === 'android') {
    const brand = constants.Brand ? constants.Brand.charAt(0).toUpperCase() + constants.Brand.slice(1) : '';
    const model = constants.Model ?? '';
    if (model && brand && !model.toLowerCase().startsWith(brand.toLowerCase())) return `${brand} ${model}`;
    return model || brand || 'Android';
  }
  return 'Phone';
}

export function defaultDeviceName(): string {
  return platformDeviceName({ os: Platform.OS, constants: Platform.constants as PlatformInfo['constants'] });
}

export function savedDeviceName(): string {
  return saved;
}

export function currentDeviceName(): string {
  return saved.trim() || defaultDeviceName();
}

export async function loadDeviceName(): Promise<string> {
  saved = (await AsyncStorage.getItem(KEY).catch(() => null)) ?? '';
  return saved;
}

export async function saveDeviceName(name: string): Promise<void> {
  saved = name;
  await (name.trim() ? AsyncStorage.setItem(KEY, name) : AsyncStorage.removeItem(KEY)).catch(() => undefined);
}
