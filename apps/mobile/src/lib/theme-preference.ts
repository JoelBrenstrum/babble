import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'babble.theme';

export async function loadThemePreference(): Promise<ThemePreference> {
  const value = await AsyncStorage.getItem(KEY).catch(() => null);
  return value === 'light' || value === 'dark' ? value : 'system';
}

export async function saveThemePreference(preference: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(KEY, preference).catch(() => undefined);
}
