import { browserDeviceName } from '@babble/api';
import { readStorage, storageKeys, writeStorage } from './storage';

export function defaultDeviceName(): string {
  return browserDeviceName(typeof navigator === 'undefined' ? null : navigator.userAgent);
}

export function savedDeviceName(): string {
  return readStorage(storageKeys.deviceName) ?? '';
}

export function currentDeviceName(): string {
  return savedDeviceName().trim() || defaultDeviceName();
}

export function saveDeviceName(name: string): void {
  writeStorage(storageKeys.deviceName, name.trim() ? name : null);
}

export const localDeviceName = { read: savedDeviceName, write: saveDeviceName };
