import '../global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '@/components/toast';
import { BabyScope } from '@/features/baby-scope';
import { ActiveBabyProvider } from '@/lib/active-baby';
import { BabbleProvider } from '@/lib/babble';
import { useAppFonts } from '@/lib/fonts';
import { ThemePreferenceProvider, ThemeRoot } from '@/lib/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );
  const fontsLoaded = useAppFonts();

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BabbleProvider>
            <ActiveBabyProvider>
              <ThemePreferenceProvider>
                <ThemeRoot>
                  <ToastProvider>
                    <BabyScope>
                      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
                      <StatusBar style="auto" />
                    </BabyScope>
                  </ToastProvider>
                </ThemeRoot>
              </ThemePreferenceProvider>
            </ActiveBabyProvider>
          </BabbleProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
