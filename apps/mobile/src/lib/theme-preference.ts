import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseThemePreference, themeOverride, type NightWindow, type ThemePreference } from '@babble/domain';

export type { ThemePreference };

const KEY = 'babble.theme';

export async function loadThemePreference(): Promise<ThemePreference> {
  return parseThemePreference(await AsyncStorage.getItem(KEY).catch(() => null));
}

export async function saveThemePreference(preference: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(KEY, preference).catch(() => undefined);
}

export function colorSchemeFor(
  preference: ThemePreference,
  night: NightWindow | null,
  now: Date,
): 'light' | 'dark' | 'system' {
  return themeOverride(preference, night, now) ?? 'system';
}
