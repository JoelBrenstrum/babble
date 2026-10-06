import 'react-native-url-polyfill/auto';
import { createBabbleClient, type BabbleClient } from '@babble/api';
import type { PublicConfig } from '@babble/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { readMobileConfig } from './config';

interface BabbleContextValue {
  config: PublicConfig;
  client: BabbleClient;
  session: Session | null;
  sessionLoaded: boolean;
}

const BabbleContext = createContext<BabbleContextValue | null>(null);

export function BabbleProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { config, client } = useMemo(() => {
    const config = readMobileConfig();
    const client = createBabbleClient(config, {
      auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
    return { config, client };
  }, []);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    void client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data } = client.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') void queryClient.invalidateQueries();
    });
    // Supabase only refreshes tokens while the app is in the foreground on React Native.
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void client.auth.startAutoRefresh();
      else void client.auth.stopAutoRefresh();
    });
    return () => {
      data.subscription.unsubscribe();
      appState.remove();
    };
  }, [client, queryClient]);

  return <BabbleContext.Provider value={{ config, client, session, sessionLoaded }}>{children}</BabbleContext.Provider>;
}

export function useBabble(): BabbleContextValue {
  const value = useContext(BabbleContext);
  if (!value) throw new Error('useBabble must be used inside BabbleProvider');
  return value;
}
