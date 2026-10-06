import { useColorScheme } from 'nativewind';
import { useEffect, type ReactNode } from 'react';
import { useFixtureSelect } from 'react-cosmos/client';
import { ScrollView } from 'react-native';

export default function CosmosDecorator({ children }: { children: ReactNode }) {
  const [theme] = useFixtureSelect('theme', { options: ['light', 'dark'], defaultValue: 'light' });
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(theme as 'light' | 'dark');
  }, [setColorScheme, theme]);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="p-4">
      {children}
    </ScrollView>
  );
}
