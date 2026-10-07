import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useFixtureSelect } from 'react-cosmos/client';
import { ToastProvider } from './components/ui/toast';
import './styles.css';

export default function CosmosDecorator({ children }: { children: ReactNode }) {
  const [theme] = useFixtureSelect('theme', { options: ['light', 'dark'], defaultValue: 'light' });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <div className="min-h-dvh bg-bg p-6 font-sans text-ink">{children}</div>
      </ToastProvider>
    </QueryClientProvider>
  );
}
