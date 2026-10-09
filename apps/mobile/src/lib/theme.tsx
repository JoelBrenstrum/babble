import { babySettingsQuery } from '@babble/api';
import type { NightWindow } from '@babble/domain';
import { darkVars, lightVars } from '@babble/tokens';
import { useQuery } from '@tanstack/react-query';
import { useColorScheme, vars } from 'nativewind';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useBabble } from './babble';
import { colorSchemeFor, loadThemePreference, saveThemePreference, type ThemePreference } from './theme-preference';
import { useReadyState } from './use-onboarding';

const themes = { light: vars(lightVars), dark: vars(darkVars) };

export function ThemeRoot({ children }: { children: ReactNode }) {
  const { colorScheme } = useColorScheme();
  return (
    <View style={themes[colorScheme === 'dark' ? 'dark' : 'light']} className="flex-1 bg-bg">
      {children}
    </View>
  );
}

interface ThemePreferenceValue {
  preference: ThemePreference;
  night: NightWindow | null;
  choose: (preference: ThemePreference) => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceValue | null>(null);

function useNightWindow(): NightWindow | null {
  const ready = useReadyState();
  const { client } = useBabble();
  const babyId = ready?.baby.id ?? '';
  const settings = useQuery({ ...babySettingsQuery(client, babyId), enabled: Boolean(ready) }).data;
  if (!ready || !settings) return null;
  return { timeZone: ready.baby.timezone, start: settings.night_start_minutes, end: settings.night_end_minutes };
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const { setColorScheme } = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [now, setNow] = useState(() => new Date());
  const night = useNightWindow();

  useEffect(() => {
    void loadThemePreference().then(setPreference);
  }, []);

  useEffect(() => {
    if (preference !== 'night') return;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [preference]);

  const scheme = colorSchemeFor(preference, night, now);
  useEffect(() => setColorScheme(scheme), [scheme, setColorScheme]);

  const choose = useCallback((next: ThemePreference) => {
    setPreference(next);
    void saveThemePreference(next);
  }, []);

  return (
    <ThemePreferenceContext.Provider value={{ preference, night, choose }}>{children}</ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceValue {
  const value = useContext(ThemePreferenceContext);
  if (!value) throw new Error('useThemePreference must be used inside ThemePreferenceProvider');
  return value;
}

export function useTokenColor(name: keyof typeof lightVars): string {
  const { colorScheme } = useColorScheme();
  const channels = (colorScheme === 'dark' ? darkVars : lightVars)[name];
  return `rgb(${channels.replaceAll(' ', ',')})`;
}
