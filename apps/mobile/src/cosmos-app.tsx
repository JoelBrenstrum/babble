import './global.css';
import { NativeFixtureLoader } from 'react-cosmos-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { moduleWrappers, rendererConfig } from './cosmos.imports';
import { useAppFonts } from './lib/fonts';
import { ThemeRoot } from './lib/theme';

export default function CosmosApp() {
  const fontsLoaded = useAppFonts();
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeRoot>
          <SafeAreaView className="flex-1">
            <NativeFixtureLoader rendererConfig={rendererConfig} moduleWrappers={moduleWrappers} />
          </SafeAreaView>
        </ThemeRoot>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
