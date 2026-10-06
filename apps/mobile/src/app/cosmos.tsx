import { Redirect } from 'expo-router';
import { NativeFixtureLoader } from 'react-cosmos-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { moduleWrappers, rendererConfig } from '@/cosmos.imports';

export default function Cosmos() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <NativeFixtureLoader rendererConfig={rendererConfig} moduleWrappers={moduleWrappers} />
    </SafeAreaView>
  );
}
