import { darkVars, lightVars } from '@babble/tokens';
import { useColorScheme, vars } from 'nativewind';
import { useEffect, type ReactNode } from 'react';
import { loadThemePreference } from './theme-preference';
import { View } from 'react-native';

const themes = { light: vars(lightVars), dark: vars(darkVars) };

export function ThemeRoot({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  useEffect(() => {
    void loadThemePreference().then(setColorScheme);
  }, [setColorScheme]);
  return (
    <View style={themes[colorScheme === 'dark' ? 'dark' : 'light']} className="flex-1 bg-bg">
      {children}
    </View>
  );
}

export function useTokenColor(name: keyof typeof lightVars): string {
  const { colorScheme } = useColorScheme();
  const channels = (colorScheme === 'dark' ? darkVars : lightVars)[name];
  return `rgb(${channels.replaceAll(' ', ',')})`;
}
