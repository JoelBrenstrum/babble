import { parseThemePreference, type NightWindow } from '@babble/domain';
import { useEffect } from 'react';
import { readStorage, storageKeys, writeStorage } from './storage';
import { applyTheme } from './theme';

export function useNightTheme(night: NightWindow | null) {
  const stored = night && JSON.stringify(night);
  useEffect(() => {
    if (!stored) return;
    writeStorage(storageKeys.night, stored);
    const refresh = () => {
      const preference = parseThemePreference(readStorage(storageKeys.theme));
      if (preference === 'night') applyTheme(preference);
    };
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [stored]);
}
