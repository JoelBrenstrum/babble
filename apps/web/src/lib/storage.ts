export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private browsing; these values are conveniences only.
  }
}

export const storageKeys = {
  activeFamily: 'babble.activeFamily',
  activeBaby: 'babble.activeBaby',
  pendingInvite: 'babble.pendingInvite',
  theme: 'babble.theme',
} as const;

export function clearAccountStorage(): void {
  for (const key of [storageKeys.activeFamily, storageKeys.activeBaby, storageKeys.pendingInvite])
    writeStorage(key, null);
}
