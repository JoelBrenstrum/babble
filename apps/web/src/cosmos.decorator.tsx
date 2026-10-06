import { useEffect, type ReactNode } from 'react';
import { useFixtureSelect } from 'react-cosmos/client';
import './styles.css';

export default function CosmosDecorator({ children }: { children: ReactNode }) {
  const [theme] = useFixtureSelect('theme', { options: ['light', 'dark'], defaultValue: 'light' });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return <div className="min-h-dvh bg-bg p-6 font-sans text-ink">{children}</div>;
}
