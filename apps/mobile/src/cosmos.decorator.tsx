import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from 'nativewind';
import { useEffect, useState, type ReactNode } from 'react';
import { useFixtureSelect } from 'react-cosmos/client';
import { ScrollView } from 'react-native';
import { ToastProvider } from './components/toast';

export default function CosmosDecorator({ children }: { children: ReactNode }) {
  const [theme] = useFixtureSelect('theme', { options: ['light', 'dark'], defaultValue: 'light' });
  const { setColorScheme } = useColorScheme();
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  useEffect(() => {
    setColorScheme(theme as 'light' | 'dark');
  }, [setColorScheme, theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ScrollView className="flex-1 bg-bg" contentContainerClassName="p-4">
          {children}
        </ScrollView>
      </ToastProvider>
    </QueryClientProvider>
  );
}
